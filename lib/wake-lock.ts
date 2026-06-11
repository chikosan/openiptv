"use client";

import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";

let sentinel: WakeLockSentinel | null = null;

/** Keep the screen on while video plays (native plugin in the APKs, Wake Lock API on web). */
export async function acquireWakeLock() {
  try {
    if (Capacitor.isNativePlatform()) {
      await KeepAwake.keepAwake();
    } else if ("wakeLock" in navigator && !sentinel) {
      sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener("release", () => {
        sentinel = null;
      });
    }
  } catch {
    // Not supported or denied (e.g. battery saver) - playback continues regardless
  }
}

export async function releaseWakeLock() {
  try {
    if (Capacitor.isNativePlatform()) {
      await KeepAwake.allowSleep();
    } else if (sentinel) {
      await sentinel.release();
      sentinel = null;
    }
  } catch {
    // ignore
  }
}
