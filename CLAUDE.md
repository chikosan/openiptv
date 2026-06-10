# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000 (PWA disabled in dev)
npm run build     # Production build — runs TypeScript check + ESLint before output
npm run lint      # ESLint via next lint (zero warnings/errors expected)
```

There are no tests in this project.

**Node requirement:** Node.js 18+. If `node` is not on PATH, install via `brew install node`.

## Architecture

### Data flow

The app is entirely client-side. No backend except one Edge API route.

1. User adds an M3U8 URL → `playlist-store` fetches it through `/api/proxy-playlist` (CORS bypass) → `m3u8-parser.ts` parses it into `Channel[]` → stored in IndexedDB via `lib/storage.ts` (with localStorage fallback).
2. `app/page.tsx` (the sole page) reads from Zustand stores to render the split-pane UI: channel sidebar + video player + EPG info.
3. All state is in `lib/store/` Zustand stores. Most use `zustand/middleware/persist` and write directly to localStorage under `openiptv-*` keys. Only playlist data goes through `lib/storage.ts` / IndexedDB.

### Stores (`lib/store/`)

| Store                      | Persisted     | Responsibility                                            |
| -------------------------- | ------------- | --------------------------------------------------------- |
| `playlist-store`           | via IndexedDB | Playlists, current channel, auto-refresh intervals        |
| `preferences-store`        | localStorage  | Player settings (volume, buffer, quality), UI preferences |
| `channel-management-store` | localStorage  | Hidden/deleted channel sets, trash/restore                |
| `custom-folders-store`     | localStorage  | User-defined channel folders                              |
| `parental-store`           | localStorage  | PIN + blocked channels/groups                             |
| `watch-history-store`      | localStorage  | Recently watched channels                                 |
| `recordings-store`         | localStorage  | Recording metadata                                        |
| `statistics-store`         | localStorage  | Watch-time statistics                                     |

### Video player architecture

`components/player/video-player.tsx` uses **two libraries simultaneously**:

- **Video.js** — provides the player container and UI controls
- **hls.js** — bypasses Video.js's source handling and attaches directly to the underlying `<video>` element for all HLS playback

The player ref type is `ReturnType<typeof videojs>` extended with `qualityLevels?()` (a Video.js plugin method not in the base types). The `QualitySelector` component uses the same extended type.

### Theming

UI components follow a shadcn/ui pattern with CSS variables in `app/globals.css`. The app is hard-coded to dark mode (`<html className="dark">`). Token names (`--primary`, `--card`, `--muted`, etc.) match Tailwind CSS variable conventions used across all components.

### The proxy route

`app/api/proxy-playlist/route.ts` runs on Edge Runtime. It fetches external M3U8/playlist URLs server-side to bypass browser CORS. It blocks private/internal IP ranges to prevent SSRF. This is the **only** server-side code.

### EPG

`lib/epg/epg-manager.ts` is a singleton that fetches and caches XMLTV data (parsed by `lib/epg/xmltv-parser.ts`). The EPG URL is stored directly in localStorage under the key `epg_url` (not via a Zustand store) — `app/page.tsx` reads it on mount.

### CI/CD

Pushing to `main` or tagging `v*` triggers `.github/workflows/docker-publish.yml`, which builds and pushes a Docker image to `ghcr.io/chikosan/openiptv`. The Next.js build uses `output: 'standalone'` for Docker compatibility.

---

## Release Process

Three artifacts ship with each release: Android TV APK, Android phone APK, and the server Docker image.

### Prerequisites (one-time)

- Docker Desktop running (for APK builds — no Java needed)
- Node.js 18+ on Mac (`brew install node`)
- ADB installed (`brew install android-platform-tools`)

### 1. Build Android TV APK

```bash
./build-apk.sh tv
# → dist/openiptv-tv.apk
```

Loads from `http://192.168.10.124:3000/?tv=1`. D-pad navigation enabled. Appears in Android TV launcher (Leanback).

### 2. Build Android phone APK

```bash
./build-apk.sh phone
# → dist/openiptv-phone.apk
```

Loads from `http://192.168.10.124:3000`. Normal touch interface.

Both commands: first run ~10 min (Docker image + Gradle download), subsequent runs ~1-2 min (cached).

### 3. Server Docker image

Handled automatically by CI on `git tag v*`. To deploy the latest server image on homesrv:

```bash
ssh root@homesrv.local "cd /opt/openiptv && git pull && docker compose up -d --build"
# Server available at: http://homesrv.local:3000
```

No APK reinstall needed after server updates — the APKs load app code from the server at runtime.

### 4. Sideload APKs to devices

```bash
# Android TV — enable: Settings → About → click Build Number 7× → Developer Options → ADB Debugging
adb connect <tv-ip>:5555
adb install -r dist/openiptv-tv.apk

# Android phone — enable: Settings → Developer Options → USB Debugging (or wireless)
adb connect <phone-ip>:5555
adb install -r dist/openiptv-phone.apk
```

### Build variant reference

| Command                | APK                       | Server URL     | Launcher                        |
| ---------------------- | ------------------------- | -------------- | ------------------------------- |
| `./build-apk.sh tv`    | `dist/openiptv-tv.apk`    | `…:3000/?tv=1` | Android TV (Leanback) + regular |
| `./build-apk.sh phone` | `dist/openiptv-phone.apk` | `…:3000`       | Regular Android only            |

### Capacitor config

`capacitor.config.ts` reads `BUILD_TARGET` env var (`tv` or `phone`) to switch the server URL and app name. `build-apk.sh` sets this automatically before running `npx cap copy android`.

If homesrv IP changes, update the URL in `capacitor.config.ts` and rebuild both APKs.
