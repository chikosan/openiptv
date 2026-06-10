"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { ScreenOrientation, type OrientationLockType } from "@capacitor/screen-orientation";
import { cn } from "@/lib/utils";

interface OrientationLockButtonProps {
  className?: string;
}

/** Lock/unlock screen rotation while watching (touch devices only). */
export function OrientationLockButton({ className }: OrientationLockButtonProps) {
  const [locked, setLocked] = useState(false);

  if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  const handleToggle = async () => {
    try {
      if (locked) {
        if (Capacitor.isNativePlatform()) {
          await ScreenOrientation.unlock();
        } else {
          screen.orientation.unlock();
        }
        setLocked(false);
      } else {
        const current: OrientationLockType = screen.orientation?.type?.startsWith("portrait")
          ? "portrait"
          : "landscape";
        if (Capacitor.isNativePlatform()) {
          await ScreenOrientation.lock({ orientation: current });
        } else {
          // Web Screen Orientation API (typically requires fullscreen)
          await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.(current);
        }
        setLocked(true);
      }
    } catch (error) {
      console.warn("Orientation lock not available:", error);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all hover:bg-accent",
        locked && "text-primary",
        className,
      )}
      title={locked ? "Unlock rotation" : "Lock rotation"}
    >
      {locked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
    </button>
  );
}
