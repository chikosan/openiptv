// components/tv-mode-bootstrap.tsx
"use client";
import { useEffect } from "react";

export function TVModeBootstrap() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tv") === "1") {
      document.documentElement.classList.add("tv-mode");
    }
  }, []);

  return null;
}
