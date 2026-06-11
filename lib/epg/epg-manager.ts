/**
 * EPG Manager - Handles electronic program guide data
 */

import { EPGProgram, EPGChannel, EPGData } from "./types";
import { parseXMLTV, fetchXMLTVFromURL } from "./xmltv-parser";
import { saveEPGCache, loadEPGCache } from "./epg-cache";

class EPGManager {
  private epgData: Map<string, EPGChannel> = new Map();
  private lastUpdate: Date | null = null;
  private epgUrls: string[] = [];
  private loadPromise: Promise<void> | null = null;
  private readonly CACHE_TTL = 3600000; // 1 hour cache TTL
  private _hasRealData: boolean = false;
  private channelLookup: Map<string, EPGChannel | null> = new Map();

  /**
   * Check if EPG has real data (not mock)
   */
  hasRealData(): boolean {
    return this._hasRealData;
  }

  /**
   * Check if EPG URL is configured
   */
  hasEpgSource(): boolean {
    return this.epgUrls.length > 0;
  }

  /**
   * Get current and next program for a channel
   */
  getCurrentProgram(channelName: string): { current: EPGProgram | null; next: EPGProgram | null } {
    const channel = this.findChannel(channelName);
    if (!channel) {
      return { current: null, next: null };
    }

    const now = new Date();
    const programs = channel.programs.sort((a, b) => a.start.getTime() - b.start.getTime());

    let current: EPGProgram | null = null;
    let next: EPGProgram | null = null;

    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];

      if (program.start <= now && program.end > now) {
        current = program;
        next = programs[i + 1] || null;
        break;
      } else if (program.start > now) {
        next = program;
        break;
      }
    }

    return { current, next };
  }

  /**
   * Get all programs for a channel on a specific date
   */
  getProgramsForDate(channelName: string, date: Date): EPGProgram[] {
    const channel = this.findChannel(channelName);
    if (!channel) return [];

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return channel.programs.filter(
      (program) =>
        (program.start >= startOfDay && program.start <= endOfDay) ||
        (program.end >= startOfDay && program.end <= endOfDay),
    );
  }

  /**
   * Search for a channel by name (fuzzy match)
   */
  private findChannel(channelName: string): EPGChannel | null {
    const normalized = channelName.toLowerCase().trim();

    // Memoized: fuzzy matching scans every EPG channel and rows ask often
    const cached = this.channelLookup.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    let found: EPGChannel | null = null;

    // Exact match first
    for (const [, channel] of this.epgData) {
      if (channel.name.toLowerCase() === normalized) {
        found = channel;
        break;
      }
    }

    // Partial match
    if (!found) {
      for (const [, channel] of this.epgData) {
        if (channel.name.toLowerCase().includes(normalized) || normalized.includes(channel.name.toLowerCase())) {
          found = channel;
          break;
        }
      }
    }

    this.channelLookup.set(normalized, found);
    return found;
  }

  /**
   * Set EPG source URL(s). Accepts a single URL (legacy) or an array.
   */
  setEPGSource(url: string): void {
    this.setEPGSources(url ? [url] : []);
  }

  setEPGSources(urls: string[]): void {
    const next = urls.filter(Boolean);
    const changed = JSON.stringify(next) !== JSON.stringify(this.epgUrls);
    this.epgUrls = next;
    if (changed) {
      // Force a refetch with the new source list
      this.lastUpdate = null;
    }
  }

  /**
   * Search programs across all EPG channels (title/description/category).
   */
  searchPrograms(query: string, limit = 20): { program: EPGProgram; epgChannelName: string }[] {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    const results: { program: EPGProgram; epgChannelName: string }[] = [];
    const now = Date.now();
    for (const [, channel] of this.epgData) {
      for (const program of channel.programs) {
        if (program.end.getTime() < now) continue; // only current/upcoming
        if (
          program.title.toLowerCase().includes(q) ||
          program.description?.toLowerCase().includes(q) ||
          program.category?.toLowerCase().includes(q)
        ) {
          results.push({ program, epgChannelName: channel.name });
          if (results.length >= limit) return results;
        }
      }
    }
    return results;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.lastUpdate || this.epgData.size === 0) return false;
    const now = new Date().getTime();
    const cacheAge = now - this.lastUpdate.getTime();
    return cacheAge < this.CACHE_TTL;
  }

  /**
   * Load EPG data from XMLTV source with caching
   */
  async loadEPG(channelNames: string[]): Promise<void> {
    // Return cached data if still valid
    if (this.isCacheValid()) {
      console.log("[EPG] Using cached data");
      return;
    }

    // Prevent duplicate loads
    if (this.loadPromise) {
      console.log("[EPG] Load already in progress, waiting...");
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      try {
        if (this.epgUrls.length > 0) {
          // Serve from the IndexedDB cache first for an instant guide
          const cached = await loadEPGCache(this.epgUrls);
          if (cached && cached.size > 0) {
            console.log("[EPG] Loaded", cached.size, "channels from IndexedDB cache");
            this.epgData = cached;
            this.channelLookup.clear();
            this._hasRealData = true;
            this.lastUpdate = new Date();
            return;
          }

          // Fetch and merge all configured XMLTV sources
          console.log("[EPG] Loading from XMLTV source(s):", this.epgUrls);
          const merged = new Map<string, EPGChannel>();
          const results = await Promise.allSettled(this.epgUrls.map((url) => fetchXMLTVFromURL(url)));
          for (const result of results) {
            if (result.status === "fulfilled") {
              for (const [id, channel] of result.value) {
                merged.set(id, channel);
              }
            } else {
              console.error("[EPG] Source failed:", result.reason);
            }
          }
          if (merged.size > 0) {
            this.epgData = merged;
            this.channelLookup.clear();
            this._hasRealData = true;
            this.lastUpdate = new Date();
            console.log("[EPG] Loaded", this.epgData.size, "channels from XMLTV");
            saveEPGCache(this.epgData, this.epgUrls);
            return;
          }
          throw new Error("All EPG sources failed to load");
        }

        // No EPG source - don't generate mock data, just leave empty
        console.log("[EPG] No XMLTV source configured");
        this._hasRealData = false;
        this.lastUpdate = new Date();
      } catch (error) {
        console.error("[EPG] Failed to load XMLTV:", error);
        this._hasRealData = false;
        this.lastUpdate = new Date();
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Load EPG from XMLTV text
   */
  async loadEPGFromXML(xmlText: string): Promise<void> {
    try {
      this.epgData = await parseXMLTV(xmlText);
      this.channelLookup.clear();
      this.lastUpdate = new Date();
      console.log("[EPG] Loaded", this.epgData.size, "channels from XML");
    } catch (error) {
      console.error("[EPG] Failed to parse XML:", error);
      throw error;
    }
  }

  /**
   * Generate mock EPG data for testing
   */
  private generateMockEPG(channelNames: string[]): void {
    const now = new Date();

    channelNames.forEach((channelName, index) => {
      const channel: EPGChannel = {
        id: `epg_${index}`,
        name: channelName,
        programs: [],
      };

      // Generate 24 hours of programs (2-hour slots)
      for (let hour = -2; hour < 24; hour += 2) {
        const start = new Date(now);
        start.setHours(start.getHours() + hour, 0, 0, 0);

        const end = new Date(start);
        end.setHours(end.getHours() + 2);

        const programNumber = Math.floor(hour / 2) + 2;

        channel.programs.push({
          id: `${channel.id}_${programNumber}`,
          channelId: channel.id,
          title: this.generateProgramTitle(programNumber),
          description: this.generateProgramDescription(),
          start,
          end,
          category: this.getRandomCategory(),
        });
      }

      this.epgData.set(channel.id, channel);
    });
  }

  private generateProgramTitle(num: number): string {
    const titles = [
      "Morning News",
      "Daily Show",
      "Documentary Hour",
      "Sports Center",
      "Evening News",
      "Prime Time Movie",
      "Late Night Talk",
      "Music Video Show",
      "Cooking Show",
      "Travel Documentary",
      "Comedy Series",
      "Drama Series",
    ];
    return titles[num % titles.length] || `Program ${num}`;
  }

  private generateProgramDescription(): string {
    const descriptions = [
      "Stay updated with the latest news and events.",
      "Entertainment and interviews with celebrities.",
      "Explore fascinating topics from around the world.",
      "Live sports coverage and highlights.",
      "In-depth analysis and breaking news.",
      "Hollywood blockbuster premiere.",
      "Late night entertainment and comedy.",
      "The best music videos of the week.",
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private getRandomCategory(): string {
    const categories = ["News", "Entertainment", "Sports", "Documentary", "Movies", "Series"];
    return categories[Math.floor(Math.random() * categories.length)];
  }

  /**
   * Get progress percentage for current program
   */
  getProgramProgress(program: EPGProgram): number {
    const now = new Date().getTime();
    const start = program.start.getTime();
    const end = program.end.getTime();
    const total = end - start;
    const elapsed = now - start;

    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  /**
   * Format time remaining
   */
  getTimeRemaining(program: EPGProgram): string {
    const now = new Date().getTime();
    const end = program.end.getTime();
    const remaining = Math.max(0, end - now);

    const minutes = Math.floor(remaining / 60000);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Get past programs for catchup (within specified days)
   */
  getPastPrograms(channelName: string, days: number): EPGProgram[] {
    const channel = this.findChannel(channelName);
    if (!channel) return [];

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return channel.programs
      .filter((program) => {
        const programEnd = new Date(program.end);
        // Program has ended and is within catchup window
        return programEnd < now && programEnd > cutoffTime;
      })
      .sort((a, b) => b.start.getTime() - a.start.getTime()); // Most recent first
  }

  /**
   * Get programs for a time range (for EPG timeline)
   */
  getProgramsInRange(channelName: string, startTime: Date, endTime: Date): EPGProgram[] {
    const channel = this.findChannel(channelName);
    if (!channel) return [];

    return channel.programs
      .filter((program) => {
        const programStart = new Date(program.start);
        const programEnd = new Date(program.end);
        // Program overlaps with the time range
        return programStart < endTime && programEnd > startTime;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Get today's schedule with past, current, and upcoming programs
   */
  getTodaySchedule(channelName: string): {
    past: EPGProgram[];
    current: EPGProgram | null;
    upcoming: EPGProgram[];
  } {
    const channel = this.findChannel(channelName);
    if (!channel) return { past: [], current: null, upcoming: [] };

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayPrograms = channel.programs
      .filter((program) => {
        const programStart = new Date(program.start);
        const programEnd = new Date(program.end);
        return programStart < endOfDay && programEnd > startOfDay;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const past: EPGProgram[] = [];
    let current: EPGProgram | null = null;
    const upcoming: EPGProgram[] = [];

    for (const program of todayPrograms) {
      const programStart = new Date(program.start);
      const programEnd = new Date(program.end);

      if (programEnd <= now) {
        past.push(program);
      } else if (programStart <= now && programEnd > now) {
        current = program;
      } else {
        upcoming.push(program);
      }
    }

    return { past, current, upcoming };
  }

  /**
   * Format program duration
   */
  getProgramDuration(program: EPGProgram): string {
    const start = new Date(program.start).getTime();
    const end = new Date(program.end).getTime();
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);

    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  }

  /**
   * Format time ago for past programs
   */
  getTimeAgo(program: EPGProgram): string {
    const now = new Date().getTime();
    const end = new Date(program.end).getTime();
    const agoMs = now - end;

    const minutes = Math.floor(agoMs / 60000);
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days === 1) {
      return "Yesterday";
    }
    return `${days} days ago`;
  }
}

export const epgManager = new EPGManager();
