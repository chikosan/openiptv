"use client";

import { useState, useEffect } from "react";
import { Circle, Square } from "lucide-react";
import { Channel } from "@/lib/types";
import { streamRecorder, Recording } from "@/lib/recording/recorder";
import { useRecordingsStore } from "@/lib/store/recordings-store";
import { cn } from "@/lib/utils";

interface RecordButtonProps {
  channel: Channel;
  videoElement: HTMLVideoElement | null;
  className?: string;
}

export function RecordButton({ channel, videoElement, className }: RecordButtonProps) {
  const { refreshRecordings } = useRecordingsStore();
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [duration, setDuration] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      const recording = streamRecorder.getCurrentRecording();
      if (recording) {
        setCurrentRecording(recording);
        setDuration(streamRecorder.formatDuration(recording.duration));
        setSize(streamRecorder.formatSize(recording.size));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      const recording = streamRecorder.stopRecording();
      setIsRecording(false);
      setCurrentRecording(null);

      if (recording) {
        // Refresh recordings store to update channel badges
        setTimeout(() => refreshRecordings(), 500);
        // Show success message
        alert(
          `Recording saved!\n\nDuration: ${streamRecorder.formatDuration(recording.duration)}\nSize: ${streamRecorder.formatSize(recording.size)}\n\nGo to Settings → Recordings to download.`,
        );
      }
    } else {
      // Start recording
      if (!videoElement) {
        alert("Video player not ready");
        return;
      }

      try {
        await streamRecorder.startRecording(channel, videoElement);
        setIsRecording(true);
      } catch (error) {
        console.error("Recording failed:", error);
        alert("Failed to start recording: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleRecord}
        className={cn(
          "p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-all",
          isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "hover:bg-accent",
          className,
        )}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Circle className="h-5 w-5" />}
      </button>

      {/* Recording Status */}
      {isRecording && currentRecording && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-50 animate-pulse">
          <div className="font-bold">● REC</div>
          <div className="mt-1">{duration}</div>
          <div>{size}</div>
          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-red-500" />
        </div>
      )}
    </div>
  );
}
