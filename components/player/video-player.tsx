"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Channel } from "@/lib/types"
import videojs from "video.js"
import Hls, { type Level } from "hls.js"

type QualityLevel = { height: number; enabled: boolean }
type VjsPlayer = ReturnType<typeof videojs> & {
  qualityLevels?: () => QualityLevel[] & { length: number }
}
import "video.js/dist/video-js.css"
import { chromecastManager } from "@/lib/chromecast"
import { CastButton } from "./cast-button"
import { CastOverlay } from "./cast-overlay"
import { PipButton } from "./pip-button"
import { QualitySelector } from "./quality-selector"
import { RecordButton } from "./record-button"
import { ChannelInfoOverlay } from "./channel-info-overlay"
import { useWatchHistoryStore } from "@/lib/store/watch-history-store"
import { usePreferencesStore } from "@/lib/store/preferences-store"
import { Volume2, VolumeX } from "lucide-react"

interface VideoPlayerProps {
  channel: Channel
  streamUrl?: string | null // Override URL for catchup playback
  onNextChannel?: () => void
  onPrevChannel?: () => void
}

export function VideoPlayer({ channel, streamUrl, onNextChannel, onPrevChannel }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<VjsPlayer | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const watchTimeRef = useRef<number>(0)
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCasting, setIsCasting] = useState(false)
  const [qualityLevels, setQualityLevels] = useState<Level[]>([])
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)
  const [showChannelInfo, setShowChannelInfo] = useState(true)
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false)
  const [currentVolume, setCurrentVolume] = useState(1)

  // Stores
  const { addToHistory, updateWatchTime } = useWatchHistoryStore()
  const { player: playerPrefs, setVolume, setMuted } = usePreferencesStore()

  // Use streamUrl if provided (for catchup), otherwise use channel URL
  const currentStreamUrl = streamUrl || channel.url
  const isCatchupMode = !!streamUrl

  // Track watch time
  useEffect(() => {
    if (!channel) return

    // Add to history when channel starts
    addToHistory(channel)
    watchTimeRef.current = 0

    // Track watch time every 10 seconds
    watchIntervalRef.current = setInterval(() => {
      watchTimeRef.current += 10
      updateWatchTime(channel.id, 10)
    }, 10000)

    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current)
      }
    }
  }, [channel, addToHistory, updateWatchTime])

  // Apply saved volume preference
  useEffect(() => {
    const videoElement = videoElementRef.current
    if (videoElement) {
      videoElement.volume = playerPrefs.volume
      videoElement.muted = playerPrefs.muted
      setCurrentVolume(playerPrefs.volume)
    }
  }, [playerPrefs.volume, playerPrefs.muted])

  // Volume indicator
  const showVolumeChange = useCallback((volume: number) => {
    setCurrentVolume(volume)
    setShowVolumeIndicator(true)
    setTimeout(() => setShowVolumeIndicator(false), 1500)
  }, [])

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js")
      videoElement.classList.add("vjs-big-play-centered")
      videoRef.current.appendChild(videoElement)

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
          console.log("Video.js player initialized with hls.js support")
          videoElementRef.current = player.el().querySelector("video")
        }
      ))

      // Error handling
      player.on("error", () => {
        const error = player.error()
        if (error) {
          console.error("Video.js error:", error)
          setError(`Failed to load stream: ${error.message || "Unknown error"}`)
          setIsLoading(false)
        }
      })

      // Loading events
      player.on("loadstart", () => {
        setIsLoading(true)
        setError("")
      })

      player.on("canplay", () => {
        setIsLoading(false)
      })

      player.on("playing", () => {
        setIsLoading(false)
      })

      player.on("waiting", () => {
        setIsLoading(true)
      })
    }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    const videoElement = videoElementRef.current

    if (!player || !videoElement || !channel) return

    setError("")
    setIsLoading(true)
    setNeedsUserInteraction(false)

    // If casting, load on Chromecast instead
    if (isCasting) {
      chromecastManager.loadMedia(
        currentStreamUrl,
        channel.name,
        channel.logo
      ).catch((err) => {
        console.error("Failed to load on Chromecast:", err)
        setError("Failed to cast stream")
        setIsLoading(false)
      })
      return
    }

    // Clean up previous hls.js instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
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
      })

      hlsRef.current = hls

      // Event handlers
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log("HLS manifest loaded, found " + data.levels.length + " quality levels")
        setQualityLevels(data.levels)
        
        // Start playback with muted fallback for autoplay restrictions
        videoElement.play().catch((err) => {
          console.warn("Autoplay failed, trying muted:", err)
          // Try muted autoplay (usually allowed)
          videoElement.muted = true
          videoElement.play().catch((err2) => {
            console.warn("Muted autoplay also failed:", err2)
            setNeedsUserInteraction(true)
            setIsLoading(false)
          })
        })
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log("Quality level switched to: " + data.level)
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.js error:", data)
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("Fatal network error, trying to recover...")
              setError("Network error. Retrying...")
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("Fatal media error, trying to recover...")
              setError("Media error. Attempting recovery...")
              hls.recoverMediaError()
              break
            default:
              console.error("Fatal error, cannot recover")
              setError(`Playback failed: ${data.details}`)
              setIsLoading(false)
              hls.destroy()
              break
          }
        }
      })

      // Load source
      hls.loadSource(currentStreamUrl)
      hls.attachMedia(videoElement)
    } 
    // Native HLS support (Safari)
    else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("Using native HLS support (Safari)")
      videoElement.src = currentStreamUrl
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement.play().catch((err) => {
          console.error("Autoplay failed:", err)
          setIsLoading(false)
        })
      })
    } 
    // Fallback to Video.js (shouldn't happen, but just in case)
    else {
      console.warn("No HLS support detected, falling back to Video.js")
      player.src({
        src: currentStreamUrl,
        type: "application/x-mpegURL",
      })
      player.load()
      player.play()?.catch((err: Error) => {
        console.error("Autoplay failed:", err)
        setIsLoading(false)
      })
    }

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [channel, currentStreamUrl, isCasting])

  const handleCastStateChange = (isConnected: boolean) => {
    setIsCasting(isConnected)
    
    if (isConnected) {
      // Pause local player when casting starts
      if (playerRef.current && !playerRef.current.paused()) {
        playerRef.current.pause()
      }
      // Load current channel on Chromecast
      chromecastManager.loadMedia(
        currentStreamUrl,
        channel.name,
        channel.logo
      ).catch(console.error)
    } else {
      // Resume local playback when casting ends
      if (playerRef.current) {
        playerRef.current.play()?.catch(console.error)
      }
    }
  }

  // Dispose the Video.js player and hls.js when the component unmounts
  useEffect(() => {
    const player = playerRef.current

    return () => {
      // Clean up hls.js
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      
      // Clean up Video.js player
      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full bg-black group">
      <div ref={videoRef} className="w-full h-full" />

      {/* Channel Info Overlay (Netflix-style) */}
      <ChannelInfoOverlay
        channel={channel}
        isVisible={showChannelInfo}
        onHide={() => setShowChannelInfo(false)}
      />

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

      {/* Player Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <RecordButton channel={channel} videoElement={videoElementRef.current} />
        <QualitySelector player={playerRef.current} />
        <PipButton videoElement={videoElementRef.current} />
        <CastButton onCastStateChange={handleCastStateChange} />
      </div>

      {/* Cast Overlay */}
      {isCasting && (
        <CastOverlay 
          channel={channel} 
          deviceName={chromecastManager.getCurrentDevice()?.friendlyName || "TV"}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && !error && !isCasting && !needsUserInteraction && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-2" />
            <p className="text-sm text-white">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Autoplay Blocked Overlay */}
      {needsUserInteraction && !error && !isCasting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <button
            onClick={() => {
              const videoElement = videoElementRef.current
              if (videoElement) {
                videoElement.muted = false
                videoElement.play().then(() => {
                  setNeedsUserInteraction(false)
                }).catch(console.error)
              }
            }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl bg-primary/20 hover:bg-primary/30 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
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
                setError("")
                setIsLoading(true)
                
                // Retry with hls.js
                if (hlsRef.current) {
                  hlsRef.current.destroy()
                  hlsRef.current = null
                }
                
                const videoElement = videoElementRef.current
                if (videoElement && Hls.isSupported()) {
                  const hls = new Hls({
                    enableWorker: true,
                    startLevel: -1,
                  })
                  hlsRef.current = hls
                  hls.loadSource(currentStreamUrl)
                  hls.attachMedia(videoElement)
                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoElement.play().catch(console.error)
                  })
                  hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                      setError(`Retry failed: ${data.details}`)
                      setIsLoading(false)
                    }
                  })
                } else if (videoElement) {
                  videoElement.src = currentStreamUrl
                  videoElement.play().catch(console.error)
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
  )
}
