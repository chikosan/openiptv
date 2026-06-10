"use client";

import { useState, useEffect } from "react";
import {
  X,
  Download,
  Trash2,
  Plus,
  Check,
  Video,
  Tv,
  Layers,
  RefreshCw,
  Clock,
  Play,
  Palette,
  Shield,
  BarChart3,
  HardDrive,
  Settings,
} from "lucide-react";
import { usePlaylistStore } from "@/lib/store/playlist-store";
import { RecordingsPanel } from "@/components/recordings/recordings-panel";
import { EPGSettings } from "./epg-settings";
import { ChannelAdminPanel } from "@/components/admin/channel-admin-panel";
import { FoldersManager } from "./folders-manager";
import { PlayerSettings } from "./player-settings";
import { AppearanceSettings } from "./appearance-settings";
import { ParentalControls } from "./parental-controls";
import { StatisticsPanel } from "./statistics-panel";
import { BackupRestore } from "./backup-restore";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { playlists, removePlaylist, currentPlaylist, refreshPlaylist, updatePlaylistSettings } = usePlaylistStore();
  const [activeTab, setActiveTab] = useState<
    "playlists" | "player" | "appearance" | "recordings" | "epg" | "channels" | "parental" | "statistics" | "backup"
  >("playlists");
  const [newPlaylistUrl, setNewPlaylistUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<{
    playlistId: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleRefresh = async (playlistId: string) => {
    setRefreshingId(playlistId);
    setRefreshStatus(null);
    try {
      const result = await refreshPlaylist(playlistId);
      const playlist = playlists.find((p) => p.id === playlistId);
      let message = `Refreshed successfully! Total: ${result.total} channels`;
      if (result.added > 0 || result.removed > 0) {
        message += ` (${result.added} added, ${result.removed} removed)`;
      }
      setRefreshStatus({ playlistId, message, type: "success" });
      setTimeout(() => setRefreshStatus(null), 5000);
    } catch (error) {
      setRefreshStatus({
        playlistId,
        message: `Failed to refresh: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
      setTimeout(() => setRefreshStatus(null), 5000);
    } finally {
      setRefreshingId(null);
    }
  };

  const formatLastRefreshed = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Modal - full-screen sheet on phones, centered dialog on larger screens */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-0 sm:p-4">
        <div className="bg-background border rounded-none sm:rounded-lg shadow-2xl w-full h-dvh sm:h-auto sm:max-w-2xl sm:max-h-[85vh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold">Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs - Sidebar style */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-36 sm:w-48 border-r bg-muted/30 p-2 space-y-1 overflow-y-auto">
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Content</p>
              <button
                onClick={() => setActiveTab("playlists")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "playlists" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Layers className="h-4 w-4" />
                Playlists
              </button>
              <button
                onClick={() => setActiveTab("channels")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "channels" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Tv className="h-4 w-4" />
                Channels
              </button>
              <button
                onClick={() => setActiveTab("epg")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "epg" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Clock className="h-4 w-4" />
                EPG Guide
              </button>
              <button
                onClick={() => setActiveTab("recordings")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "recordings" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Video className="h-4 w-4" />
                Recordings
              </button>

              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase mt-4">Settings</p>
              <button
                onClick={() => setActiveTab("player")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "player" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Play className="h-4 w-4" />
                Player
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "appearance" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Palette className="h-4 w-4" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab("parental")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "parental" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Shield className="h-4 w-4" />
                Parental
              </button>

              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase mt-4">Data</p>
              <button
                onClick={() => setActiveTab("statistics")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "statistics" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <BarChart3 className="h-4 w-4" />
                Statistics
              </button>
              <button
                onClick={() => setActiveTab("backup")}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-lg flex items-center gap-2 transition-colors",
                  activeTab === "backup" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <HardDrive className="h-4 w-4" />
                Backup
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "recordings" && <RecordingsPanel />}

              {activeTab === "epg" && <EPGSettings />}

              {activeTab === "channels" && <ChannelAdminPanel />}

              {activeTab === "playlists" && (
                <div className="space-y-6">
                  {/* Playlist List */}
                  <div className="space-y-4">
                    <h3 className="font-semibold mb-3">Your Playlists</h3>
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="p-4 rounded-lg border hover:border-primary transition-colors space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{playlist.name}</p>
                              {currentPlaylist?.id === playlist.id && (
                                <span className="flex items-center gap-1 text-xs text-primary">
                                  <Check className="h-3 w-3" />
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {playlist.channels.length} channels
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{playlist.url}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleRefresh(playlist.id)}
                              disabled={refreshingId === playlist.id}
                              className="p-2 hover:bg-accent rounded-full transition-colors disabled:opacity-50"
                              title="Refresh playlist"
                            >
                              <RefreshCw className={cn("h-4 w-4", refreshingId === playlist.id && "animate-spin")} />
                            </button>
                            <button
                              onClick={() => {
                                const blob = new Blob([JSON.stringify(playlist, null, 2)], {
                                  type: "application/json",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${playlist.name}.json`;
                                a.click();
                              }}
                              className="p-2 hover:bg-accent rounded-full transition-colors"
                              title="Export playlist"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removePlaylist(playlist.id)}
                              className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-colors"
                              title="Delete playlist"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Status Message */}
                        {refreshStatus && refreshStatus.playlistId === playlist.id && (
                          <div
                            className={cn(
                              "text-xs p-2 rounded",
                              refreshStatus.type === "success"
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {refreshStatus.message}
                          </div>
                        )}

                        {/* Last Refreshed */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Last refreshed: {formatLastRefreshed(playlist.lastRefreshed)}
                        </div>

                        {/* Auto-Refresh Settings */}
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Auto-refresh</label>
                            <button
                              onClick={() =>
                                updatePlaylistSettings(playlist.id, {
                                  autoRefreshEnabled: !playlist.autoRefreshEnabled,
                                })
                              }
                              className={cn(
                                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                                playlist.autoRefreshEnabled ? "bg-primary" : "bg-muted",
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  playlist.autoRefreshEnabled ? "translate-x-5" : "translate-x-0.5",
                                )}
                              />
                            </button>
                          </div>
                          {playlist.autoRefreshEnabled && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground">Interval:</label>
                              <select
                                value={playlist.autoRefreshInterval || 60}
                                onChange={(e) =>
                                  updatePlaylistSettings(playlist.id, {
                                    autoRefreshInterval: parseInt(e.target.value),
                                  })
                                }
                                className="text-xs border rounded px-2 py-1 bg-background"
                              >
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>1 hour</option>
                                <option value={120}>2 hours</option>
                                <option value={360}>6 hours</option>
                                <option value={720}>12 hours</option>
                                <option value={1440}>24 hours</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Playlist Section - Coming Soon */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-3">Add New Playlist</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add additional M3U8 playlists to switch between different channel sources.
                    </p>
                    <div className="p-4 rounded-lg bg-muted/50 border-2 border-dashed">
                      <p className="text-sm text-center text-muted-foreground">
                        Multiple playlist management coming soon!
                        <br />
                        For now, delete existing playlist and add a new one from the welcome screen.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "player" && <PlayerSettings />}

              {activeTab === "appearance" && <AppearanceSettings />}

              {activeTab === "parental" && <ParentalControls />}

              {activeTab === "statistics" && <StatisticsPanel />}

              {activeTab === "backup" && <BackupRestore />}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t">
            <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-accent transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
