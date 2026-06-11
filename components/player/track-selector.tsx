"use client";

import { useState, useEffect } from "react";
import { Languages } from "lucide-react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";

interface TrackSelectorProps {
  hls: Hls | null;
  className?: string;
}

interface TrackOption {
  id: number;
  label: string;
}

/** Audio track + subtitle selection for streams that carry multiple tracks. */
export function TrackSelector({ hls, className }: TrackSelectorProps) {
  const [audioTracks, setAudioTracks] = useState<TrackOption[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<TrackOption[]>([]);
  const [currentAudio, setCurrentAudio] = useState(-1);
  const [currentSubtitle, setCurrentSubtitle] = useState(-1);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!hls) return;

    const updateTracks = () => {
      setAudioTracks(hls.audioTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Audio ${i + 1}` })));
      setSubtitleTracks(hls.subtitleTracks.map((t, i) => ({ id: i, label: t.name || t.lang || `Subtitle ${i + 1}` })));
      setCurrentAudio(hls.audioTrack);
      setCurrentSubtitle(hls.subtitleTrack);
    };

    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, updateTracks);
    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, updateTracks);
    hls.on(Hls.Events.MANIFEST_PARSED, updateTracks);
    updateTracks();

    return () => {
      hls.off(Hls.Events.AUDIO_TRACKS_UPDATED, updateTracks);
      hls.off(Hls.Events.SUBTITLE_TRACKS_UPDATED, updateTracks);
      hls.off(Hls.Events.MANIFEST_PARSED, updateTracks);
    };
  }, [hls]);

  if (!hls || (audioTracks.length <= 1 && subtitleTracks.length === 0)) {
    return null;
  }

  const selectAudio = (id: number) => {
    hls.audioTrack = id;
    setCurrentAudio(id);
  };

  const selectSubtitle = (id: number) => {
    hls.subtitleTrack = id;
    hls.subtitleDisplay = id >= 0;
    setCurrentSubtitle(id);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all hover:bg-accent",
          showMenu && "bg-accent",
          className,
        )}
        title="Audio & subtitles"
      >
        <Languages className="h-5 w-5" />
      </button>

      {showMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-popover border rounded-md shadow-lg overflow-hidden z-50 min-w-44 max-h-64 overflow-y-auto">
          {audioTracks.length > 1 && (
            <>
              <div className="p-2 text-xs font-semibold text-muted-foreground border-b">Audio</div>
              {audioTracks.map((track) => (
                <button
                  key={`a-${track.id}`}
                  onClick={() => selectAudio(track.id)}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                    currentAudio === track.id && "bg-accent text-accent-foreground font-medium",
                  )}
                >
                  {track.label}
                  {currentAudio === track.id && " ✓"}
                </button>
              ))}
            </>
          )}
          {subtitleTracks.length > 0 && (
            <>
              <div className="p-2 text-xs font-semibold text-muted-foreground border-b border-t">Subtitles</div>
              <button
                onClick={() => selectSubtitle(-1)}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                  currentSubtitle === -1 && "bg-accent text-accent-foreground font-medium",
                )}
              >
                Off
                {currentSubtitle === -1 && " ✓"}
              </button>
              {subtitleTracks.map((track) => (
                <button
                  key={`s-${track.id}`}
                  onClick={() => selectSubtitle(track.id)}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                    currentSubtitle === track.id && "bg-accent text-accent-foreground font-medium",
                  )}
                >
                  {track.label}
                  {currentSubtitle === track.id && " ✓"}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
