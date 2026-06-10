"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import videojs from "video.js";
import { cn } from "@/lib/utils";

type QualityLevel = { height: number; enabled: boolean };
type VjsPlayer = ReturnType<typeof videojs> & {
  qualityLevels?: () => QualityLevel[] & { length: number };
};

interface QualitySelectorProps {
  player: VjsPlayer | null;
  className?: string;
}

export function QualitySelector({ player, className }: QualitySelectorProps) {
  const [qualities, setQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!player) return;

    const updateQualities = () => {
      try {
        const levels = player.qualityLevels?.();
        if (levels && levels.length > 0) {
          const qualityList = ["auto"];
          for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            qualityList.push(`${level.height}p`);
          }
          setQualities(qualityList);
        }
      } catch (error) {
        console.error("Quality detection error:", error);
      }
    };

    player.ready(() => {
      updateQualities();
    });

    player.on("loadedmetadata", updateQualities);

    return () => {
      player.off("loadedmetadata", updateQualities);
    };
  }, [player]);

  const handleQualityChange = (quality: string) => {
    try {
      const levels = player?.qualityLevels?.();
      if (!levels) return;

      if (quality === "auto") {
        for (let i = 0; i < levels.length; i++) {
          levels[i].enabled = true;
        }
      } else {
        const targetHeight = parseInt(quality);
        for (let i = 0; i < levels.length; i++) {
          levels[i].enabled = levels[i].height === targetHeight;
        }
      }

      setCurrentQuality(quality);
      setShowMenu(false);
    } catch (error) {
      console.error("Quality change error:", error);
    }
  };

  if (qualities.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all hover:bg-accent",
          showMenu && "bg-accent",
          className,
        )}
        title="Quality"
      >
        <Settings className="h-5 w-5" />
      </button>

      {showMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-popover border rounded-md shadow-lg overflow-hidden z-50 min-w-32">
          <div className="p-2 text-xs font-semibold text-muted-foreground border-b">Quality</div>
          {qualities.map((quality) => (
            <button
              key={quality}
              onClick={() => handleQualityChange(quality)}
              className={cn(
                "w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                currentQuality === quality && "bg-accent text-accent-foreground font-medium",
              )}
            >
              {quality === "auto" ? "Auto" : quality}
              {currentQuality === quality && " ✓"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
