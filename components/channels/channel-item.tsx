"use client";

import { useState, memo, useCallback, useRef } from "react";
import { Star, Play, Trash2, Radio, History, Video } from "lucide-react";
import { Channel } from "@/lib/types";
import { usePlaylistStore } from "@/lib/store/playlist-store";
import { useChannelManagementStore } from "@/lib/store/channel-management-store";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { useRecordingCount } from "@/lib/store/recordings-store";
import { ContextMenu } from "./context-menu";
import { useTVMode } from "@/lib/hooks/use-tv-mode";
import { useLongPress } from "@/lib/hooks/use-long-press";
import { useNowNext } from "@/lib/hooks/use-now-next";
import { epgManager } from "@/lib/epg/epg-manager";
import { useToast } from "@/components/ui/toast";
import { cn, vibrate } from "@/lib/utils";
import Image from "next/image";

interface ChannelItemProps {
  channel: Channel;
  viewMode: "grid" | "list";
  isActive: boolean;
}

export const ChannelItem = memo(function ChannelItem({ channel, viewMode, isActive }: ChannelItemProps) {
  const { setCurrentChannel, toggleFavorite } = usePlaylistStore();
  const { deleteChannel, restoreChannel } = useChannelManagementStore();
  const { addToast } = useToast();
  const { ui } = usePreferencesStore();
  const showNumbers = ui.showChannelNumbers;
  const recordingCount = useRecordingCount(channel.id);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(channel.name);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isTVMode = useTVMode();
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressFiredRef = useRef(false);
  const { current: nowPlaying } = useNowNext(channel.tvgName || channel.name);

  const handleClick = useCallback(() => {
    if (!isRenaming) {
      setCurrentChannel(channel);
    }
  }, [isRenaming, channel, setCurrentChannel]);

  // TV remote: short OK press selects, holding OK ~600ms opens the context menu
  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (!isTVMode) {
        handleClick();
        return;
      }
      e.preventDefault();
      if (e.repeat) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      longPressFiredRef.current = false;
      enterTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setContextMenu({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }, 600);
    },
    [isTVMode, handleClick],
  );

  const handleItemKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" || !isTVMode) return;
      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current);
        enterTimerRef.current = null;
      }
      if (!longPressFiredRef.current) {
        handleClick();
      }
    },
    [isTVMode, handleClick],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Touch long-press opens the same menu (renders as a bottom sheet on phones)
  const longPress = useLongPress((point) => setContextMenu({ x: point.x, y: point.y }));

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(true);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("channelId", channel.id);
      e.dataTransfer.setData("channelData", JSON.stringify(channel));
    },
    [channel],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      vibrate(10);
      toggleFavorite(channel.id);
    },
    [channel.id, toggleFavorite],
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteChannel({
        id: channel.id,
        name: channel.name,
        url: channel.url,
        logo: channel.logo,
        group: channel.group,
      });
      addToast(`Deleted "${channel.name}"`, "info", 5000, {
        label: "Undo",
        onClick: () => {
          restoreChannel(channel.id);
          window.dispatchEvent(new CustomEvent("channelDeleted"));
        },
      });
    },
    [channel, deleteChannel, restoreChannel, addToast],
  );

  if (viewMode === "grid") {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleItemKeyDown}
          onKeyUp={handleItemKeyUp}
          onContextMenu={handleContextMenu}
          onTouchStart={longPress.onTouchStart}
          onTouchMove={longPress.onTouchMove}
          onTouchEnd={longPress.onTouchEnd}
          onTouchCancel={longPress.onTouchCancel}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={cn(
            "cv-auto-card relative group p-3 rounded-xl border transition-all duration-300 cursor-pointer",
            "hover:border-primary hover:shadow-xl hover:shadow-primary/20 hover:scale-105 hover:-translate-y-1",
            "active:scale-[0.98]",
            isActive
              ? "border-primary bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/50"
              : "bg-card hover:bg-card/80",
            isDragging && "opacity-50 scale-95",
          )}
          title={channel.name}
        >
          {/* Live badge for active */}
          {isActive && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              <Radio className="h-3 w-3" />
              LIVE
            </div>
          )}

          {/* Logo or Placeholder */}
          <div className="aspect-video mb-3 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden relative">
            {channel.logo ? (
              <Image
                src={channel.logo}
                alt={channel.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={cn("object-contain p-2 transition-transform duration-300", isHovered && "scale-110")}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Play
                className={cn(
                  "h-10 w-10 text-muted-foreground transition-all duration-300",
                  isHovered && "scale-125 text-primary",
                )}
              />
            )}

            {/* Play overlay on hover */}
            <div
              className={cn(
                "absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300",
                isHovered ? "opacity-100" : "opacity-0",
              )}
            >
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
                <Play className="h-6 w-6 text-black fill-black ml-1" />
              </div>
            </div>
          </div>

          {/* Channel Name - Full name */}
          <div
            className={cn(
              "text-sm font-semibold mb-1 transition-colors duration-200 leading-tight",
              isHovered ? "text-primary" : "",
            )}
            title={channel.name}
          >
            {channel.name}
          </div>

          {/* Group */}
          {channel.group && (
            <div className="text-xs text-muted-foreground truncate" title={channel.group}>
              {channel.group}
            </div>
          )}

          {/* Favorite badge */}
          {channel.isFavorite && (
            <div className="absolute top-2 right-2 z-10">
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 drop-shadow-lg" />
            </div>
          )}

          {/* Recordings badge */}
          {recordingCount > 0 && (
            <div
              className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 text-white text-[10px] font-bold rounded-full"
              style={{ right: channel.isFavorite ? "2rem" : "0.5rem" }}
            >
              <Video className="h-3 w-3" />
              {recordingCount}
            </div>
          )}

          {/* Action Buttons - always visible on touch, hover-revealed on desktop */}
          <div
            className={cn(
              "absolute bottom-2 right-2 flex gap-1 transition-all duration-300 tv-focus-reveal",
              "opacity-100 translate-y-0 lg:opacity-0 lg:translate-y-2",
              isHovered && "lg:opacity-100 lg:translate-y-0",
            )}
          >
            <button
              onClick={handleFavoriteClick}
              className={cn(
                "p-2 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center rounded-full backdrop-blur-md transition-all duration-200",
                channel.isFavorite ? "bg-yellow-500/30 hover:bg-yellow-500/50" : "bg-black/50 hover:bg-black/70",
              )}
              title={channel.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={cn("h-4 w-4", channel.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-white")} />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-2 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center rounded-full bg-black/50 hover:bg-destructive/80 backdrop-blur-md transition-all duration-200"
              title="Delete channel"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
        {contextMenu && (
          <ContextMenu
            channel={channel}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onRename={() => setIsRenaming(true)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleItemKeyDown}
        onKeyUp={handleItemKeyUp}
        onContextMenu={handleContextMenu}
        onTouchStart={longPress.onTouchStart}
        onTouchMove={longPress.onTouchMove}
        onTouchEnd={longPress.onTouchEnd}
        onTouchCancel={longPress.onTouchCancel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "cv-auto w-full group flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 cursor-pointer relative",
          "hover:bg-gradient-to-r hover:from-primary/20 hover:to-transparent hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10",
          "active:scale-[0.99] active:bg-primary/10",
          isActive && "bg-gradient-to-r from-primary/30 to-primary/10 border-l-4 border-primary",
          isDragging && "opacity-50 scale-95",
        )}
        title={channel.name}
      >
        {/* Live indicator for active */}
        {isActive && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Radio className="h-3 w-3 text-red-500 animate-pulse" />
          </div>
        )}

        {/* Channel Number */}
        {showNumbers && (channel.tvgChno || channel.order) && (
          <div className="w-8 text-center flex-shrink-0">
            <span className="text-xs font-mono text-muted-foreground">{channel.tvgChno || channel.order}</span>
          </div>
        )}

        {/* Logo or Placeholder */}
        <div
          className={cn(
            "relative w-14 h-10 flex-shrink-0 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden transition-transform duration-200",
            isHovered && "scale-110 shadow-md",
          )}
        >
          {channel.logo ? (
            <Image
              src={channel.logo}
              alt={channel.name}
              fill
              sizes="56px"
              className="object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Play className="h-4 w-4 text-muted-foreground" />
          )}
          {/* Play overlay on hover */}
          {isHovered && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center animate-fade-in-up">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          )}
        </div>

        {/* Channel Info - Full name with tooltip */}
        <div className="flex-1 text-left min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "font-medium text-sm transition-colors duration-200 flex-1 min-w-0",
                isHovered ? "text-primary" : "",
                isActive ? "text-primary font-semibold" : "",
              )}
              title={channel.name}
            >
              {/* Show full name, wrap if needed */}
              <span className="block leading-tight">{channel.name}</span>
            </div>
            {/* Catchup badge */}
            {channel.catchup && (
              <span
                className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded"
                title={`${channel.catchup.days} day catchup available`}
              >
                <History className="h-2.5 w-2.5" />
                {channel.catchup.days}d
              </span>
            )}
            {/* Recordings badge */}
            {recordingCount > 0 && (
              <span
                className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded"
                title={`${recordingCount} recording${recordingCount > 1 ? "s" : ""} available`}
              >
                <Video className="h-2.5 w-2.5" />
                {recordingCount}
              </span>
            )}
          </div>
          {/* EPG now playing (when available) takes priority over the static group label */}
          {nowPlaying ? (
            <div className="mt-0.5 min-w-0">
              <div className="text-xs text-muted-foreground truncate" title={nowPlaying.title}>
                {nowPlaying.title}
              </div>
              <div className="mt-1 h-0.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full"
                  style={{ width: `${epgManager.getProgramProgress(nowPlaying)}%` }}
                />
              </div>
            </div>
          ) : (
            channel.group && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate" title={channel.group}>
                {channel.group}
              </div>
            )
          )}
        </div>

        {/* Action Buttons - always visible on touch, hover-revealed on desktop */}
        <div
          className={cn(
            "flex items-center gap-0.5 flex-shrink-0 transition-opacity duration-200 tv-focus-reveal",
            "opacity-100 lg:opacity-0",
            isHovered && "lg:opacity-100",
          )}
        >
          <button
            onClick={handleFavoriteClick}
            className={cn(
              "p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center rounded-full transition-all duration-200",
              channel.isFavorite ? "bg-yellow-500/20 hover:bg-yellow-500/30" : "hover:bg-accent",
            )}
            title={channel.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                channel.isFavorite
                  ? "fill-yellow-500 text-yellow-500 scale-110"
                  : "text-muted-foreground hover:scale-110",
              )}
            />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center rounded-full hover:bg-destructive/20 transition-all duration-200"
            title="Delete channel"
          >
            <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive hover:scale-110 transition-all duration-200" />
          </button>
        </div>

        {/* Favorite indicator (desktop only - the action button is always visible on touch) */}
        {channel.isFavorite && !isHovered && (
          <Star className="hidden lg:block h-3.5 w-3.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          channel={channel}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => setIsRenaming(true)}
        />
      )}
    </>
  );
});
