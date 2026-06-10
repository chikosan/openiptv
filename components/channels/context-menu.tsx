"use client";

import { useEffect, useState } from "react";
import { Folder, Edit, Trash2, Move, FolderPlus } from "lucide-react";
import { Channel } from "@/lib/types";
import { useCustomFoldersStore } from "@/lib/store/custom-folders-store";
import { useChannelManagementStore } from "@/lib/store/channel-management-store";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

interface ContextMenuProps {
  channel: Channel;
  x: number;
  y: number;
  onClose: () => void;
  onRename?: () => void;
}

export function ContextMenu({ channel, x, y, onClose, onRename }: ContextMenuProps) {
  const { folders, moveChannelToFolder, getChannelFolder } = useCustomFoldersStore();
  const { deleteChannel } = useChannelManagementStore();
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);

  const currentFolder = getChannelFolder(channel.id);
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);

  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  const handleMoveToFolder = (folderId: string) => {
    moveChannelToFolder(channel.id, currentFolder?.id || null, folderId);
    onClose();
    window.dispatchEvent(new CustomEvent("channelDeleted")); // Trigger refresh
  };

  const handleRemoveFromFolder = () => {
    if (currentFolder) {
      const { removeChannelFromFolder } = useCustomFoldersStore.getState();
      removeChannelFromFolder(currentFolder.id, channel.id);
      onClose();
      window.dispatchEvent(new CustomEvent("channelDeleted"));
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete "${channel.name}"?\n\nYou can restore it from Settings → Channels → Trash`)) {
      deleteChannel({
        id: channel.id,
        name: channel.name,
        url: channel.url,
        logo: channel.logo,
        group: channel.group,
      });
      onClose();
    }
  };

  const handleRename = () => {
    onRename?.();
    onClose();
  };

  return (
    <div
      ref={trapRef}
      className="fixed z-50 min-w-48 bg-popover border rounded-lg shadow-lg py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Rename */}
      <button
        onClick={handleRename}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
      >
        <Edit className="h-4 w-4" />
        Rename
      </button>

      {/* Move to Folder */}
      <div
        className="relative"
        onMouseEnter={() => setShowFolderSubmenu(true)}
        onMouseLeave={() => setShowFolderSubmenu(false)}
      >
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left">
          <Move className="h-4 w-4" />
          Move to Folder
        </button>

        {/* Submenu */}
        {showFolderSubmenu && folders.length > 0 && (
          <div className="absolute left-full top-0 ml-1 min-w-48 bg-popover border rounded-lg shadow-lg py-1">
            {currentFolder && (
              <>
                <button
                  onClick={handleRemoveFromFolder}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                >
                  <FolderPlus className="h-4 w-4" />
                  Remove from Folder
                </button>
                <div className="border-t my-1" />
              </>
            )}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMoveToFolder(folder.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                disabled={currentFolder?.id === folder.id}
              >
                <Folder className="h-4 w-4" style={{ color: folder.color }} />
                {folder.name}
                {currentFolder?.id === folder.id && " (current)"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t my-1" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}
