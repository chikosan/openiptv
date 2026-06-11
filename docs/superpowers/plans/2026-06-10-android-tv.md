# OpenIPTV Android TV App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing Next.js OpenIPTV web app in a Capacitor Android TV APK with full D-pad remote navigation so it can be sideloaded and used on Android TV.

**Architecture:** The Next.js server runs on homesrv (192.168.10.124:3000) and Capacitor builds a WebView-based Android TV APK that loads from that URL with `?tv=1` appended. TV mode is detected client-side from the query param, which activates D-pad navigation hooks and visible focus styles. No static export needed — the app stays server-rendered, the APK is a thin shell.

**Tech Stack:** Next.js 15, React 19, TypeScript, Capacitor 6, Tailwind CSS, video.js, Zustand

---

## File Map

**New files:**

- `lib/hooks/use-tv-mode.ts` — hook: reads `?tv=1`, returns boolean
- `components/tv-mode-bootstrap.tsx` — client component that sets `tv-mode` class on `<html>` from URL
- `capacitor.config.ts` — Capacitor config pointing to homesrv server URL

**Modified files:**

- `app/layout.tsx` — inject TVModeBootstrap component
- `app/globals.css` — add focus-visible styles for `.tv-mode` class
- `app/page.tsx` — auto-focus first channel on TV mode load; hide keyboard hint footer in TV mode
- `components/layout/main-layout.tsx` — hide footer in TV mode
- `components/channels/channel-list.tsx` — add `onKeyDown` D-pad handler to scroll container
- `components/channels/channel-item.tsx` — replace hover-only action visibility with focus-based visibility
- `components/channels/country-folder.tsx` — ArrowRight=expand, ArrowLeft=collapse on folder button
- `components/player/video-player.tsx` — ArrowUp/Down for volume when player is focused in TV mode
- `package.json` — add Capacitor deps + build:android script

**Android files (created by Capacitor, then modified):**

- `android/app/src/main/AndroidManifest.xml` — add Leanback launcher + touchscreen not-required features

---

## Task 1: Deploy openiptv on homesrv

**Files:** none (server-side only)

- [ ] **Step 1: SSH to homesrv and clone the repo**

```bash
ssh root@homesrv.local
git clone https://github.com/chikosan/openiptv.git /opt/openiptv
cd /opt/openiptv
```

- [ ] **Step 2: Start the app with docker-compose**

```bash
cd /opt/openiptv
docker compose up -d
```

Expected output: container `openiptv` starts and health check passes within 30s.

- [ ] **Step 3: Verify from your Mac**

```bash
curl -s -o /dev/null -w "%{http_code}" http://homesrv.local:3000/
```

Expected: `200`

- [ ] **Step 4: Open in browser to confirm the UI loads**

Navigate to `http://homesrv.local:3000` in Chrome. The welcome screen or channel list should appear.

- [ ] **Step 5: Commit nothing (server-only step)**

No code changes needed. Server is now running.

---

## Task 2: TV Mode Hook + Bootstrap + Focus CSS

**Files:**

- Create: `lib/hooks/use-tv-mode.ts`
- Create: `components/tv-mode-bootstrap.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the useTVMode hook**

```typescript
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
```

- [ ] **Step 2: Create TVModeBootstrap component**

This component renders nothing but adds `tv-mode` class to `<html>` when `?tv=1` is in the URL. It must be a client component because it reads `window.location`.

```typescript
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
```

- [ ] **Step 3: Inject TVModeBootstrap into layout.tsx**

Open `app/layout.tsx`. Add the import and render the component inside `<body>` before `<Providers>`:

```typescript
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { TVModeBootstrap } from "@/components/tv-mode-bootstrap"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OpenIPTV - Stream IPTV Channels",
  description: "Modern open-source IPTV streaming platform with channel management and Chromecast support",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://vjs.zencdn.net/8.10.0/video-js.css" rel="stylesheet" />
        <script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          async
        />
      </head>
      <body className={inter.className}>
        <TVModeBootstrap />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Add TV focus styles to globals.css**

Append this block to the end of `app/globals.css`:

```css
/* ── TV Mode (D-pad / remote navigation) ─────────────────────── */
.tv-mode *:focus {
    outline: none;
}

.tv-mode *:focus-visible,
.tv-mode [tabindex="0"]:focus {
    outline: 3px solid hsl(var(--primary));
    outline-offset: 3px;
    border-radius: 8px;
    box-shadow: 0 0 0 6px hsl(var(--primary) / 0.25);
}

/* Make focused channel items show their action buttons */
.tv-mode [role="button"]:focus .tv-focus-reveal,
.tv-mode [tabindex="0"]:focus .tv-focus-reveal {
    opacity: 1 !important;
}

/* Larger hit area for TV — items need to be visually clear at 10ft */
.tv-mode [role="button"] {
    min-height: 3rem;
}
```

- [ ] **Step 5: Test TV mode in browser**

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000/?tv=1` in Chrome. Press Tab repeatedly — each interactive element should show a bright outline ring. Press Shift+Tab to move backwards.

Expected: clear blue outline ring around every focused element. No outline when browsing normally at `http://localhost:3000`.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/use-tv-mode.ts components/tv-mode-bootstrap.tsx app/layout.tsx app/globals.css
git commit -m "feat(tv): add TV mode detection and D-pad focus styles"
```

---

## Task 3: Channel List D-pad Navigation

**Files:**

- Modify: `components/channels/channel-list.tsx`
- Modify: `components/channels/channel-item.tsx`

- [ ] **Step 1: Add listRef and keyboard handler to channel-list.tsx**

In `components/channels/channel-list.tsx`, add these imports and the ref + handler near the top of the component (after existing `useState` declarations):

```typescript
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
```

Then inside the `ChannelList` function body, after the existing hooks:

```typescript
const listRef = useRef<HTMLDivElement>(null);

const handleListKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll<HTMLElement>('[tabindex="0"]'));
    const currentIdx = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
        case "ArrowDown":
            e.preventDefault();
            if (currentIdx < items.length - 1) {
                items[currentIdx + 1].focus();
                items[currentIdx + 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
            break;
        case "ArrowUp":
            e.preventDefault();
            if (currentIdx > 0) {
                items[currentIdx - 1].focus();
                items[currentIdx - 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
            break;
        case "Home":
            e.preventDefault();
            if (items[0]) {
                items[0].focus();
                items[0].scrollIntoView({ block: "nearest" });
            }
            break;
        case "End":
            e.preventDefault();
            if (items[items.length - 1]) {
                items[items.length - 1].focus();
                items[items.length - 1].scrollIntoView({ block: "nearest" });
            }
            break;
    }
}, []);
```

- [ ] **Step 2: Attach the ref and handler to the scroll container**

Find the scrollable `<div>` in the JSX (the one with `className="flex-1 overflow-y-auto ..."`). Add `ref` and `onKeyDown`:

```tsx
<div
  ref={listRef}
  onKeyDown={handleListKeyDown}
  className="flex-1 overflow-y-auto overflow-x-hidden p-2 scroll-smooth min-h-0"
>
```

- [ ] **Step 3: Make channel-item action buttons visible on focus (TV mode)**

In `components/channels/channel-item.tsx`, the action buttons in list view are controlled by `isHovered ? "opacity-100" : "opacity-0"`. Add the `tv-focus-reveal` class so CSS makes them visible when the item has focus in TV mode.

Find this div in the list view JSX (around the action buttons `<div>`):

```tsx
<div className={cn(
  "flex items-center gap-0.5 flex-shrink-0 transition-opacity duration-200",
  isHovered ? "opacity-100" : "opacity-0"
)}>
```

Change to:

```tsx
<div className={cn(
  "flex items-center gap-0.5 flex-shrink-0 transition-opacity duration-200 tv-focus-reveal",
  isHovered ? "opacity-100" : "opacity-0"
)}>
```

Do the same for the grid view action buttons div (the one with `"absolute bottom-2 right-2 flex gap-1 ..."`):

```tsx
<div className={cn(
  "absolute bottom-2 right-2 flex gap-1 transition-all duration-300 tv-focus-reveal",
  isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
)}>
```

- [ ] **Step 4: Test D-pad navigation in browser**

Open `http://localhost:3000/?tv=1`. Add a playlist if not already added. In the channel list panel on the right:

- Press Tab until a channel item is focused
- Press ArrowDown — focus moves to next channel, list scrolls to keep it in view
- Press ArrowUp — focus moves back up
- Press Enter on a focused channel — the channel starts playing

Expected: clean keyboard navigation through the entire channel list.

- [ ] **Step 5: Commit**

```bash
git add components/channels/channel-list.tsx components/channels/channel-item.tsx
git commit -m "feat(tv): D-pad navigation for channel list"
```

---

## Task 4: Country Folder Keyboard Expand/Collapse

**Files:**

- Modify: `components/channels/country-folder.tsx`

- [ ] **Step 1: Add onKeyDown to the folder header button**

In `components/channels/country-folder.tsx`, find the `<button onClick={() => setIsExpanded(!isExpanded)} ...>` and add an `onKeyDown` handler:

```tsx
<button
  onClick={() => setIsExpanded(!isExpanded)}
  onKeyDown={(e) => {
    if (e.key === "ArrowRight" && !isExpanded) {
      e.preventDefault()
      setIsExpanded(true)
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault()
      setIsExpanded(false)
    }
  }}
  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors group"
>
```

- [ ] **Step 2: Test**

Open `http://localhost:3000/?tv=1`. Navigate with ArrowDown until a country folder header is focused. Press ArrowRight — the folder expands. Press ArrowLeft — it collapses. Press Enter — toggles.

- [ ] **Step 3: Commit**

```bash
git add components/channels/country-folder.tsx
git commit -m "feat(tv): keyboard expand/collapse for country folders"
```

---

## Task 5: Video Player D-pad Volume Control

**Files:**

- Modify: `components/player/video-player.tsx`

- [ ] **Step 1: Add TV mode hook and volume keyboard handler to video-player.tsx**

In `components/player/video-player.tsx`, add the import at the top:

```typescript
import { useTVMode } from "@/lib/hooks/use-tv-mode";
```

Inside `VideoPlayer` function body, after the existing hooks, add:

```typescript
const isTVMode = useTVMode();

// D-pad volume control for TV mode
useEffect(() => {
    if (!isTVMode) return;

    const handleTVKeyDown = (e: KeyboardEvent) => {
        const video = videoElementRef.current;
        if (!video) return;

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                video.volume = Math.min(1, video.volume + 0.1);
                showVolumeChange(video.volume);
                setVolume(video.volume);
                break;
            case "ArrowDown":
                e.preventDefault();
                video.volume = Math.max(0, video.volume - 0.1);
                showVolumeChange(video.volume);
                setVolume(video.volume);
                break;
            case "Enter":
                e.preventDefault();
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
                break;
        }
    };

    window.addEventListener("keydown", handleTVKeyDown);
    return () => window.removeEventListener("keydown", handleTVKeyDown);
}, [isTVMode, showVolumeChange, setVolume]);
```

- [ ] **Step 2: Test**

Open `http://localhost:3000/?tv=1`. Start playing a channel. Press ArrowUp — volume increases and the volume indicator appears. Press ArrowDown — volume decreases. Press Enter — playback pauses/resumes.

- [ ] **Step 3: Commit**

```bash
git add components/player/video-player.tsx
git commit -m "feat(tv): D-pad volume and play/pause for video player"
```

---

## Task 6: TV Layout — Hide Footer, Auto-focus Channel List

**Files:**

- Modify: `components/layout/main-layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Hide footer in TV mode**

In `components/layout/main-layout.tsx`, add the import and hook:

```typescript
import { useTVMode } from "@/lib/hooks/use-tv-mode";
```

Inside `MainLayout`:

```typescript
const isTVMode = useTVMode();
```

Find the `<footer>` element and add a conditional:

```tsx
{
    !isTVMode && (
        <footer className="border-t py-4">
            <div className="container px-4 text-center text-sm text-muted-foreground">
                <p>OpenIPTV - Stream IPTV Channels Anywhere</p>
            </div>
        </footer>
    );
}
```

- [ ] **Step 2: Auto-focus first channel item on TV mode load**

In `app/page.tsx`, add a `useEffect` that focuses the first focusable channel item after channels load in TV mode. Add the import:

```typescript
import { useTVMode } from "@/lib/hooks/use-tv-mode";
```

Inside the `Home` component, after existing hooks:

```typescript
const isTVMode = useTVMode();

// Auto-focus first channel item in TV mode after channels are ready
useEffect(() => {
    if (!isTVMode || !isInitialized || !hasPlaylists) return;
    const timer = setTimeout(() => {
        const firstItem = document.querySelector<HTMLElement>('[data-channel-list] [tabindex="0"]');
        firstItem?.focus();
    }, 800);
    return () => clearTimeout(timer);
}, [isTVMode, isInitialized, hasPlaylists]);
```

- [ ] **Step 3: Add data-channel-list attribute to the channel list container**

In `app/page.tsx`, find the channel list sidebar div:

```tsx
<div className="w-full lg:w-96 h-[40vh] lg:h-full flex-shrink-0 border-t lg:border-t-0 lg:border-l">
```

Change to:

```tsx
<div
  data-channel-list
  className="w-full lg:w-96 h-[40vh] lg:h-full flex-shrink-0 border-t lg:border-t-0 lg:border-l"
>
```

- [ ] **Step 4: Test**

Open `http://localhost:3000/?tv=1`. After the page loads and channels appear, the first channel in the list should be automatically focused (visible outline). The footer should not appear. Navigate with ArrowDown/Up through channels.

- [ ] **Step 5: Commit**

```bash
git add components/layout/main-layout.tsx app/page.tsx
git commit -m "feat(tv): hide footer and auto-focus channel list in TV mode"
```

---

## Task 7: Capacitor Setup + Config

**Files:**

- Modify: `package.json`
- Create: `capacitor.config.ts`

Run all commands from the repo root: `/Users/shaichikorel/GIT-REPOS/shaic/openiptv`

- [ ] **Step 1: Install Capacitor packages**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

Expected: packages added to `node_modules`, `package.json` updated with new deps.

- [ ] **Step 2: Add build script to package.json**

Open `package.json` and add to the `"scripts"` section:

```json
"cap:copy": "cap copy",
"build:android": "cap copy android && cd android && ./gradlew assembleDebug"
```

Full scripts section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "cap:copy": "cap copy",
  "build:android": "cap copy android && cd android && ./gradlew assembleDebug"
}
```

- [ ] **Step 3: Create capacitor.config.ts**

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.openiptv.app",
    appName: "OpenIPTV",
    webDir: "public",
    server: {
        url: "http://192.168.10.124:3000/?tv=1",
        cleartext: true,
    },
    android: {
        backgroundColor: "#000000",
    },
};

export default config;
```

Note: `webDir: "public"` exists already and is required by Capacitor even though the actual content comes from the `server.url`. `cleartext: true` is required because homesrv uses HTTP, not HTTPS.

- [ ] **Step 4: Initialize Capacitor**

```bash
npx cap init "OpenIPTV" "com.openiptv.app" --web-dir public
```

Expected: Capacitor initialized, `capacitor.config.ts` confirmed (overwrite yours if prompted — say yes since the content is the same).

- [ ] **Step 5: Add Android platform**

```bash
npx cap add android
```

Expected: `android/` directory created with full Android project structure. Takes ~30 seconds.

- [ ] **Step 6: Verify the android folder was created**

```bash
ls android/app/src/main/
```

Expected output includes: `AndroidManifest.xml  java  res`

- [ ] **Step 7: Commit**

```bash
git add capacitor.config.ts package.json package-lock.json android/
git commit -m "feat(tv): add Capacitor with Android platform"
```

---

## Task 8: Android TV Manifest Configuration

**Files:**

- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Read the current AndroidManifest.xml**

```bash
cat android/app/src/main/AndroidManifest.xml
```

- [ ] **Step 2: Add TV feature declarations**

Open `android/app/src/main/AndroidManifest.xml`. Add these two `<uses-feature>` lines inside `<manifest>`, before the `<application>` tag:

```xml
<uses-feature
    android:name="android.software.leanback"
    android:required="false" />
<uses-feature
    android:name="android.hardware.touchscreen"
    android:required="false" />
```

`required="false"` means the app runs on both phones and TVs. TV launcher only shows apps that declare `leanback`.

- [ ] **Step 3: Add Leanback launcher intent filter**

Find the `<activity>` tag in the manifest. It already has an `<intent-filter>` with `MAIN` action and `LAUNCHER` category. Add a **second** `<intent-filter>` block immediately after the first one, inside the same `<activity>`:

```xml
<intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
</intent-filter>
```

The final `<activity>` section should look like:

```xml
<activity
    android:name="com.openiptv.app.MainActivity"
    android:exported="true"
    android:label="@string/app_name"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:launchMode="singleTask"
    android:windowSoftInputMode="adjustResize">

    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
    </intent-filter>
</activity>
```

- [ ] **Step 4: Verify the manifest has the cleartext network permission**

Android blocks HTTP traffic by default. Check `<application>` tag has:

```xml
android:usesCleartextTraffic="true"
```

If it's missing, add it to the `<application>` opening tag.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/AndroidManifest.xml
git commit -m "feat(tv): configure Android TV Leanback launcher in manifest"
```

---

## Task 9: Build APK + Sideload to Android TV

**Prerequisites:** Java 17+ installed. Verify with `java -version`. If missing: `brew install openjdk@17`.

- [ ] **Step 1: Build the APK**

From the repo root:

```bash
cd android && ./gradlew assembleDebug
```

First build downloads Gradle and Android dependencies — takes 3-5 minutes. Subsequent builds are faster.

Expected final line: `BUILD SUCCESSFUL in Xs`

- [ ] **Step 2: Find the APK**

```bash
ls android/app/build/outputs/apk/debug/
```

Expected: `app-debug.apk`

- [ ] **Step 3: Find your Android TV's IP address**

On Android TV: go to **Settings → Network → About** to find the IP address. Enable **Developer options → ADB debugging** if not already on (Settings → About → click Build number 7 times).

- [ ] **Step 4: Connect to Android TV via ADB**

```bash
adb connect <your-tv-ip>:5555
```

Example: `adb connect 192.168.10.50:5555`

Expected: `connected to 192.168.10.50:5555`

- [ ] **Step 5: Install the APK**

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: `Performing Streamed Install` then `Success`

- [ ] **Step 6: Launch the app**

```bash
adb shell am start -n com.openiptv.app/.MainActivity
```

Or navigate to the app in the Android TV launcher (it appears under **Apps**).

- [ ] **Step 7: Verify TV mode is active**

The first channel item in the list should be automatically focused with a visible blue outline ring. Press D-pad down to navigate through channels. Press OK/Enter to play a channel. ArrowUp/Down while watching should adjust volume.

---

## Done

After all 9 tasks:

- openiptv runs on `http://homesrv.local:3000`
- Android TV APK installed, loads app from homesrv over LAN
- D-pad navigation works: ArrowUp/Down in channel list, Enter to play, ArrowRight/Left on folders
- Volume control: ArrowUp/Down while watching
- App appears in Android TV launcher

**To rebuild and redeploy after code changes:**

```bash
# On Mac — rebuild APK and reinstall
cd /Users/shaichikorel/GIT-REPOS/shaic/openiptv
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**To update the server:**

```bash
ssh root@homesrv.local
cd /opt/openiptv && git pull && docker compose up -d --build
```
