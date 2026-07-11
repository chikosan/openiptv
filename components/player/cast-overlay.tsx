"use client";

import { Cast, Volume2 } from "lucide-react";
import { Channel } from "@/lib/types";
import Image from "next/image";

interface CastOverlayProps {
  channel: Channel;
  deviceName: string;
}

export function CastOverlay({ channel, deviceName }: CastOverlayProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        {/* Channel Logo */}
        {channel.logo && (
          <div className="mb-6 flex justify-center">
            <div className="relative w-32 h-24 rounded-lg overflow-hidden border-2 border-primary/30">
              <Image src={channel.logo} alt={channel.name} fill sizes="128px" className="object-cover" unoptimized />
            </div>
          </div>
        )}

        {/* Cast Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
            <Cast className="relative h-16 w-16 text-primary fill-current" />
          </div>
        </div>

        {/* Status */}
        <h3 className="text-2xl font-bold mb-2">Casting to TV</h3>
        <p className="text-muted-foreground mb-4">{channel.name}</p>

        {/* Device Name */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>{deviceName}</span>
        </div>

        {/* Control Hint */}
        <p className="mt-6 text-sm text-muted-foreground">Use your phone to control playback</p>
      </div>
    </div>
  );
}
