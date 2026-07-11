"use client";

import { useWatchHistoryStore } from "@/lib/store/watch-history-store";
import { usePlaylistStore } from "@/lib/store/playlist-store";
import { Channel } from "@/lib/types";
import { Clock, Play, X, History } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ContinueWatchingProps {
  onChannelSelect: (channel: Channel) => void;
  className?: string;
}

export function ContinueWatching({ onChannelSelect, className }: ContinueWatchingProps) {
  const { getRecentlyWatched, removeFromHistory } = useWatchHistoryStore();
  const { currentChannel } = usePlaylistStore();

  const recentChannels = getRecentlyWatched(8);

  if (recentChannels.length === 0) {
    return null;
  }

  const formatWatchTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatLastWatched = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Continue Watching</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {recentChannels.map(({ channel, lastWatched, totalWatchTime }) => {
          const isActive = currentChannel?.id === channel.id;

          return (
            <div
              key={channel.id}
              className={cn(
                "relative flex-shrink-0 group cursor-pointer",
                "w-40 rounded-lg overflow-hidden",
                "bg-card border transition-all duration-200",
                "hover:border-primary hover:shadow-lg hover:scale-105",
                isActive && "border-primary ring-2 ring-primary/50",
              )}
              onClick={() => onChannelSelect(channel)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {channel.logo ? (
                  <Image
                    src={channel.logo}
                    alt={channel.name}
                    fill
                    sizes="160px"
                    className="object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {channel.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(channel.id);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="h-3 w-3 text-white" />
                </button>

                {/* Watch time badge */}
                {totalWatchTime > 0 && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatWatchTime(totalWatchTime)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{channel.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatLastWatched(lastWatched)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
