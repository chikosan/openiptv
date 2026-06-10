"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { X, Search, CalendarDays } from "lucide-react";
import { epgManager } from "@/lib/epg/epg-manager";
import { usePlaylistStore } from "@/lib/store/playlist-store";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { EPGSearch } from "./epg-search";
import { EPGProgram } from "@/lib/epg/types";
import { cn } from "@/lib/utils";

interface EPGGridProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROW_HEIGHT = 56; // px
const PX_PER_MINUTE = 4;
const HOURS_SPAN = 12;
const OVERSCAN_ROWS = 6;
const CHANNEL_COL = 160; // px, sticky left column

/** Full timeline guide: channels × time. Click/OK a program to tune. */
export function EPGGrid({ isOpen, onClose }: EPGGridProps) {
  const { getVisibleChannels, setCurrentChannel } = usePlaylistStore();
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const [showSearch, setShowSearch] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  const channels = useMemo(() => (isOpen ? getVisibleChannels() : []), [isOpen, getVisibleChannels]);

  // Timeline window: from the previous half-hour mark, spanning 12 hours
  const timeline = useMemo(() => {
    const start = new Date();
    start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
    start.setHours(start.getHours() - 1);
    const end = new Date(start.getTime() + HOURS_SPAN * 3600_000);
    return { start, end };
  }, []);

  const totalWidth = HOURS_SPAN * 60 * PX_PER_MINUTE;

  const timeMarks = useMemo(() => {
    const marks: Date[] = [];
    for (let t = timeline.start.getTime(); t < timeline.end.getTime(); t += 30 * 60_000) {
      marks.push(new Date(t));
    }
    return marks;
  }, [timeline]);

  const handleScroll = useCallback(() => {
    if (!bodyRef.current) return;
    setScrollTop(bodyRef.current.scrollTop);
  }, []);

  useEffect(() => {
    if (!isOpen || !bodyRef.current) return;
    setViewportH(bodyRef.current.clientHeight);
  }, [isOpen]);

  // Arrow-key navigation across program cells (TV remote)
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    const focused = document.activeElement as HTMLElement | null;
    if (!focused?.dataset.epgCell) return;
    const row = focused.closest<HTMLElement>("[data-epg-row]");
    if (!row) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const cells = Array.from(row.querySelectorAll<HTMLElement>("[data-epg-cell]"));
      const idx = cells.indexOf(focused);
      const next = cells[e.key === "ArrowRight" ? idx + 1 : idx - 1];
      next?.focus();
      next?.scrollIntoView({ block: "nearest", inline: "nearest" });
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const sibling =
        e.key === "ArrowDown" ? row.nextElementSibling : (row.previousElementSibling as HTMLElement | null);
      const target = (sibling as HTMLElement | null)?.querySelector<HTMLElement>("[data-epg-cell]");
      target?.focus();
      target?.scrollIntoView({ block: "nearest" });
    }
  }, []);

  if (!isOpen) return null;

  const visibleStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const visibleEnd = Math.min(channels.length, Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + OVERSCAN_ROWS);
  const nowOffset = ((Date.now() - timeline.start.getTime()) / 60_000) * PX_PER_MINUTE;

  const tune = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (channel) {
      setCurrentChannel(channel);
      onClose();
    }
  };

  const handleSearchSelect = (channelName: string, _program: EPGProgram) => {
    const channel = channels.find((c) => c.name === channelName || c.tvgName === channelName);
    if (channel) {
      setCurrentChannel(channel);
    }
    setShowSearch(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" ref={trapRef}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-none pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span>TV Guide</span>
          <span className="text-sm text-muted-foreground font-normal hidden sm:inline">
            {timeline.start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-accent"
            title="Search programs"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-accent"
            title="Close guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div ref={bodyRef} onScroll={handleScroll} onKeyDown={handleGridKeyDown} className="flex-1 overflow-auto min-h-0">
        <div style={{ width: CHANNEL_COL + totalWidth }} className="relative">
          {/* Time header */}
          <div className="sticky top-0 z-30 flex bg-background border-b" style={{ height: 32 }}>
            <div className="sticky left-0 z-40 bg-background border-r flex-none" style={{ width: CHANNEL_COL }} />
            <div className="relative" style={{ width: totalWidth }}>
              {timeMarks.map((mark, i) => (
                <span
                  key={i}
                  className="absolute top-1.5 text-xs text-muted-foreground"
                  style={{ left: i * 30 * PX_PER_MINUTE + 4 }}
                >
                  {mark.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
              ))}
            </div>
          </div>

          {/* Virtualized channel rows */}
          <div style={{ height: channels.length * ROW_HEIGHT, position: "relative" }}>
            {/* Now line */}
            {nowOffset > 0 && nowOffset < totalWidth && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-20 pointer-events-none"
                style={{ left: CHANNEL_COL + nowOffset }}
              />
            )}

            {channels.slice(visibleStart, visibleEnd).map((channel, i) => {
              const rowIndex = visibleStart + i;
              const programs = epgManager.getProgramsInRange(
                channel.tvgName || channel.name,
                timeline.start,
                timeline.end,
              );
              return (
                <div
                  key={channel.id}
                  data-epg-row
                  className="absolute left-0 right-0 flex border-b border-border/50"
                  style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  {/* Channel cell */}
                  <button
                    data-epg-cell
                    onClick={() => tune(channel.id)}
                    className="sticky left-0 z-10 bg-card border-r flex-none px-3 text-left text-sm font-medium truncate hover:bg-accent focus:bg-accent"
                    style={{ width: CHANNEL_COL }}
                    title={channel.name}
                  >
                    {channel.name}
                  </button>

                  {/* Program blocks */}
                  <div className="relative flex-none" style={{ width: totalWidth }}>
                    {programs.length === 0 ? (
                      <div className="absolute inset-y-1 left-1 right-1 rounded bg-muted/20 flex items-center px-3 text-xs text-muted-foreground">
                        No program data
                      </div>
                    ) : (
                      programs.map((program) => {
                        const startMin = Math.max(0, (program.start.getTime() - timeline.start.getTime()) / 60_000);
                        const endMin = Math.min(
                          HOURS_SPAN * 60,
                          (program.end.getTime() - timeline.start.getTime()) / 60_000,
                        );
                        const width = Math.max(24, (endMin - startMin) * PX_PER_MINUTE - 2);
                        const isNow = program.start.getTime() <= Date.now() && program.end.getTime() > Date.now();
                        return (
                          <button
                            key={program.id + program.start.toISOString()}
                            data-epg-cell
                            onClick={() => tune(channel.id)}
                            className={cn(
                              "absolute inset-y-1 rounded border px-2 text-left text-xs overflow-hidden whitespace-nowrap text-ellipsis transition-colors",
                              isNow
                                ? "bg-primary/20 border-primary/50 hover:bg-primary/30"
                                : "bg-muted/40 border-border hover:bg-accent",
                            )}
                            style={{ left: startMin * PX_PER_MINUTE, width }}
                            title={`${program.title} (${program.start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })})`}
                          >
                            <span className="font-medium">{program.title}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Program search (channels + programs) */}
      <EPGSearch
        channels={channels}
        onSelectProgram={handleSearchSelect}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </div>
  );
}
