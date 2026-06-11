"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProgramReminder {
  id: string; // programId + start
  channelName: string;
  programTitle: string;
  /** ISO timestamp of the program start. */
  startsAt: string;
}

interface RemindersStore {
  reminders: ProgramReminder[];
  addReminder: (reminder: ProgramReminder) => void;
  removeReminder: (id: string) => void;
  hasReminder: (id: string) => boolean;
  /** Drop reminders whose start time is long past. */
  prune: () => void;
}

export const useRemindersStore = create<RemindersStore>()(
  persist(
    (set, get) => ({
      reminders: [],
      addReminder: (reminder) =>
        set((state) => ({
          reminders: state.reminders.some((r) => r.id === reminder.id)
            ? state.reminders
            : [...state.reminders, reminder],
        })),
      removeReminder: (id) => set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) })),
      hasReminder: (id) => get().reminders.some((r) => r.id === id),
      prune: () =>
        set((state) => ({
          reminders: state.reminders.filter((r) => new Date(r.startsAt).getTime() > Date.now() - 3600_000),
        })),
    }),
    { name: "openiptv-reminders" },
  ),
);
