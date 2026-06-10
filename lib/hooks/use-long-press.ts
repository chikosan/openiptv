"use client";

import { useCallback, useRef } from "react";
import { vibrate } from "@/lib/utils";

interface LongPressOptions {
  /** Hold duration in ms before the long-press fires. */
  ms?: number;
  /** Cancel if the finger moves more than this many px (scroll intent). */
  moveTolerance?: number;
}

/**
 * Touch long-press detection. Returns handlers to spread onto the target
 * element. Fires `onLongPress` with the press coordinates after `ms` of a
 * steady touch; cancels on scroll/move. Adds a small haptic tick.
 */
export function useLongPress(onLongPress: (point: { x: number; y: number }) => void, options: LongPressOptions = {}) {
  const { ms = 500, moveTolerance = 10 } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const point = { x: touch.clientX, y: touch.clientY };
      startRef.current = point;
      firedRef.current = false;
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        vibrate(15);
        onLongPress(point);
      }, ms);
    },
    [ms, onLongPress],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const start = startRef.current;
      const touch = e.touches[0];
      if (!start || !touch) return;
      if (Math.abs(touch.clientX - start.x) > moveTolerance || Math.abs(touch.clientY - start.y) > moveTolerance) {
        clear();
      }
    },
    [clear, moveTolerance],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Suppress the synthetic click after a long-press fired
      if (firedRef.current) {
        e.preventDefault();
      }
      clear();
    },
    [clear],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: clear, longPressFiredRef: firedRef };
}
