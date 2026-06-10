"use client";

import { useEffect, lazy, Suspense, useState, useCallback } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/main-layout";
import { WelcomeScreen } from "@/components/welcome-screen";
import { ErrorBoundary } from "@/components/error-boundary";
import { usePlaylistStore } from "@/lib/store/playlist-store";
import { epgManager } from "@/lib/epg/epg-manager";
import { ContinueWatching } from "@/components/channels/continue-watching";
import { KeyboardShortcutsModal, useKeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { useTVMode } from "@/lib/hooks/use-tv-mode";
import { useRecordingsStore } from "@/lib/store/recordings-store";
import { VideoPlayerSkeleton, ChannelListSkeleton } from "@/components/ui/skeleton";
import { CatchupPanel } from "@/components/epg/catchup-panel";
import { catchupManager } from "@/lib/catchup/catchup-manager";
import { EPGProgram } from "@/lib/epg/types";

// Lazy load heavy components for better initial load performance
const VideoPlayer = lazy(() => import("@/components/player/video-player").then((m) => ({ default: m.VideoPlayer })));
const ChannelList = lazy(() => import("@/components/channels/channel-list").then((m) => ({ default: m.ChannelList })));
const ProgramInfo = lazy(() => import("@/components/epg/program-info").then((m) => ({ default: m.ProgramInfo })));

export default function Home() {
  const { playlists, currentChannel, isInitialized, initialize, getVisibleChannels, setCurrentChannel } =
    usePlaylistStore();
  const { ui, player, setViewMode, setLastChannel } = usePreferencesStore();
  const { initialize: initializeRecordings } = useRecordingsStore();
  const isTVMode = useTVMode();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCatchup, setShowCatchup] = useState(false);
  const [catchupUrl, setCatchupUrl] = useState<string | null>(null);

  useEffect(() => {
    initialize();
    initializeRecordings();
  }, [initialize, initializeRecordings]);

  // Resume last channel on startup
  useEffect(() => {
    if (isInitialized && playlists.length > 0 && !currentChannel && player.resumeLastChannel && player.lastChannelId) {
      const channels = getVisibleChannels();
      const lastChannel = channels.find((c) => c.id === player.lastChannelId);
      if (lastChannel) {
        setCurrentChannel(lastChannel);
      }
    }
  }, [
    isInitialized,
    playlists,
    currentChannel,
    player.resumeLastChannel,
    player.lastChannelId,
    getVisibleChannels,
    setCurrentChannel,
  ]);

  // Save current channel when it changes
  useEffect(() => {
    if (currentChannel) {
      setLastChannel(currentChannel.id);
    }
  }, [currentChannel, setLastChannel]);

  // Auto-focus channel list in TV mode
  useEffect(() => {
    if (!isTVMode || !isInitialized || playlists.length === 0) return;
    const timer = setTimeout(() => {
      const firstItem = document.querySelector<HTMLElement>('[data-channel-list] [tabindex="0"]');
      firstItem?.focus();
    }, 800);
    return () => clearTimeout(timer);
  }, [isTVMode, isInitialized, playlists.length]);

  // Load EPG data when channels are available
  useEffect(() => {
    if (playlists.length > 0) {
      // Load saved EPG URL from localStorage
      const savedEpgUrl = localStorage.getItem("epg_url");
      if (savedEpgUrl) {
        epgManager.setEPGSource(savedEpgUrl);
      }

      const channels = getVisibleChannels();
      const channelNames = channels.map((c) => c.name);
      epgManager.loadEPG(channelNames);
    }
  }, [playlists, getVisibleChannels]);

  // Channel navigation
  const navigateChannel = useCallback(
    (direction: "next" | "prev") => {
      const channels = getVisibleChannels();
      if (channels.length === 0) return;

      const currentIndex = currentChannel ? channels.findIndex((c) => c.id === currentChannel.id) : -1;

      let newIndex: number;
      if (direction === "next") {
        newIndex = currentIndex < channels.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : channels.length - 1;
      }

      setCurrentChannel(channels[newIndex]);
      setCatchupUrl(null); // Clear catchup when changing channels
    },
    [currentChannel, getVisibleChannels, setCurrentChannel],
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNextChannel: () => navigateChannel("next"),
    onPrevChannel: () => navigateChannel("prev"),
    onToggleView: () => setViewMode(ui.viewMode === "grid" ? "list" : "grid"),
    onShowShortcuts: () => setShowShortcuts(true),
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    },
  });

  // Handle catchup playback
  const handlePlayCatchup = useCallback((url: string, _program: EPGProgram) => {
    setCatchupUrl(url);
    setShowCatchup(false);
  }, []);

  // Clear catchup URL when switching to live
  const handleBackToLive = useCallback(() => {
    setCatchupUrl(null);
  }, []);

  const hasPlaylists = playlists.length > 0;

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasPlaylists) {
    return <WelcomeScreen />;
  }

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-none max-h-[60dvh] lg:max-h-none lg:flex-1 flex flex-col gap-2 md:gap-4 p-2 md:p-4 overflow-y-auto">
          {/* Continue Watching Section (Netflix-style) */}
          {!currentChannel && <ContinueWatching onChannelSelect={setCurrentChannel} className="flex-shrink-0" />}

          {/* Video Player */}
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0">
            {currentChannel ? (
              <ErrorBoundary>
                <Suspense fallback={<VideoPlayerSkeleton />}>
                  <VideoPlayer
                    channel={currentChannel}
                    streamUrl={catchupUrl}
                    onNextChannel={() => navigateChannel("next")}
                    onPrevChannel={() => navigateChannel("prev")}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center px-4">
                <div>
                  <p className="text-lg mb-2">Select a channel to start watching</p>
                  <p className="text-sm opacity-75">Browse channels on the right (desktop) or below (mobile)</p>
                  <p className="text-xs opacity-50 mt-4">
                    Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">?</kbd> for keyboard shortcuts
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Channel Info + EPG - Netflix Style */}
          {currentChannel && (
            <div className="grid gap-3 md:gap-4 md:grid-cols-2 flex-shrink-0 animate-fade-in-up">
              {/* Channel Info Card */}
              <div className="p-4 md:p-5 bg-gradient-to-br from-card to-card/50 rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-start gap-3">
                  {/* Channel Logo */}
                  {currentChannel.logo && (
                    <div className="w-16 h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                      <Image
                        src={currentChannel.logo}
                        alt={currentChannel.name}
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg md:text-xl font-bold leading-tight" title={currentChannel.name}>
                        {currentChannel.name}
                      </h2>
                      {/* Catchup badge */}
                      {catchupManager.hasCatchup(currentChannel) && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {catchupManager.getCatchupDays(currentChannel)}d catchup
                        </span>
                      )}
                    </div>
                    {currentChannel.group && (
                      <p className="text-xs md:text-sm text-muted-foreground mt-0.5" title={currentChannel.group}>
                        {currentChannel.group}
                      </p>
                    )}
                    {/* Catchup mode indicator */}
                    {catchupUrl && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-orange-500 font-medium">⏪ Catchup Mode</span>
                        <button onClick={handleBackToLive} className="text-xs text-primary hover:underline">
                          Back to Live
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">N</kbd>
                    <span>Next</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">P</kbd>
                    <span>Previous</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">?</kbd>
                    <span>Shortcuts</span>
                  </div>
                </div>
              </div>

              {/* EPG Info or Catchup Panel */}
              {showCatchup ? (
                <CatchupPanel
                  channel={currentChannel}
                  onPlayProgram={handlePlayCatchup}
                  onClose={() => setShowCatchup(false)}
                />
              ) : (
                <Suspense
                  fallback={
                    <div className="p-4 md:p-5 bg-card rounded-xl border flex items-center justify-center min-h-[120px]">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading program info...
                      </div>
                    </div>
                  }
                >
                  <ProgramInfo
                    channel={currentChannel}
                    compact
                    onWatchFromStart={handlePlayCatchup}
                    onShowCatchup={() => setShowCatchup(true)}
                  />
                </Suspense>
              )}
            </div>
          )}
        </div>

        {/* Channel List Sidebar - fills remaining space on mobile, fixed column on desktop */}
        <div
          data-channel-list
          className="w-full lg:w-80 xl:w-96 2xl:w-[26rem] flex-1 min-h-0 lg:flex-none lg:h-full border-t lg:border-t-0 lg:border-l pb-[env(safe-area-inset-bottom)] lg:pb-0"
        >
          <ErrorBoundary>
            <Suspense fallback={<ChannelListSkeleton count={8} viewMode={ui.viewMode} />}>
              <ChannelList />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </MainLayout>
  );
}
