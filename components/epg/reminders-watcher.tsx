"use client";

import { useEffect } from "react";
import { useRemindersStore } from "@/lib/store/reminders-store";
import { useToast } from "@/components/ui/toast";

const CHECK_INTERVAL = 30_000;
const NOTIFY_WINDOW_MS = 2 * 60_000; // fire when a program starts within 2 minutes

/** Watches saved program reminders and fires a toast near start time. */
export function RemindersWatcher() {
  const toast = useToast();

  useEffect(() => {
    const check = () => {
      const { reminders, removeReminder, prune } = useRemindersStore.getState();
      prune();
      const now = Date.now();
      for (const reminder of reminders) {
        const startsIn = new Date(reminder.startsAt).getTime() - now;
        if (startsIn <= NOTIFY_WINDOW_MS) {
          toast.info(`Starting soon: ${reminder.programTitle} on ${reminder.channelName}`);
          removeReminder(reminder.id);
        }
      }
    };
    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [toast]);

  return null;
}
