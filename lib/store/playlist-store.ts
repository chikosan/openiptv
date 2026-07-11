import { create } from "zustand";
import { Channel, Playlist, PlaylistStore, RefreshResult } from "@/lib/types";
import { fetchAndParseM3U8, parseM3U8, M3U8ParseResult } from "@/lib/m3u8-parser";
import { storage } from "@/lib/storage";

// Auto-refresh intervals
let refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Setup auto-refresh for a playlist
 */
function setupAutoRefresh(playlistId: string, intervalMinutes: number, get: () => PlaylistStore) {
  // Clear existing interval if any
  if (refreshIntervals.has(playlistId)) {
    clearInterval(refreshIntervals.get(playlistId)!);
    refreshIntervals.delete(playlistId);
  }

  // Setup new interval
  const intervalMs = intervalMinutes * 60 * 1000;
  const interval = setInterval(async () => {
    try {
      const store = get();
      const playlist = store.playlists.find((p) => p.id === playlistId);

      if (!playlist || !playlist.autoRefreshEnabled) {
        // Stop auto-refresh if playlist is removed or disabled
        clearInterval(interval);
        refreshIntervals.delete(playlistId);
        return;
      }

      // Silent refresh in background
      await store.refreshPlaylist(playlistId);
      console.log(`Auto-refreshed playlist: ${playlist.name}`);
    } catch (error) {
      console.error(`Auto-refresh failed for playlist ${playlistId}:`, error);
    }
  }, intervalMs);

  refreshIntervals.set(playlistId, interval);
}

/**
 * Turn a parsed M3U8 result into a stored playlist, selecting it as current if it's the first one.
 */
async function savePlaylistFromResult(
  result: M3U8ParseResult,
  url: string,
  name: string | undefined,
  set: (partial: Partial<PlaylistStore>) => void,
  get: () => PlaylistStore,
) {
  if (result.channels.length === 0) {
    throw new Error("No channels found in playlist");
  }

  const playlist: Playlist = {
    id: `pl_${Date.now()}`,
    name: name || `Playlist ${get().playlists.length + 1}`,
    url,
    channels: result.channels,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastRefreshed: Date.now(),
    autoRefreshEnabled: false,
    autoRefreshInterval: 60, // default 60 minutes
  };

  const playlists = [...get().playlists, playlist];
  await storage.savePlaylists(playlists);

  // If this is the first playlist, set it as current
  const currentPlaylist = get().currentPlaylist || playlist;
  const currentChannel = get().currentChannel || playlist.channels[0];

  if (!get().currentPlaylist) {
    await storage.saveCurrentPlaylist(currentPlaylist.id);
    await storage.saveCurrentChannel(currentChannel.id);
  }

  set({
    playlists,
    currentPlaylist,
    currentChannel,
  });
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  currentChannel: null,
  isInitialized: false,

  initialize: async () => {
    try {
      await storage.init();
      const [playlists, currentPlaylistId, currentChannelId] = await Promise.all([
        storage.getPlaylists(),
        storage.getCurrentPlaylist(),
        storage.getCurrentChannel(),
      ]);

      const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId) || playlists[0] || null;
      const currentChannel = currentPlaylist?.channels.find((c) => c.id === currentChannelId) || null;

      set({
        playlists,
        currentPlaylist,
        currentChannel,
        isInitialized: true,
      });

      // Setup auto-refresh for playlists that have it enabled
      playlists.forEach((playlist) => {
        if (playlist.autoRefreshEnabled) {
          setupAutoRefresh(playlist.id, playlist.autoRefreshInterval || 60, get);
        }
      });
    } catch (error) {
      console.error("Failed to initialize store:", error);
      set({ isInitialized: true });
    }
  },

  addPlaylist: async (url: string, name?: string) => {
    try {
      const result = await fetchAndParseM3U8(url);
      await savePlaylistFromResult(result, url, name, set, get);
    } catch (error) {
      throw new Error(`Failed to add playlist: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },

  addPlaylistFromFile: async (file: File, name?: string) => {
    try {
      const content = await file.text();
      const result = await parseM3U8(content);
      const playlistName = name || file.name.replace(/\.[^.]+$/, "");
      await savePlaylistFromResult(result, `local://${file.name}`, playlistName, set, get);
    } catch (error) {
      throw new Error(`Failed to add playlist: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },

  removePlaylist: (id: string) => {
    // Clear auto-refresh if enabled
    if (refreshIntervals.has(id)) {
      clearInterval(refreshIntervals.get(id)!);
      refreshIntervals.delete(id);
    }

    const playlists = get().playlists.filter((p) => p.id !== id);
    storage.savePlaylists(playlists);

    const state: Partial<PlaylistStore> = { playlists };

    // If we removed the current playlist, select another one
    if (get().currentPlaylist?.id === id) {
      const newPlaylist = playlists[0] || null;
      const newChannel = newPlaylist?.channels[0] || null;

      state.currentPlaylist = newPlaylist;
      state.currentChannel = newChannel;

      storage.saveCurrentPlaylist(newPlaylist?.id || null);
      storage.saveCurrentChannel(newChannel?.id || null);
    }

    set(state);
  },

  refreshPlaylist: async (playlistId: string): Promise<RefreshResult> => {
    const playlist = get().playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }
    if (playlist.url.startsWith("local://")) {
      throw new Error(
        "This playlist was loaded from a local file and can't be auto-refreshed — re-upload it to update",
      );
    }

    try {
      // Fetch latest playlist data
      const result = await fetchAndParseM3U8(playlist.url);

      if (result.channels.length === 0) {
        throw new Error("No channels found in playlist");
      }

      // Create a map of existing channels by ID to preserve user customizations
      const existingChannelsMap = new Map(playlist.channels.map((ch) => [ch.id, ch]));

      // Create a set of new channel IDs for comparison
      const newChannelIds = new Set(result.channels.map((ch) => ch.id));
      const oldChannelIds = new Set(playlist.channels.map((ch) => ch.id));

      // Calculate added and removed channels
      const addedChannels = result.channels.filter((ch) => !oldChannelIds.has(ch.id));
      const removedChannelIds = Array.from(oldChannelIds).filter((id) => !newChannelIds.has(id));

      // Merge new channels with existing customizations
      const mergedChannels = result.channels.map((newChannel) => {
        const existing = existingChannelsMap.get(newChannel.id);
        if (existing) {
          // Preserve user customizations
          return {
            ...newChannel,
            isFavorite: existing.isFavorite,
            isHidden: existing.isHidden,
            order: existing.order,
          };
        }
        return newChannel;
      });

      // Update the playlist
      const updatedPlaylist: Playlist = {
        ...playlist,
        channels: mergedChannels,
        updatedAt: Date.now(),
        lastRefreshed: Date.now(),
      };

      const playlists = get().playlists.map((p) => (p.id === playlistId ? updatedPlaylist : p));

      await storage.savePlaylists(playlists);

      // Update state
      const currentPlaylist = get().currentPlaylist?.id === playlistId ? updatedPlaylist : get().currentPlaylist;

      // Check if current channel was removed
      let currentChannel = get().currentChannel;
      if (currentChannel && removedChannelIds.includes(currentChannel.id)) {
        currentChannel = updatedPlaylist.channels[0] || null;
        if (currentChannel) {
          await storage.saveCurrentChannel(currentChannel.id);
        }
      }

      set({
        playlists,
        currentPlaylist,
        currentChannel,
      });

      return {
        added: addedChannels.length,
        removed: removedChannelIds.length,
        total: mergedChannels.length,
        errors: result.errors,
      };
    } catch (error) {
      throw new Error(`Failed to refresh playlist: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },

  updatePlaylistSettings: (playlistId: string, settings: Partial<Playlist>) => {
    const playlists = get().playlists.map((p) =>
      p.id === playlistId ? { ...p, ...settings, updatedAt: Date.now() } : p,
    );

    storage.savePlaylists(playlists);

    const currentPlaylist =
      get().currentPlaylist?.id === playlistId
        ? playlists.find((p) => p.id === playlistId) || null
        : get().currentPlaylist;

    set({ playlists, currentPlaylist });

    // Handle auto-refresh toggle
    if (settings.autoRefreshEnabled !== undefined) {
      if (settings.autoRefreshEnabled) {
        const interval = settings.autoRefreshInterval || 60;
        setupAutoRefresh(playlistId, interval, get);
      } else {
        if (refreshIntervals.has(playlistId)) {
          clearInterval(refreshIntervals.get(playlistId)!);
          refreshIntervals.delete(playlistId);
        }
      }
    } else if (settings.autoRefreshInterval !== undefined) {
      // Update interval if changed
      const playlist = playlists.find((p) => p.id === playlistId);
      if (playlist?.autoRefreshEnabled) {
        setupAutoRefresh(playlistId, settings.autoRefreshInterval, get);
      }
    }
  },

  setCurrentChannel: (channel: Channel) => {
    set({ currentChannel: channel });
    storage.saveCurrentChannel(channel.id);
  },

  toggleFavorite: (channelId: string) => {
    const playlists = get().playlists.map((playlist) => ({
      ...playlist,
      channels: playlist.channels.map((channel) =>
        channel.id === channelId ? { ...channel, isFavorite: !channel.isFavorite } : channel,
      ),
    }));

    storage.savePlaylists(playlists);

    const currentPlaylist = playlists.find((p) => p.id === get().currentPlaylist?.id) || null;
    const currentChannel =
      get().currentChannel?.id === channelId
        ? { ...get().currentChannel!, isFavorite: !get().currentChannel!.isFavorite }
        : get().currentChannel;

    set({ playlists, currentPlaylist, currentChannel });
  },

  toggleHidden: (channelId: string) => {
    const playlists = get().playlists.map((playlist) => ({
      ...playlist,
      channels: playlist.channels.map((channel) =>
        channel.id === channelId ? { ...channel, isHidden: !channel.isHidden } : channel,
      ),
    }));

    storage.savePlaylists(playlists);

    const currentPlaylist = playlists.find((p) => p.id === get().currentPlaylist?.id) || null;

    set({ playlists, currentPlaylist });
  },

  updateChannelOrder: (channelId: string, newOrder: number) => {
    const playlists = get().playlists.map((playlist) => ({
      ...playlist,
      channels: playlist.channels.map((channel) =>
        channel.id === channelId ? { ...channel, order: newOrder } : channel,
      ),
    }));

    storage.savePlaylists(playlists);

    const currentPlaylist = playlists.find((p) => p.id === get().currentPlaylist?.id) || null;

    set({ playlists, currentPlaylist });
  },

  searchChannels: (query: string) => {
    const playlist = get().currentPlaylist;
    if (!playlist) return [];

    const lowerQuery = query.toLowerCase();
    return playlist.channels.filter(
      (channel) =>
        !channel.isHidden &&
        (channel.name.toLowerCase().includes(lowerQuery) || channel.group?.toLowerCase().includes(lowerQuery)),
    );
  },

  getVisibleChannels: () => {
    const state = get();
    if (!state.currentPlaylist) return [];

    // Return all channels - filtering is done at component level using channel-management-store
    return state.currentPlaylist.channels.filter((ch) => !ch.isHidden);
  },

  getFavoriteChannels: () => {
    const playlist = get().currentPlaylist;
    if (!playlist) return [];

    return playlist.channels
      .filter((channel) => !channel.isHidden && channel.isFavorite)
      .sort((a, b) => a.order - b.order);
  },
}));
