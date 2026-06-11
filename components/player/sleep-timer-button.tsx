"use client";

import { useState, useEffect, useRef } from "react";
import { MoonStar } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface SleepTimerButtonProps {
  videoElement: HTMLVideoElement | null;
  className?: string;
}

const OPTIONS = [30, 60, 90]; // minutes

/** Pause playback automatically after a chosen interval (couch fall-asleep insurance). */
export function SleepTimerButton({ videoElement, className }: SleepTimerButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setTimer = (minutes: number | null) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowMenu(false);
    if (minutes === null) {
      setEndsAt(null);
      return;
    }
    const end = Date.now() + minutes * 60_000;
    setEndsAt(end);
    toast.info(`Sleep timer set for ${minutes} minutes`);
    timerRef.current = setTimeout(() => {
      videoElement?.pause();
      setEndsAt(null);
      toast.info("Sleep timer: playback paused");
    }, minutes * 60_000);
  };

  const remainingMin = endsAt ? Math.max(0, Math.round((endsAt - Date.now()) / 60_000)) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all hover:bg-accent",
          (showMenu || endsAt) && "bg-accent text-primary",
          className,
        )}
        title={endsAt ? `Sleep timer: ~${remainingMin} min left` : "Sleep timer"}
      >
        <MoonStar className="h-5 w-5" />
      </button>

      {showMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-popover border rounded-md shadow-lg overflow-hidden z-50 min-w-36">
          <div className="p-2 text-xs font-semibold text-muted-foreground border-b">Sleep timer</div>
          <button
            onClick={() => setTimer(null)}
            className={cn(
              "w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
              !endsAt && "bg-accent text-accent-foreground font-medium",
            )}
          >
            Off
          </button>
          {OPTIONS.map((min) => (
            <button
              key={min}
              onClick={() => setTimer(min)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
            >
              {min} minutes
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
