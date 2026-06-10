"use client";

import { useState, useEffect } from "react";
import { epgManager } from "@/lib/epg/epg-manager";
import { EPGProgram } from "@/lib/epg/types";

interface NowNext {
  current: EPGProgram | null;
  next: EPGProgram | null;
}

/**
 * Current + next EPG program for a channel, refreshed every minute.
 * The early 5s retry catches the initial async EPG load.
 */
export function useNowNext(channelName: string): NowNext {
  const [nowNext, setNowNext] = useState<NowNext>({ current: null, next: null });

  useEffect(() => {
    const update = () => {
      if (!epgManager.hasRealData()) return;
      setNowNext(epgManager.getCurrentProgram(channelName));
    };
    update();
    const early = setTimeout(update, 5000);
    const interval = setInterval(update, 60_000);
    return () => {
      clearTimeout(early);
      clearInterval(interval);
    };
  }, [channelName]);

  return nowNext;
}
