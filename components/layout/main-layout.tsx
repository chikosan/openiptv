"use client";

import { Search, Settings, CalendarDays } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { useTVMode } from "@/lib/hooks/use-tv-mode";
import { useAndroidBackButton } from "@/lib/hooks/use-back-button";
import { APP_VERSION } from "@/lib/version";

const EPGGrid = lazy(() => import("@/components/epg/epg-grid").then((m) => ({ default: m.EPGGrid })));
const SettingsModal = lazy(() =>
  import("@/components/settings/settings-modal").then((m) => ({ default: m.SettingsModal })),
);

function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2"
        y="3"
        width="20"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <rect x="4" y="5" width="16" height="10" rx="1.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M10 7.5L16.5 10L10 12.5V7.5Z" fill="currentColor" />
      <path d="M12 17V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 20H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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
      <header className="hidden lg:flex sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="w-full flex h-14 items-center px-4 justify-between">
          {/* Left: Logo + version */}
          <div className="flex items-center gap-2 font-bold">
            <BrandLogo className="h-7 w-7 text-primary" />
            <span className="text-lg">OpenIPTV</span>
            <span className="text-[11px] font-normal text-muted-foreground px-1.5 py-0.5 bg-muted rounded-md leading-none">
              v{APP_VERSION}
            </span>
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
        <div className="flex items-center justify-between h-14 px-3">
          {/* Left: brand */}
          <div className="flex items-center gap-2 font-bold">
            <BrandLogo className="h-5 w-5 text-primary" />
            <span className="text-sm">OpenIPTV</span>
            <span className="text-[10px] font-normal text-muted-foreground px-1 py-0.5 bg-muted rounded leading-none">
              v{APP_VERSION}
            </span>
          </div>
          {/* Right: actions */}
          <div className="flex items-center">
            <button
              onClick={() => setGuideOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-3 min-h-[44px] min-w-[52px] rounded-lg hover:bg-accent active:bg-accent active:scale-[0.97] transition-colors"
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
              className="flex flex-col items-center justify-center gap-0.5 px-3 min-h-[44px] min-w-[52px] rounded-lg hover:bg-accent active:bg-accent active:scale-[0.97] transition-colors"
              title="Search channels"
            >
              <Search className="h-5 w-5" />
              <span className="text-[10px] text-muted-foreground">Search</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-3 min-h-[44px] min-w-[52px] rounded-lg hover:bg-accent active:bg-accent active:scale-[0.97] transition-colors"
              title="Configuration"
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] text-muted-foreground">Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Footer */}
      {!isTVMode && (
        <footer className="hidden lg:block border-t py-4">
          <div className="w-full px-4 text-center text-sm text-muted-foreground">
            <p>OpenIPTV v{APP_VERSION} — Stream IPTV Channels Anywhere</p>
          </div>
        </footer>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}

      {/* TV Guide */}
      {guideOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading guide…
              </div>
            </div>
          }
        >
          <EPGGrid isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
