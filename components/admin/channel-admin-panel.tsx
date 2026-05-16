"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Trash2, RotateCcw, FolderMinus, Eye, EyeOff, AlertTriangle, Folders } from "lucide-react"
import { FoldersManager } from "@/components/settings/folders-manager"
import { usePlaylistStore } from "@/lib/store/playlist-store"
import { useChannelManagementStore } from "@/lib/store/channel-management-store"
import { groupChannelsByCountry, sortCountries } from "@/lib/country-detector"
import { Channel } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ChannelAdminPanel() {
  const [activeSection, setActiveSection] = useState<"manage" | "folders" | "trash">("manage")
  const { getVisibleChannels } = usePlaylistStore()
  const {
    deleteChannel,
    deleteCountryChannels,
    restoreChannel,
    restoreAll,
    emptyTrash,
    permanentlyDeleteChannel,
    getDeletedChannels,
    hideChannel,
    showChannel,
    isChannelHidden,
  } = useChannelManagementStore()

  const allChannels = getVisibleChannels()
  const deletedChannels = getDeletedChannels()

  // Group channels by country
  const groupedChannels = useMemo(() => {
    const grouped = groupChannelsByCountry(allChannels)
    return sortCountries(grouped, ["IL", "US", "UK"])
  }, [allChannels])

  const handleDeleteChannel = (channel: Channel) => {
    if (confirm(`Delete "${channel.name}"? You can restore it from trash.`)) {
      deleteChannel(channel)
    }
  }

  const handleDeleteCountry = (countryCode: string, countryName: string, channels: Channel[]) => {
    if (
      confirm(
        `Delete all ${channels.length} channels from "${countryName}"?\n\nYou can restore them from trash.`
      )
    ) {
      deleteCountryChannels(countryCode, channels)
    }
  }

  const handleRestoreChannel = (channelId: string) => {
    restoreChannel(channelId)
  }

  const handlePermanentDelete = (channelId: string, channelName: string) => {
    if (
      confirm(
        `Permanently delete "${channelName}"?\n\n⚠️ This cannot be undone!`
      )
    ) {
      permanentlyDeleteChannel(channelId)
    }
  }

  const handleRestoreAll = () => {
    if (confirm(`Restore all ${deletedChannels.length} channels?`)) {
      restoreAll()
    }
  }

  const handleEmptyTrash = () => {
    if (
      confirm(
        `⚠️ Permanently delete all ${deletedChannels.length} channels from trash?\n\nThis cannot be undone!`
      )
    ) {
      emptyTrash()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-semibold mb-2">Manage Your Channels</h3>
        <p className="text-sm text-muted-foreground">
          Remove unwanted channels or entire country folders. Deleted channels can be restored from trash.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveSection("manage")}
          className={cn(
            "px-4 py-2 font-medium transition-colors relative",
            activeSection === "manage"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Manage Channels
          {activeSection === "manage" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveSection("trash")}
          className={cn(
            "px-4 py-2 font-medium transition-colors relative",
            activeSection === "trash"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Trash ({deletedChannels.length})
          {activeSection === "trash" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Content */}
      {activeSection === "folders" ? (
        <FoldersManager />
      ) : activeSection === "manage" ? (
        <div className="space-y-4">
          {/* Country Folders */}
          {groupedChannels.map((group) => {
            const visibleChannels = group.channels.filter((ch) => !isChannelHidden(ch.id))
            
            if (visibleChannels.length === 0) return null

            return (
              <div key={group.country.code} className="border rounded-lg overflow-hidden">
                {/* Country Header */}
                <div className="flex items-center justify-between p-4 bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{group.country.flag}</span>
                    <div>
                      <p className="font-semibold">{group.country.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {visibleChannels.length} channels
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleDeleteCountry(
                        group.country.code,
                        group.country.name,
                        visibleChannels
                      )
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <FolderMinus className="h-4 w-4" />
                    Delete Folder
                  </button>
                </div>

                {/* Channels */}
                <div className="divide-y">
                  {visibleChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {channel.logo && (
                          <Image
                            src={channel.logo}
                            alt={channel.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{channel.name}</p>
                          {channel.group && (
                            <p className="text-xs text-muted-foreground truncate">
                              {channel.group}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteChannel(channel)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {groupedChannels.every((g) => g.channels.every((ch) => isChannelHidden(ch.id))) && (
            <div className="text-center p-8 text-muted-foreground">
              <p>All channels deleted</p>
              <p className="text-sm mt-1">Check trash to restore channels</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trash Actions */}
          {deletedChannels.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleRestoreAll}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Restore All
              </button>
              <button
                onClick={handleEmptyTrash}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm"
              >
                <AlertTriangle className="h-4 w-4" />
                Empty Trash
              </button>
            </div>
          )}

          {/* Deleted Channels List */}
          {deletedChannels.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Trash is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {channel.logo && (
                      <Image
                        src={channel.logo}
                        alt={channel.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded object-cover opacity-50"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Deleted {new Date(channel.deletedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreChannel(channel.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(channel.id, channel.name)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div className="space-y-1 text-yellow-900 dark:text-yellow-200">
            <p className="font-medium">Important Notes:</p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>Deleted channels are moved to trash and can be restored</li>
              <li>Deleting a folder deletes all channels in that country</li>
              <li>Empty trash to permanently delete (cannot be undone)</li>
              <li>Hidden channels don&apos;t appear in the channel list</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
