"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    category: "Playback",
    items: [
      { keys: ["Space"], description: "Play / Pause" },
      { keys: ["M"], description: "Mute / Unmute" },
      { keys: ["F"], description: "Toggle Fullscreen" },
      { keys: ["↑"], description: "Volume Up" },
      { keys: ["↓"], description: "Volume Down" },
      { keys: ["←"], description: "Seek Back 10s" },
      { keys: ["→"], description: "Seek Forward 10s" },
      { keys: ["J"], description: "Seek Back 10s" },
      { keys: ["L"], description: "Seek Forward 10s" },
      { keys: ["K"], description: "Play / Pause" },
      { keys: ["0-9"], description: "Seek to 0%-90%" },
    ],
  },
  {
    category: "Navigation",
    items: [
      { keys: ["N"], description: "Next Channel" },
      { keys: ["P"], description: "Previous Channel" },
      { keys: ["/"], description: "Focus Search" },
      { keys: ["Esc"], description: "Close Modal / Exit Fullscreen" },
      { keys: ["G"], description: "Toggle Grid/List View" },
    ],
  },
  {
    category: "Features",
    items: [
      { keys: ["I"], description: "Toggle Channel Info" },
      { keys: ["C"], description: "Toggle Chromecast" },
      { keys: ["R"], description: "Start/Stop Recording" },
      { keys: ["?"], description: "Show Keyboard Shortcuts" },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={trapRef}
        className="relative w-full max-w-2xl max-h-[85dvh] overflow-auto bg-card rounded-xl border shadow-2xl m-2 sm:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 grid gap-6 md:grid-cols-2">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-primary mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd key={keyIdx} className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-3 border-t bg-card/95 backdrop-blur-sm text-center">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border">?</kbd> anytime to show this
            help
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for global keyboard shortcuts
export function useKeyboardShortcuts({
  onPlayPause,
  onMute,
  onFullscreen,
  onVolumeUp,
  onVolumeDown,
  onSeekBack,
  onSeekForward,
  onNextChannel,
  onPrevChannel,
  onToggleInfo,
  onFocusSearch,
  onToggleView,
  onShowShortcuts,
}: {
  onPlayPause?: () => void;
  onMute?: () => void;
  onFullscreen?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onSeekBack?: () => void;
  onSeekForward?: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onToggleInfo?: () => void;
  onFocusSearch?: () => void;
  onToggleView?: () => void;
  onShowShortcuts?: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          onPlayPause?.();
          break;
        case "m":
          e.preventDefault();
          onMute?.();
          break;
        case "f":
          e.preventDefault();
          onFullscreen?.();
          break;
        case "arrowup":
          e.preventDefault();
          onVolumeUp?.();
          break;
        case "arrowdown":
          e.preventDefault();
          onVolumeDown?.();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          onSeekBack?.();
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          onSeekForward?.();
          break;
        case "n":
          e.preventDefault();
          onNextChannel?.();
          break;
        case "p":
          e.preventDefault();
          onPrevChannel?.();
          break;
        case "i":
          e.preventDefault();
          onToggleInfo?.();
          break;
        case "/":
          e.preventDefault();
          onFocusSearch?.();
          break;
        case "g":
          e.preventDefault();
          onToggleView?.();
          break;
        case "?":
          e.preventDefault();
          onShowShortcuts?.();
          break;
      }
    },
    [
      onPlayPause,
      onMute,
      onFullscreen,
      onVolumeUp,
      onVolumeDown,
      onSeekBack,
      onSeekForward,
      onNextChannel,
      onPrevChannel,
      onToggleInfo,
      onFocusSearch,
      onToggleView,
      onShowShortcuts,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
