"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Info, Tv, Radio, Rewind, History, Bell, BellRing } from "lucide-react";
import { Channel } from "@/lib/types";
import { epgManager } from "@/lib/epg/epg-manager";
import { catchupManager } from "@/lib/catchup/catchup-manager";
import { EPGProgram } from "@/lib/epg/types";
import { useRemindersStore } from "@/lib/store/reminders-store";
import { cn } from "@/lib/utils";

interface ProgramInfoProps {
  channel: Channel;
  compact?: boolean;
  onWatchFromStart?: (url: string, program: EPGProgram) => void;
  onShowCatchup?: () => void;
}

export function ProgramInfo({ channel, compact = false, onWatchFromStart, onShowCatchup }: ProgramInfoProps) {
  const [currentProgram, setCurrentProgram] = useState<EPGProgram | null>(null);
  const [nextProgram, setNextProgram] = useState<EPGProgram | null>(null);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");

  const hasCatchup = catchupManager.hasCatchup(channel);
  const { addReminder, removeReminder, hasReminder } = useRemindersStore();

  const reminderId = nextProgram ? `${nextProgram.id}-${nextProgram.start.toISOString()}` : null;
  const reminderSet = reminderId ? hasReminder(reminderId) : false;

  const toggleReminder = useCallback(() => {
    if (!nextProgram || !reminderId) return;
    if (reminderSet) {
      removeReminder(reminderId);
    } else {
      addReminder({
        id: reminderId,
        channelName: channel.name,
        programTitle: nextProgram.title,
        startsAt: nextProgram.start.toISOString(),
      });
    }
  }, [nextProgram, reminderId, reminderSet, addReminder, removeReminder, channel.name]);
  const catchupDays = catchupManager.getCatchupDays(channel);

  const updateProgram = useCallback(() => {
    const { current, next } = epgManager.getCurrentProgram(channel.name);
    setCurrentProgram(current);
    setNextProgram(next);

    if (current) {
      setProgress(epgManager.getProgramProgress(current));
      setTimeRemaining(epgManager.getTimeRemaining(current));
    }
  }, [channel.name]);

  const handleWatchFromStart = useCallback(() => {
    if (currentProgram && onWatchFromStart) {
      const url = catchupManager.getWatchFromStartUrl(channel, currentProgram);
      if (url) {
        onWatchFromStart(url, currentProgram);
      }
    }
  }, [channel, currentProgram, onWatchFromStart]);

  useEffect(() => {
    // Initial update
    updateProgram();

    // Update every 10 seconds for more responsive UI
    const interval = setInterval(updateProgram, 10000);

    return () => clearInterval(interval);
  }, [updateProgram]);

  // Also update when channel changes
  useEffect(() => {
    updateProgram();
  }, [channel.id, updateProgram]);

  // Show helpful message when no EPG data
  if (!currentProgram && !nextProgram) {
    if (compact) {
      return (
        <div className="p-4 md:p-5 bg-gradient-to-br from-card to-card/50 rounded-xl border shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted/50 flex-shrink-0">
              <Tv className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">No program info available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add an EPG/XMLTV source in settings to see program guide
              </p>
            </div>
          </div>

          {/* Catchup Button */}
          <div className="pt-2 border-t border-border/50">
            <button
              onClick={onShowCatchup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
              <History className="h-3.5 w-3.5" />
              Catchup TV
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  if (compact) {
    return (
      <div className="p-4 md:p-5 bg-gradient-to-br from-card to-card/50 rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
        {/* Current Program */}
        {currentProgram && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Tv className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                  <Radio className="h-3 w-3 animate-pulse" />
                  NOW
                </span>
              </div>
              <p className="font-semibold text-sm leading-tight">{currentProgram.title}</p>
              {currentProgram.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{currentProgram.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>
                  {currentProgram.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                  {currentProgram.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>•</span>
                <span className="text-primary font-medium">{timeRemaining} left</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-primary/70 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Watch from Start button */}
              {hasCatchup && onWatchFromStart && progress > 5 && (
                <button
                  onClick={handleWatchFromStart}
                  className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Rewind className="h-3 w-3" />
                  Watch from start
                </button>
              )}
            </div>
          </div>
        )}

        {/* Next Program */}
        {nextProgram && (
          <div className="flex items-start gap-3 pt-2 border-t border-border/50">
            <div className="p-2 rounded-lg bg-muted/50 flex-shrink-0">
              <Info className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Next: {nextProgram.title}</p>
              <p className="text-xs text-muted-foreground/70">
                {nextProgram.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <button
              onClick={toggleReminder}
              className={cn(
                "p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0",
                reminderSet
                  ? "text-primary bg-primary/10 hover:bg-primary/20"
                  : "text-muted-foreground hover:bg-accent",
              )}
              title={reminderSet ? "Cancel reminder" : "Remind me when it starts"}
            >
              {reminderSet ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Catchup Button */}
        {onShowCatchup && (
          <div className="pt-2 border-t border-border/50">
            <button
              onClick={onShowCatchup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
              <History className="h-3.5 w-3.5" />
              Catchup TV
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Program */}
      {currentProgram && (
        <div className="p-4 bg-card border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span>Now Playing</span>
                {currentProgram.category && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                      {currentProgram.category}
                    </span>
                  </>
                )}
              </div>
              <h3 className="text-lg font-bold">{currentProgram.title}</h3>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>
                {currentProgram.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                {currentProgram.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-primary font-medium">{epgManager.getTimeRemaining(currentProgram)} left</div>
            </div>
          </div>

          {currentProgram.description && (
            <p className="text-sm text-muted-foreground mb-3">{currentProgram.description}</p>
          )}

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Next Program */}
      {nextProgram && (
        <div className="p-4 bg-muted/50 border rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Info className="h-4 w-4" />
                <span>Up Next</span>
                {nextProgram.category && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-background/50 rounded text-xs">{nextProgram.category}</span>
                  </>
                )}
              </div>
              <h4 className="font-semibold">{nextProgram.title}</h4>
            </div>
            <div className="text-sm text-muted-foreground">
              {nextProgram.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {nextProgram.description && <p className="text-sm text-muted-foreground mt-2">{nextProgram.description}</p>}
        </div>
      )}
    </div>
  );
}
