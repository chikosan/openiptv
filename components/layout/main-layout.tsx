"use client";

import { Tv, Menu, Settings } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useTVMode } from "@/lib/hooks/use-tv-mode";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isTVMode = useTVMode();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4 justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 font-bold">
            <Tv className="h-6 w-6 text-primary" />
            <span className="text-lg">OpenIPTV</span>
          </div>

          {/* Right: Config */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-lg transition-colors"
            title="Configuration"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium hidden sm:inline">Config</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      {!isTVMode && (
        <footer className="border-t py-4">
          <div className="container px-4 text-center text-sm text-muted-foreground">
            <p>OpenIPTV - Stream IPTV Channels Anywhere</p>
          </div>
        </footer>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
