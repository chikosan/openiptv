"use client";

import { PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipButtonProps {
  videoElement: HTMLVideoElement | null;
  className?: string;
}

export function PipButton({ videoElement, className }: PipButtonProps) {
  const handlePip = async () => {
    if (!videoElement) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  };

  // Check if PiP is supported
  if (!document.pictureInPictureEnabled) {
    return null;
  }

  return (
    <button
      onClick={handlePip}
      className={cn(
        "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all hover:bg-accent",
        className,
      )}
      title="Picture-in-Picture"
    >
      <PictureInPicture2 className="h-5 w-5" />
    </button>
  );
}
