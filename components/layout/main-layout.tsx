"use client";

import { Tv, Search, Settings, CalendarDays } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useTVMode } from "@/lib/hooks/use-tv-mode";
import { useAndroidBackButton } from "@/lib/hooks/use-back-button";

const EPGGrid = lazy(() => import("@/components/epg/epg-grid").then((m) => ({ default: m.EPGGrid })));

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const isTVMode = useTVMode();

  // Android hardware/remote Back: close overlays first, then default chain
  useAndroidBackButton(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
      return true;
    }
    if (guideOpen) {
      setGuideOpen(false);
      return true;
    }
    return false;
  });

  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header (desktop/TV) - mobile uses the bottom action bar instead */}
      <header className="hidden lg:block sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="container flex h-14 items-center px-4 justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 font-bold">
            <Tv className="h-6 w-6 text-primary" />
            <span className="text-lg">OpenIPTV</span>
          </div>

          {/* Right: Guide + Config */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-accent active:bg-accent active:scale-[0.97] rounded-lg transition-colors"
              title="TV Guide"
            >
              <CalendarDays className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-accent active:bg-accent active:scale-[0.97] rounded-lg transition-colors"
              title="Configuration"
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Config</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 pt-[env(safe-area-inset-top)] lg:pt-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {children}
      </main>

      {/* Mobile bottom action bar - thumb-reachable */}
      <nav className="lg:hidden flex-none border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="flex items-center justify-around h-14">
          <div className="flex items-center gap-2 font-bold px-3">
            <Tv className="h-5 w-5 text-primary" />
            <span className="text-sm">OpenIPTV</span>
          </div>
          <button
            onClick={() => setGuideOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-4 min-h-[44px] min-w-[64px] rounded-lg hover:bg-accent active:bg-accent active:scale-[0.97] transition-colors"
            title="TV Guide"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[10px] text-muted-foreground">Guide</span>
          </button>
          <button
            onClick={() => {
              const search = document.getElementById("channel-search");
              search?.scrollIntoView({ block: "center", behavior: "smooth" });
              search?.focus();
            }}
            className="flex flex-col items-center justify-center gap-0.5 px-4 min-h-[44px] min-w-[64px] rounded-lg hover:bg-accent active:bg-accent active:scale-[0.97] transition-colors"
            title="Search channels"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] text-muted-foreground">Search</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-4 min-h-[44px] min-w-[64px] rounded-lg hover:bg-accent active:bg-accent active:scale-[0.97] transition-colors"
            title="Configuration"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] text-muted-foreground">Settings</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      {!isTVMode && (
        <footer className="hidden lg:block border-t py-4">
          <div className="container px-4 text-center text-sm text-muted-foreground">
            <p>OpenIPTV - Stream IPTV Channels Anywhere</p>
          </div>
        </footer>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* TV Guide */}
      {guideOpen && (
        <Suspense fallback={null}>
          <EPGGrid isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
