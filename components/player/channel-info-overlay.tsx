"use client";

import { useEffect, useState } from "react";
import { Channel } from "@/lib/types";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { epgManager } from "@/lib/epg/epg-manager";
import { EPGProgram } from "@/lib/epg/types";
import { Star, Globe, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type Hls from "hls.js";

interface ChannelInfoOverlayProps {
  channel: Channel;
  isVisible: boolean;
  onHide: () => void;
  videoElement?: HTMLVideoElement | null;
  hls?: Hls | null;
}

interface StreamBadges {
  resolution: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
}

// "avc1.64001f" → "H.264" etc.
function friendlyCodec(codec: string | undefined): string | null {
  if (!codec) return null;
  if (codec.startsWith("avc")) return "H.264";
  if (codec.startsWith("hvc") || codec.startsWith("hev")) return "HEVC";
  if (codec.startsWith("av01")) return "AV1";
  if (codec.startsWith("mp4a")) return "AAC";
  if (codec.startsWith("ac-3")) return "AC3";
  if (codec.startsWith("ec-3")) return "EAC3";
  return codec.split(".")[0].toUpperCase();
}

const timeFmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ChannelInfoOverlay({ channel, isVisible, onHide, videoElement, hls }: ChannelInfoOverlayProps) {
  const { player } = usePreferencesStore();
  const [show, setShow] = useState(false);
  const [nowNext, setNowNext] = useState<{ current: EPGProgram | null; next: EPGProgram | null }>({
    current: null,
    next: null,
  });
  const [badges, setBadges] = useState<StreamBadges>({ resolution: null, videoCodec: null, audioCodec: null });

  // Refresh EPG now/next whenever the banner appears for a channel
  useEffect(() => {
    if (isVisible) {
      setNowNext(epgManager.getCurrentProgram(channel.name));
    }
  }, [isVisible, channel.name]);

  // Stream badges (resolution/codecs) - retry briefly since metadata arrives async
  useEffect(() => {
    if (!isVisible) return;
    const update = () => {
      const level = hls && hls.currentLevel >= 0 ? hls.levels[hls.currentLevel] : null;
      setBadges({
        resolution:
          videoElement && videoElement.videoWidth > 0 ? `${videoElement.videoWidth}×${videoElement.videoHeight}` : null,
        videoCodec: friendlyCodec(level?.videoCodec),
        audioCodec: friendlyCodec(level?.audioCodec),
      });
    };
    update();
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, [isVisible, videoElement, hls, channel.id]);

  useEffect(() => {
    if (isVisible && player.showChannelInfo) {
      setShow(true);

      // Auto-hide after duration
      const timer = setTimeout(() => {
        setShow(false);
        onHide();
      }, player.channelInfoDuration * 1000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, player.showChannelInfo, player.channelInfoDuration, onHide]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute top-0 left-0 right-0 z-20",
        "bg-gradient-to-b from-black/90 via-black/60 to-transparent",
        "p-6 transition-all duration-500",
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
      )}
    >
      <div className="flex items-start gap-4 max-w-2xl">
        {/* Channel Logo */}
        {channel.logo && (
          <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white/10">
            <Image
              src={channel.logo}
              alt={channel.name}
              fill
              sizes="64px"
              className="object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Channel Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {channel.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            <h2 className="text-xl font-bold text-white truncate">{channel.name}</h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-white/70">
            {channel.group && (
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {channel.group}
              </span>
            )}
            {channel.tvgName && (
              <span className="flex items-center gap-1">
                <Tv className="h-3.5 w-3.5" />
                {channel.tvgName}
              </span>
            )}
          </div>

          {/* EPG now/next */}
          {nowNext.current && (
            <div className="mt-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm text-white font-medium truncate">Now: {nowNext.current.title}</p>
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-primary/30 text-primary-foreground text-xs font-mono tabular-nums">
                  {timeFmt(nowNext.current.start)}
                </span>
                <span className="text-white/50 text-xs">–</span>
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-primary/30 text-primary-foreground text-xs font-mono tabular-nums">
                  {timeFmt(nowNext.current.end)}
                </span>
              </div>
              <div className="mt-1 h-1 w-full max-w-xs bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${epgManager.getProgramProgress(nowNext.current)}%` }}
                />
              </div>
              {nowNext.next && <p className="mt-1 text-xs text-white/60 truncate">Next: {nowNext.next.title}</p>}
            </div>
          )}

          {/* Now Playing indicator + stream badges */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs text-white/60 uppercase tracking-wider">Live</span>
            {badges.resolution && (
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono">
                {badges.resolution}
              </span>
            )}
            {badges.videoCodec && (
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono">
                {badges.videoCodec}
              </span>
            )}
            {badges.audioCodec && (
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono">
                {badges.audioCodec}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dismiss hint */}
      <p className="mt-4 text-xs text-white/40">
        Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/60">I</kbd> to toggle info
      </p>
    </div>
  );
}
