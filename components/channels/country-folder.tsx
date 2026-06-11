"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Channel } from "@/lib/types";
import { CountryInfo } from "@/lib/country-detector";
import { ChannelItem } from "./channel-item";
import { cn } from "@/lib/utils";

interface CountryFolderProps {
  country: CountryInfo;
  channels: Channel[];
  viewMode: "grid" | "list";
  currentChannelId?: string;
  defaultExpanded?: boolean;
}

export function CountryFolder({
  country,
  channels,
  viewMode,
  currentChannelId,
  defaultExpanded = true,
}: CountryFolderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-2">
      {/* Folder Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" && !isExpanded) {
            e.preventDefault();
            setIsExpanded(true);
          } else if (e.key === "ArrowLeft" && isExpanded) {
            e.preventDefault();
            setIsExpanded(false);
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors group"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="text-xl">{country.flag}</span>

        <div className="flex-1 min-w-0 text-left flex items-baseline gap-2">
          <span className="font-semibold truncate">{country.name}</span>
          <span className="text-sm text-muted-foreground flex-shrink-0">({channels.length})</span>
        </div>
      </button>

      {/* Folder Content */}
      {isExpanded && (
        <div className="mt-1 ml-2 sm:ml-6 pl-2 border-l-2 border-border">
          <div className={cn(viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" : "space-y-1")}>
            {channels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                viewMode={viewMode}
                isActive={currentChannelId === channel.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
