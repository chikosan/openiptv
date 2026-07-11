"use client";

import { useEffect, useState, useCallback } from "react";
import { Channel } from "@/lib/types";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { Play, X, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface UpNextOverlayProps {
  nextChannel: Channel | null;
  onPlayNext: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export function UpNextOverlay({ nextChannel, onPlayNext, onCancel, isVisible }: UpNextOverlayProps) {
  const { player } = usePreferencesStore();
  const [countdown, setCountdown] = useState(player.autoNextDelay);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isVisible || !player.autoNextChannel || !nextChannel) {
      setCountdown(player.autoNextDelay);
      return;
    }

    if (isPaused) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onPlayNext();
          return player.autoNextDelay;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, player.autoNextChannel, player.autoNextDelay, nextChannel, isPaused, onPlayNext]);

  if (!isVisible || !player.autoNextChannel || !nextChannel) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute bottom-24 right-4 z-20",
        "w-72 rounded-xl overflow-hidden",
        "bg-black/90 backdrop-blur-md border border-white/10",
        "shadow-2xl transition-all duration-300",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4",
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <SkipForward className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-white/80">Up Next</span>
        </div>
        <button onClick={onCancel} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X className="h-4 w-4 text-white/60" />
        </button>
      </div>

      {/* Channel Preview */}
      <div className="p-3">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="relative w-20 h-14 flex-shrink-0 rounded-md overflow-hidden bg-white/5">
            {nextChannel.logo ? (
              <Image src={nextChannel.logo} alt={nextChannel.name} fill sizes="80px" className="object-contain p-1" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white/40">{nextChannel.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{nextChannel.name}</p>
            {nextChannel.group && <p className="text-xs text-white/50 truncate">{nextChannel.group}</p>}
          </div>
        </div>
      </div>

      {/* Countdown Progress */}
      <div className="relative h-1 bg-white/10">
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000"
          style={{
            width: `${((player.autoNextDelay - countdown) / player.autoNextDelay) * 100}%`,
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-sm font-medium text-white/70 rounded-lg hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onPlayNext}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Play className="h-4 w-4" fill="currentColor" />
          Play Now
        </button>
      </div>

      {/* Countdown text */}
      <div className="px-3 pb-3 text-center">
        <p className="text-xs text-white/40">{isPaused ? "Paused" : `Playing in ${countdown}s`}</p>
      </div>
    </div>
  );
}
