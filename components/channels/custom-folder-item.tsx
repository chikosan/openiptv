"use client";

import { useState } from "react";
import { Folder, ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { CustomFolder } from "@/lib/store/custom-folders-store";
import { usePlaylistStore } from "@/lib/store/playlist-store";
import { ChannelItem } from "./channel-item";
import { cn } from "@/lib/utils";

interface CustomFolderItemProps {
  folder: CustomFolder;
  viewMode: "grid" | "list";
  currentChannelId?: string;
  onRename: (folderId: string) => void;
  onDelete: (folderId: string) => void;
}

export function CustomFolderItem({ folder, viewMode, currentChannelId, onRename, onDelete }: CustomFolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const { getVisibleChannels } = usePlaylistStore();

  const allChannels = getVisibleChannels();
  const folderChannels = allChannels.filter((ch) => folder.channelIds.includes(ch.id));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const channelId = e.dataTransfer.getData("channelId");
    if (channelId && !folder.channelIds.includes(channelId)) {
      const { addChannelToFolder } = require("@/lib/store/custom-folders-store").useCustomFoldersStore.getState();
      addChannelToFolder(folder.id, channelId);
      window.dispatchEvent(new CustomEvent("channelDeleted")); // Trigger refresh
    }
  };

  return (
    <div className="mb-2">
      {/* Folder Header */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all group",
          isDragOver ? "bg-primary/20 border-2 border-primary border-dashed" : "hover:bg-accent",
        )}
      >
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 flex-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}

          <Folder className="h-5 w-5" style={{ color: folder.color }} />

          <div className="flex-1 min-w-0 text-left flex items-baseline gap-2">
            <span className="font-semibold truncate">{folder.name}</span>
            <span className="text-sm text-muted-foreground flex-shrink-0">({folderChannels.length})</span>
          </div>
        </button>

        {/* Actions - always visible on touch, hover-revealed on desktop */}
        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onRename(folder.id)}
            className="p-1.5 rounded hover:bg-background"
            title="Rename folder"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(folder.id)}
            className="p-1.5 rounded hover:bg-destructive/10"
            title="Delete folder"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Folder Content */}
      {isExpanded && folderChannels.length > 0 && (
        <div className="mt-1 ml-2 sm:ml-6 pl-2 border-l-2 border-border">
          <div className={cn(viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" : "space-y-1")}>
            {folderChannels.map((channel) => (
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

      {/* Empty state */}
      {isExpanded && folderChannels.length === 0 && (
        <div className="ml-8 mt-2 text-sm text-muted-foreground italic">
          Drop channels here or right-click a channel to move it
        </div>
      )}
    </div>
  );
}
