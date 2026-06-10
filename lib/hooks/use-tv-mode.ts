// lib/hooks/use-tv-mode.ts
"use client";
import { useEffect, useState } from "react";

export function useTVMode(): boolean {
  const [isTVMode, setIsTVMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsTVMode(params.get("tv") === "1");
  }, []);

  return isTVMode;
}
