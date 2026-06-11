"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Channel } from "@/lib/types";
import videojs from "video.js";
import Hls, { type Level } from "hls.js";

type QualityLevel = { height: number; enabled: boolean };
type VjsPlayer = ReturnType<typeof videojs> & {
  qualityLevels?: () => QualityLevel[] & { length: number };
};
import "video.js/dist/video-js.css";
import { chromecastManager } from "@/lib/chromecast";
import { CastButton } from "./cast-button";
import { CastOverlay } from "./cast-overlay";
import { PipButton } from "./pip-button";
import { QualitySelector } from "./quality-selector";
import { RecordButton } from "./record-button";
import { ChannelInfoOverlay } from "./channel-info-overlay";
import { useWatchHistoryStore } from "@/lib/store/watch-history-store";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { useTVMode } from "@/lib/hooks/use-tv-mode";
import { OrientationLockButton } from "./orientation-lock-button";
import { SleepTimerButton } from "./sleep-timer-button";
import { TrackSelector } from "./track-selector";
import { StreamInfoOverlay } from "./stream-info-overlay";
import { useToast } from "@/components/ui/toast";
import { acquireWakeLock, releaseWakeLock } from "@/lib/wake-lock";
import { Volume2, VolumeX, Activity } from "lucide-react";
import { cn, vibrate } from "@/lib/utils";

interface VideoPlayerProps {
  channel: Channel;
  streamUrl?: string | null; // Override URL for catchup playback
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
}

export function VideoPlayer({ channel, streamUrl, onNextChannel, onPrevChannel }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VjsPlayer | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const watchTimeRef = useRef<number>(0);
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [error, setError] = useState<string>("");
  const [playerReady, setPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCasting, setIsCasting] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<Level[]>([]);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(true);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsOverlayRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTapRef = useRef(0);
  const toast = useToast();
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [bufferingSeconds, setBufferingSeconds] = useState(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stores
  const { addToHistory, updateWatchTime } = useWatchHistoryStore();
  const { player: playerPrefs, setVolume, setMuted } = usePreferencesStore();
  const isTVMode = useTVMode();

  // Use streamUrl if provided (for catchup), otherwise use channel URL
  const currentStreamUrl = streamUrl || channel.url;
  const isCatchupMode = !!streamUrl;

  // Track watch time
  useEffect(() => {
    if (!channel) return;

    // Add to history when channel starts
    addToHistory(channel);
    watchTimeRef.current = 0;

    // Track watch time every 10 seconds
    watchIntervalRef.current = setInterval(() => {
      watchTimeRef.current += 10;
      updateWatchTime(channel.id, 10);
    }, 10000);

    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
  }, [channel, addToHistory, updateWatchTime]);

  // Apply saved volume preference
  useEffect(() => {
    const videoElement = videoElementRef.current;
    if (videoElement) {
      videoElement.volume = playerPrefs.volume;
      videoElement.muted = playerPrefs.muted;
      setCurrentVolume(playerPrefs.volume);
    }
  }, [playerPrefs.volume, playerPrefs.muted]);

  // Volume indicator
  const showVolumeChange = useCallback((volume: number) => {
    setCurrentVolume(volume);
    setShowVolumeIndicator(true);
    setTimeout(() => setShowVolumeIndicator(false), 1500);
  }, []);

  // Reveal player controls (tap/keypress) and auto-hide after 4s of inactivity
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // Show the channel banner on every channel change (TV zapping feedback)
  useEffect(() => {
    setShowChannelInfo(true);
  }, [channel.id]);

  // Touch gestures: vertical swipe zaps channels; double-tap seeks (catchup)
  // or toggles play/pause (center)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dt = Date.now() - start.t;

      // Vertical swipe: channel zapping
      if (dt < 600 && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 2) {
        vibrate(10);
        if (dy < 0) {
          onNextChannel?.();
        } else {
          onPrevChannel?.();
        }
        return;
      }

      // Tap (no drag): double-tap detection
      if (dt < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const now = Date.now();
        if (now - lastTapRef.current < 350) {
          lastTapRef.current = 0;
          const video = videoElementRef.current;
          if (!video) return;
          const width = rootRef.current?.clientWidth ?? window.innerWidth;
          const zone = t.clientX < width / 3 ? "back" : t.clientX > (2 * width) / 3 ? "fwd" : "center";
          if (zone === "center") {
            if (video.paused) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
            return;
          }
          // Seeking only makes sense for finite (catchup/recording) streams
          if (isCatchupMode || (Number.isFinite(video.duration) && video.duration > 0)) {
            video.currentTime = Math.max(0, video.currentTime + (zone === "fwd" ? 10 : -10));
            vibrate(10);
          } else {
            toast.info("Live stream — seeking unavailable");
          }
        } else {
          lastTapRef.current = now;
        }
      }
    },
    [onNextChannel, onPrevChannel, isCatchupMode, toast],
  );

  // Auto-fullscreen when a touch device rotates to landscape while playing
  useEffect(() => {
    if (typeof screen === "undefined" || !screen.orientation) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const orientation = screen.orientation;

    const onChange = () => {
      const landscape = orientation.type.startsWith("landscape");
      if (landscape && !document.fullscreenElement) {
        rootRef.current?.requestFullscreen?.().catch(() => {});
      } else if (!landscape && document.fullscreenElement === rootRef.current) {
        document.exitFullscreen().catch(() => {});
      }
    };

    orientation.addEventListener("change", onChange);
    return () => orientation.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered");
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(
        videoElement,
        {
          controls: true,
          responsive: true,
          fluid: true,
          autoplay: true,
          preload: "auto",
          liveui: true,
        },
        () => {
          console.log("Video.js player initialized with hls.js support");
          videoElementRef.current = player.el().querySelector("video");
          setPlayerReady(true);
        },
      ));

      // Error handling
      player.on("error", () => {
        const error = player.error();
        if (error) {
          console.error("Video.js error:", error);
          setError(`Failed to load stream: ${error.message || "Unknown error"}`);
          setIsLoading(false);
        }
      });

      // Loading events
      player.on("loadstart", () => {
        setIsLoading(true);
        setError("");
      });

      player.on("canplay", () => {
        setIsLoading(false);
      });

      player.on("playing", () => {
        setIsLoading(false);
        acquireWakeLock();
      });

      player.on("waiting", () => {
        setIsLoading(true);
      });

      player.on("pause", () => {
        releaseWakeLock();
      });
    }
  }, []);

  // Release the wake lock when leaving the player entirely
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  // Count how long we've been buffering (shown after a couple of seconds)
  useEffect(() => {
    if (!isLoading) {
      setBufferingSeconds(0);
      return;
    }
    const interval = setInterval(() => setBufferingSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const player = playerRef.current;
    const videoElement = videoElementRef.current;

    // playerReady guards a race: Video.js sets videoElementRef asynchronously,
    // and without it the first channel never attaches a source
    if (!playerReady || !player || !videoElement || !channel) return;

    setError("");
    setIsLoading(true);
    setNeedsUserInteraction(false);

    // If casting, load on Chromecast instead
    if (isCasting) {
      chromecastManager.loadMedia(currentStreamUrl, channel.name, channel.logo).catch((err) => {
        console.error("Failed to load on Chromecast:", err);
        setError("Failed to cast stream");
        setIsLoading(false);
      });
      return;
    }

    // Clean up previous hls.js instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Use hls.js for HLS streams (non-Safari browsers)
    if (Hls.isSupported()) {
      const hls = new Hls({
        // Optimized for IPTV live streaming with performance improvements
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferHole: 0.5,
        maxFragLookUpTolerance: 0.25,
        // More tolerant timeouts for slow streams
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 500,
        fragLoadingTimeOut: 30000, // Increased for slow streams
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 500,
        startLevel: -1,
        debug: false,
        // ABR optimizations - start with lower quality for faster start
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.7,
        // Progressive loading for better experience on slow connections
        progressive: true,
        // Faster zapping: prefetch the first fragment while parsing the manifest,
        // and don't fetch quality levels larger than the player surface
        startFragPrefetch: true,
        capLevelToPlayerSize: true,
      });

      hlsRef.current = hls;
      setHlsInstance(hls);
      setReconnectAttempt(0);
      let networkRetries = 0;
      let mediaRetries = 0;

      // Event handlers
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log("HLS manifest loaded, found " + data.levels.length + " quality levels");
        setQualityLevels(data.levels);

        // Start playback with muted fallback for autoplay restrictions
        videoElement.play().catch((err) => {
          console.warn("Autoplay failed, trying muted:", err);
          // Try muted autoplay (usually allowed)
          videoElement.muted = true;
          videoElement.play().catch((err2) => {
            console.warn("Muted autoplay also failed:", err2);
            setNeedsUserInteraction(true);
            setIsLoading(false);
          });
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log("Quality level switched to: " + data.level);
      });

      // Reset retry counters once data flows again
      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (networkRetries > 0 || mediaRetries > 0) {
          networkRetries = 0;
          mediaRetries = 0;
          setReconnectAttempt(0);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.js error:", data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Exponential backoff: 1s, 2s, 4s — then surface a manual Retry
              if (networkRetries < 3) {
                const delay = 1000 * Math.pow(2, networkRetries);
                networkRetries += 1;
                setReconnectAttempt(networkRetries);
                setError("");
                if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
                retryTimerRef.current = setTimeout(() => {
                  if (hlsRef.current === hls) hls.startLoad();
                }, delay);
              } else {
                setReconnectAttempt(0);
                setError("Network error — stream unreachable");
                setIsLoading(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetries < 2) {
                mediaRetries += 1;
                setError("");
                hls.recoverMediaError();
              } else {
                setError(`Playback failed: ${data.details}`);
                setIsLoading(false);
              }
              break;
            default:
              console.error("Fatal error, cannot recover");
              setError(`Playback failed: ${data.details}`);
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });

      // Load source
      hls.loadSource(currentStreamUrl);
      hls.attachMedia(videoElement);
    }
    // Native HLS support (Safari)
    else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("Using native HLS support (Safari)");
      videoElement.src = currentStreamUrl;
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement.play().catch((err) => {
          console.error("Autoplay failed:", err);
          setIsLoading(false);
        });
      });
    }
    // Fallback to Video.js (shouldn't happen, but just in case)
    else {
      console.warn("No HLS support detected, falling back to Video.js");
      player.src({
        src: currentStreamUrl,
        type: "application/x-mpegURL",
      });
      player.load();
      player.play()?.catch((err: Error) => {
        console.error("Autoplay failed:", err);
        setIsLoading(false);
      });
    }

    // Cleanup function
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setHlsInstance(null);
      setReconnectAttempt(0);
    };
  }, [channel, currentStreamUrl, isCasting, playerReady]);

  const handleCastStateChange = (isConnected: boolean) => {
    setIsCasting(isConnected);

    if (isConnected) {
      // Pause local player when casting starts
      if (playerRef.current && !playerRef.current.paused()) {
        playerRef.current.pause();
      }
      // Load current channel on Chromecast
      chromecastManager.loadMedia(currentStreamUrl, channel.name, channel.logo).catch(console.error);
    } else {
      // Resume local playback when casting ends
      if (playerRef.current) {
        playerRef.current.play()?.catch(console.error);
      }
    }
  };

  // Dispose the Video.js player and hls.js when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      // Clean up hls.js
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Clean up Video.js player
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // D-pad navigation for Android TV / TV mode:
  // - roving Left/Right focus across the player control buttons
  // - volume Up/Down and Enter play/pause only when no interactive element has focus
  useEffect(() => {
    if (!isTVMode) return;

    const handleTVKeyDown = (e: KeyboardEvent) => {
      const video = videoElementRef.current;
      if (!video) return;

      // When a player control button is focused: Left/Right roam, Down returns to list
      const overlay = controlsOverlayRef.current;
      const controls = overlay ? Array.from(overlay.querySelectorAll<HTMLElement>("button")) : [];
      const focusedIdx = controls.indexOf(document.activeElement as HTMLElement);
      if (focusedIdx >= 0) {
        revealControls();
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const next =
            e.key === "ArrowRight" ? Math.min(controls.length - 1, focusedIdx + 1) : Math.max(0, focusedIdx - 1);
          controls[next]?.focus();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          document.querySelector<HTMLElement>('[data-channel-list] [tabindex="0"]')?.focus();
        }
        return; // Enter activates the focused control natively
      }

      // Don't steal keys from the channel list, inputs, or other buttons
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, [role="button"], [data-channel-list]')) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          showVolumeChange(video.volume);
          setVolume(video.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          showVolumeChange(video.volume);
          setVolume(video.volume);
          break;
        case "ArrowLeft":
        case "ArrowRight":
          // Enter the player controls from the video surface
          e.preventDefault();
          revealControls();
          controls[0]?.focus();
          break;
        case "Enter":
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleTVKeyDown);
    return () => window.removeEventListener("keydown", handleTVKeyDown);
  }, [isTVMode, showVolumeChange, setVolume, revealControls]);

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full bg-black group"
      onPointerDown={revealControls}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={videoRef} className="w-full h-full" />

      {/* Channel Info Overlay (Netflix-style) */}
      <ChannelInfoOverlay channel={channel} isVisible={showChannelInfo} onHide={() => setShowChannelInfo(false)} />

      {/* Volume Indicator (Netflix-style) */}
      {showVolumeIndicator && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-black/80 backdrop-blur-sm">
            {playerPrefs.muted || currentVolume === 0 ? (
              <VolumeX className="h-8 w-8 text-white" />
            ) : (
              <Volume2 className="h-8 w-8 text-white" />
            )}
            <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-150"
                style={{ width: `${(playerPrefs.muted ? 0 : currentVolume) * 100}%` }}
              />
            </div>
            <span className="text-xs text-white/80">
              {playerPrefs.muted ? "Muted" : `${Math.round(currentVolume * 100)}%`}
            </span>
          </div>
        </div>
      )}

      {/* Player Controls Overlay - revealed by hover, tap, focus, or TV d-pad */}
      <div
        ref={controlsOverlayRef}
        className={cn(
          "absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full p-1 transition-opacity",
          controlsVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
        )}
      >
        <RecordButton channel={channel} videoElement={videoElementRef.current} />
        <QualitySelector player={playerRef.current} />
        <TrackSelector hls={hlsInstance} />
        <SleepTimerButton videoElement={videoElementRef.current} />
        <OrientationLockButton />
        <PipButton videoElement={videoElementRef.current} />
        <CastButton onCastStateChange={handleCastStateChange} />
        <button
          onClick={() => setShowStats((s) => !s)}
          className={cn(
            "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all hover:bg-accent",
            showStats && "bg-accent",
          )}
          title="Stream statistics"
        >
          <Activity className="h-5 w-5" />
        </button>
      </div>

      {/* Cast Overlay */}
      {isCasting && (
        <CastOverlay channel={channel} deviceName={chromecastManager.getCurrentDevice()?.friendlyName || "TV"} />
      )}

      {/* Stream statistics */}
      <StreamInfoOverlay
        hls={hlsInstance}
        videoElement={videoElementRef.current}
        isVisible={showStats}
        onClose={() => setShowStats(false)}
      />

      {/* Loading / Reconnecting Overlay */}
      {(isLoading || reconnectAttempt > 0) && !error && !isCasting && !needsUserInteraction && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-2" />
            <p className="text-sm text-white">
              {reconnectAttempt > 0 ? `Reconnecting… (attempt ${reconnectAttempt}/3)` : "Loading stream..."}
            </p>
            {bufferingSeconds > 2 && reconnectAttempt === 0 && (
              <p className="text-xs text-white/60 mt-1">buffering for {bufferingSeconds}s</p>
            )}
          </div>
        </div>
      )}

      {/* Autoplay Blocked Overlay */}
      {needsUserInteraction && !error && !isCasting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <button
            onClick={() => {
              const videoElement = videoElementRef.current;
              if (videoElement) {
                videoElement.muted = false;
                videoElement
                  .play()
                  .then(() => {
                    setNeedsUserInteraction(false);
                  })
                  .catch(console.error);
              }
            }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl bg-primary/20 hover:bg-primary/30 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-white font-medium">Click to Play</span>
          </button>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isCasting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center max-w-md p-6">
            <div className="text-destructive mb-2">⚠️</div>
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={() => {
                setError("");
                setIsLoading(true);

                // Retry with hls.js
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                  hlsRef.current = null;
                }

                const videoElement = videoElementRef.current;
                if (videoElement && Hls.isSupported()) {
                  const hls = new Hls({
                    enableWorker: true,
                    startLevel: -1,
                  });
                  hlsRef.current = hls;
                  hls.loadSource(currentStreamUrl);
                  hls.attachMedia(videoElement);
                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoElement.play().catch(console.error);
                  });
                  hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                      setError(`Retry failed: ${data.details}`);
                      setIsLoading(false);
                    }
                  });
                } else if (videoElement) {
                  videoElement.src = currentStreamUrl;
                  videoElement.play().catch(console.error);
                }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
