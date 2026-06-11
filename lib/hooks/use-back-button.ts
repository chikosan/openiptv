"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Handles the Android hardware/remote Back button inside the Capacitor shell.
 * `handler` returns true if it consumed the press (e.g. closed a modal);
 * otherwise we fall through: exit fullscreen → blur focused element outside
 * the channel list → minimize the app (TV/phone home).
 */
export function useAndroidBackButton(handler?: () => boolean) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("backButton", () => {
      if (handlerRef.current?.()) return;

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        return;
      }

      const channelList = document.querySelector<HTMLElement>('[data-channel-list] [tabindex="0"]');
      if (channelList && !document.activeElement?.closest("[data-channel-list]")) {
        channelList.focus();
        return;
      }

      App.minimizeApp();
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
}
