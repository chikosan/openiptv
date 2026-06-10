"use client";

import { usePlaylistStore } from "@/lib/store/playlist-store";
import { Channel } from "@/lib/types";
import { Star, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface FavoritesRowProps {
  onChannelSelect: (channel: Channel) => void;
  className?: string;
}

/** Horizontal quick-access carousel of favorite channels (Netflix-row style). */
export function FavoritesRow({ onChannelSelect, className }: FavoritesRowProps) {
  const { getFavoriteChannels, currentChannel } = usePlaylistStore();
  const favorites = getFavoriteChannels().slice(0, 12);

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 px-1">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <h3 className="text-sm font-semibold text-foreground">Favorites</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {favorites.map((channel) => {
          const isActive = currentChannel?.id === channel.id;
          return (
            <button
              key={channel.id}
              className={cn(
                "relative flex-shrink-0 group cursor-pointer text-left",
                "w-40 rounded-lg overflow-hidden",
                "bg-card border transition-all duration-200",
                "hover:border-primary hover:shadow-lg hover:scale-105 active:scale-100",
                isActive && "border-primary ring-2 ring-primary/50",
              )}
              onClick={() => onChannelSelect(channel)}
              title={channel.name}
            >
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

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </div>

              <div className="p-2">
                <p className="text-xs font-medium truncate">{channel.name}</p>
                {channel.group && <p className="text-[10px] text-muted-foreground truncate">{channel.group}</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
