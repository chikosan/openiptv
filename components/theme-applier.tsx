"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { useTVMode } from "@/lib/hooks/use-tv-mode";

/**
 * Applies the persisted theme preference to <html>. TV mode always stays
 * dark (10-foot UI), and dark remains the SSR default.
 */
export function ThemeApplier() {
  const theme = usePreferencesStore((s) => s.ui.theme);
  const isTVMode = useTVMode();

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark =
        isTVMode ||
        theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();

    if (theme === "system" && !isTVMode) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme, isTVMode]);

  return null;
}
