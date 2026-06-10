"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, Star, Grid3x3, List, Filter, FolderTree, ListTree, FolderPlus, Edit, Trash2 } from "lucide-react";
import { usePlaylistStore } from "@/lib/store/playlist-store";
import { useChannelManagementStore } from "@/lib/store/channel-management-store";
import { useCustomFoldersStore } from "@/lib/store/custom-folders-store";
import { ChannelItem } from "./channel-item";
import { CountryFolder } from "./country-folder";
import { CustomFolderItem } from "./custom-folder-item";
import { RecordedFolder } from "./recorded-folder";
import { groupChannelsByCountry, sortCountries } from "@/lib/country-detector";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type FilterMode = "all" | "favorites";
type OrganizeMode = "flat" | "country";

export function ChannelList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [organizeMode, setOrganizeMode] = useState<OrganizeMode>("country");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { searchChannels, getVisibleChannels, getFavoriteChannels, currentChannel } = usePlaylistStore();
  const { getHiddenChannelIds } = useChannelManagementStore();
  const { folders, createFolder, renameFolder, deleteFolder, getFolders } = useCustomFoldersStore();

  const sortedFolders = getFolders();

  const listRef = useRef<HTMLDivElement>(null);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll<HTMLElement>('[tabindex="0"]'));
    const currentIdx = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (currentIdx < items.length - 1) {
          items[currentIdx + 1].focus();
          items[currentIdx + 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (currentIdx > 0) {
          items[currentIdx - 1].focus();
          items[currentIdx - 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        break;
      case "Home":
        e.preventDefault();
        if (items[0]) {
          items[0].focus();
          items[0].scrollIntoView({ block: "nearest" });
        }
        break;
      case "End":
        e.preventDefault();
        if (items[items.length - 1]) {
          items[items.length - 1].focus();
          items[items.length - 1].scrollIntoView({ block: "nearest" });
        }
        break;
    }
  }, []);

  // Get hidden channel IDs once and memoize
  const hiddenChannelIds = useMemo(() => getHiddenChannelIds(), [getHiddenChannelIds]);

  // Force refresh when hidden channels change
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener("channelDeleted", handleStorageChange);

    return () => {
      window.removeEventListener("channelDeleted", handleStorageChange);
    };
  }, []);

  // Memoize channel filtering
  // refreshKey forces recalculation when channels are modified
  const channels = useMemo(() => {
    const hiddenIds = new Set(hiddenChannelIds);

    let allChannels = [];
    if (filterMode === "favorites") {
      allChannels = getFavoriteChannels();
    } else if (searchQuery.trim()) {
      allChannels = searchChannels(searchQuery);
    } else {
      allChannels = getVisibleChannels();
    }

    // Filter out hidden/deleted channels
    return allChannels.filter((ch) => !hiddenIds.has(ch.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterMode, searchChannels, getVisibleChannels, getFavoriteChannels, hiddenChannelIds, refreshKey]);

  const favoriteCount = getFavoriteChannels().length;

  // Group channels by country if organize mode is "country"
  const organizedChannels = useMemo(() => {
    if (organizeMode === "flat" || searchQuery.trim()) {
      return { type: "flat" as const, channels };
    }

    const grouped = groupChannelsByCountry(channels);
    const sorted = sortCountries(grouped, ["IL", "US", "UK"]); // IL first!
    return { type: "country" as const, groups: sorted };
  }, [channels, organizeMode, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Channels ({channels.length})</h3>
          <div className="flex items-center gap-2">
            {/* New Folder Button */}
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="p-2 rounded hover:bg-accent transition-colors"
              title="Create new folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOrganizeMode(organizeMode === "flat" ? "country" : "flat")}
                className={cn(
                  "p-2 rounded hover:bg-accent transition-colors",
                  organizeMode === "country" && "bg-accent text-accent-foreground",
                )}
                title={organizeMode === "country" ? "Show flat list" : "Organize by country"}
              >
                {organizeMode === "country" ? <FolderTree className="h-4 w-4" /> : <ListTree className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded hover:bg-accent transition-colors",
                  viewMode === "list" && "bg-accent text-accent-foreground",
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded hover:bg-accent transition-colors",
                  viewMode === "grid" && "bg-accent text-accent-foreground",
                )}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode("all")}
            className={cn(
              "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              filterMode === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode("favorites")}
            className={cn(
              "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1",
              filterMode === "favorites" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
            )}
          >
            <Star className="h-4 w-4" />
            Favorites {favoriteCount > 0 && `(${favoriteCount})`}
          </button>
        </div>

        {/* New Folder Creation */}
        {isCreatingFolder && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim()) {
                  createFolder(newFolderName.trim());
                  setNewFolderName("");
                  setIsCreatingFolder(false);
                  window.dispatchEvent(new CustomEvent("channelDeleted"));
                }
                if (e.key === "Escape") {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    createFolder(newFolderName.trim());
                    setNewFolderName("");
                    setIsCreatingFolder(false);
                    window.dispatchEvent(new CustomEvent("channelDeleted"));
                  }
                }}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="px-3 py-1 text-sm border rounded hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel List - Independent scrolling */}
      <div
        ref={listRef}
        onKeyDown={handleListKeyDown}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 scroll-smooth min-h-0"
      >
        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
            <Filter className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">
              {filterMode === "favorites"
                ? "No favorite channels yet"
                : searchQuery
                  ? "No channels found"
                  : "No channels available"}
            </p>
          </div>
        ) : organizedChannels.type === "country" ? (
          // Country-organized view
          <div className="space-y-1">
            {/* Custom Folders First */}
            {sortedFolders.map((folder) => (
              <CustomFolderItem
                key={folder.id}
                folder={folder}
                viewMode={viewMode}
                currentChannelId={currentChannel?.id}
                onRename={(folderId) => {
                  const newName = prompt("Enter new folder name:", folder.name);
                  if (newName && newName.trim()) {
                    renameFolder(folderId, newName.trim());
                    window.dispatchEvent(new CustomEvent("channelDeleted"));
                  }
                }}
                onDelete={(folderId) => {
                  const folder = sortedFolders.find((f) => f.id === folderId);
                  if (folder && confirm(`Delete folder "${folder.name}"?\n\nChannels won't be deleted.`)) {
                    deleteFolder(folderId);
                    window.dispatchEvent(new CustomEvent("channelDeleted"));
                  }
                }}
              />
            ))}

            {/* Recorded Channels Folder */}
            <RecordedFolder viewMode={viewMode} currentChannelId={currentChannel?.id} defaultExpanded={false} />

            {/* Then Country Folders */}
            {organizedChannels.groups.map((group) => (
              <CountryFolder
                key={group.country.code}
                country={group.country}
                channels={group.channels}
                viewMode={viewMode}
                currentChannelId={currentChannel?.id}
                defaultExpanded={group.country.code === "IL"} // IL expanded by default
              />
            ))}
          </div>
        ) : (
          // Flat view
          <div className={cn(viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "space-y-1")}>
            {organizedChannels.channels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                viewMode={viewMode}
                isActive={currentChannel?.id === channel.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
