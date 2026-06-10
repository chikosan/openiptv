"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EPGStore {
  /** XMLTV source URLs (multiple sources are merged). */
  sources: string[];
  addSource: (url: string) => void;
  removeSource: (url: string) => void;
  clearSources: () => void;
}

export const useEPGStore = create<EPGStore>()(
  persist(
    (set) => ({
      sources: [],
      addSource: (url) =>
        set((state) => ({
          sources: state.sources.includes(url) ? state.sources : [...state.sources, url],
        })),
      removeSource: (url) => set((state) => ({ sources: state.sources.filter((s) => s !== url) })),
      clearSources: () => set({ sources: [] }),
    }),
    {
      name: "openiptv-epg",
      onRehydrateStorage: () => (state) => {
        // One-time migration from the legacy raw localStorage key
        if (typeof window === "undefined") return;
        const legacy = localStorage.getItem("epg_url");
        if (legacy && state && !state.sources.includes(legacy)) {
          state.addSource(legacy);
          localStorage.removeItem("epg_url");
        }
      },
    },
  ),
);
