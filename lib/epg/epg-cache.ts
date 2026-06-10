"use client";

import { EPGChannel } from "./types";

const DB_NAME = "openiptv-epg-cache";
const STORE = "epg";
const KEY = "data";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface SerializedProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  category?: string;
}

interface SerializedChannel {
  id: string;
  name: string;
  icon?: string;
  programs: SerializedProgram[];
}

interface CacheEntry {
  savedAt: number;
  sources: string[];
  channels: SerializedChannel[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Persist parsed EPG data so the guide is instant on the next app start. */
export async function saveEPGCache(data: Map<string, EPGChannel>, sources: string[]): Promise<void> {
  try {
    const entry: CacheEntry = {
      savedAt: Date.now(),
      sources,
      channels: Array.from(data.values()).map((ch) => ({
        ...ch,
        programs: ch.programs.map((p) => ({
          ...p,
          start: p.start.toISOString(),
          end: p.end.toISOString(),
        })),
      })),
    };
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    console.warn("[EPG] Failed to write cache:", error);
  }
}

/** Returns cached EPG data if it matches the sources and is younger than the TTL. */
export async function loadEPGCache(sources: string[]): Promise<Map<string, EPGChannel> | null> {
  try {
    const db = await openDB();
    const entry = await new Promise<CacheEntry | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (!entry) return null;
    if (Date.now() - entry.savedAt > TTL_MS) return null;
    if (JSON.stringify([...entry.sources].sort()) !== JSON.stringify([...sources].sort())) return null;

    const map = new Map<string, EPGChannel>();
    for (const ch of entry.channels) {
      map.set(ch.id, {
        ...ch,
        programs: ch.programs.map((p) => ({
          ...p,
          start: new Date(p.start),
          end: new Date(p.end),
        })),
      });
    }
    return map;
  } catch (error) {
    console.warn("[EPG] Failed to read cache:", error);
    return null;
  }
}
