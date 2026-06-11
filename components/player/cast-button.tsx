"use client";

import { useState, useEffect } from "react";
import { Cast } from "lucide-react";
import { chromecastManager, CastState } from "@/lib/chromecast";
import { cn } from "@/lib/utils";

interface CastButtonProps {
  className?: string;
  onCastStateChange?: (isConnected: boolean) => void;
}

export function CastButton({ className, onCastStateChange }: CastButtonProps) {
  const [castState, setCastState] = useState<CastState>("NO_DEVICES_AVAILABLE");
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const handleStateChange = (state: CastState) => {
      setCastState(state);
      onCastStateChange?.(state === "CONNECTED");
    };

    chromecastManager.addStateListener(handleStateChange);

    // Initial state
    setCastState(chromecastManager.getCastState());

    return () => {
      chromecastManager.removeStateListener(handleStateChange);
    };
  }, [onCastStateChange]);

  const handleClick = async () => {
    try {
      if (castState === "CONNECTED") {
        chromecastManager.endSession();
      } else if (castState === "NOT_CONNECTED") {
        await chromecastManager.requestSession();
      } else {
        // Show alert if no devices available
        alert(
          "No Chromecast devices found on your network.\n\nMake sure your Chromecast is:\n1. Powered on\n2. Connected to the same WiFi network\n3. Not in use by another app",
        );
      }
    } catch (error) {
      console.error("Cast error:", error);
      alert("Failed to cast: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  // ALWAYS show button for testing (you can remove this later)
  // Original: if (castState === "NO_DEVICES_AVAILABLE") return null
  const noDevices = castState === "NO_DEVICES_AVAILABLE";

  const isConnected = castState === "CONNECTED";
  const isConnecting = castState === "CONNECTING";

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isConnecting}
        className={cn(
          "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all hover:bg-accent disabled:opacity-50",
          isConnected && "text-primary",
          noDevices && "opacity-50 cursor-not-allowed",
          className,
        )}
        aria-label={
          isConnected ? "Disconnect from Chromecast" : noDevices ? "No Chromecast devices found" : "Cast to device"
        }
        title={noDevices ? "No Chromecast devices available" : ""}
      >
        <Cast className={cn("h-5 w-5", isConnected && "fill-current", isConnecting && "animate-pulse")} />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-md shadow-lg whitespace-nowrap z-50 border">
          {isConnected
            ? `Casting to ${chromecastManager.getCurrentDevice()?.friendlyName || "device"}`
            : isConnecting
              ? "Connecting..."
              : noDevices
                ? "No Chromecast devices found"
                : "Cast to TV"}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
        </div>
      )}
    </div>
  );
}
