"use client"

import { useState, useEffect } from "react"
import { Info, X, Wifi, Zap, Monitor, Volume2 } from "lucide-react"
import Hls from "hls.js"

interface StreamInfo {
  resolution: string
  bitrate: string
  codec: string
  fps: string
  buffered: string
  latency: string
  dropped: number
  audioTracks: number
  subtitleTracks: number
}

interface StreamInfoOverlayProps {
  hls: Hls | null
  videoElement: HTMLVideoElement | null
  isVisible: boolean
  onClose: () => void
}

export function StreamInfoOverlay({ hls, videoElement, isVisible, onClose }: StreamInfoOverlayProps) {
  const [info, setInfo] = useState<StreamInfo>({
    resolution: "-",
    bitrate: "-",
    codec: "-",
    fps: "-",
    buffered: "-",
    latency: "-",
    dropped: 0,
    audioTracks: 0,
    subtitleTracks: 0,
  })

  useEffect(() => {
    if (!isVisible || !videoElement) return

    const updateInfo = () => {
      setInfo(prev => {
        const newInfo: StreamInfo = { ...prev }

        // Resolution
        if (videoElement.videoWidth && videoElement.videoHeight) {
          newInfo.resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`
        }

        // Buffer info
        if (videoElement.buffered.length > 0) {
          const buffered = videoElement.buffered.end(videoElement.buffered.length - 1) - videoElement.currentTime
          newInfo.buffered = `${buffered.toFixed(1)}s`
        }

        // Dropped frames (if available)
        const quality = (videoElement as HTMLVideoElement & { getVideoPlaybackQuality?: () => VideoPlaybackQuality }).getVideoPlaybackQuality?.()
        if (quality) {
          newInfo.dropped = quality.droppedVideoFrames
        }

        // HLS-specific info
        if (hls) {
          const level = hls.levels[hls.currentLevel]
          if (level) {
            newInfo.bitrate = `${(level.bitrate / 1000000).toFixed(2)} Mbps`
            newInfo.codec = level.videoCodec || level.audioCodec || "-"
            if (level.frameRate) {
              newInfo.fps = `${level.frameRate} fps`
            }
          }

          // Latency
          if (hls.latency !== undefined) {
            newInfo.latency = `${hls.latency.toFixed(1)}s`
          }

          // Audio tracks
          newInfo.audioTracks = hls.audioTracks?.length || 0
          newInfo.subtitleTracks = hls.subtitleTracks?.length || 0
        }

        return newInfo
      })
    }

    updateInfo()
    const interval = setInterval(updateInfo, 1000)

    return () => clearInterval(interval)
  }, [isVisible, hls, videoElement])

  if (!isVisible) return null

  return (
    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white text-sm z-50 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span className="font-semibold">Stream Info</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-gray-400">
            <Monitor className="h-3 w-3" />
            Resolution
          </span>
          <span className="font-mono">{info.resolution}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-gray-400">
            <Zap className="h-3 w-3" />
            Bitrate
          </span>
          <span className="font-mono">{info.bitrate}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Codec</span>
          <span className="font-mono">{info.codec}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">FPS</span>
          <span className="font-mono">{info.fps}</span>
        </div>

        <div className="border-t border-white/10 my-2" />

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-gray-400">
            <Wifi className="h-3 w-3" />
            Buffered
          </span>
          <span className="font-mono">{info.buffered}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Latency</span>
          <span className="font-mono">{info.latency}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Dropped</span>
          <span className={`font-mono ${info.dropped > 0 ? "text-red-400" : ""}`}>
            {info.dropped}
          </span>
        </div>

        {(info.audioTracks > 0 || info.subtitleTracks > 0) && (
          <>
            <div className="border-t border-white/10 my-2" />
            
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-400">
                <Volume2 className="h-3 w-3" />
                Audio Tracks
              </span>
              <span className="font-mono">{info.audioTracks}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Subtitles</span>
              <span className="font-mono">{info.subtitleTracks}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
