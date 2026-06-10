#!/bin/bash
# Build Android APK (TV or Phone) inside Docker — no Java needed on Mac.
#
# Usage:
#   ./build-apk.sh tv      → dist/openiptv-tv.apk    (Android TV, D-pad navigation)
#   ./build-apk.sh phone   → dist/openiptv-phone.apk (Android phone/tablet)
#   ./build-apk.sh         → defaults to tv
#
# First run: builds Docker image (~5 min) + downloads Gradle deps (~5 min)
# Subsequent runs: ~1-2 min (all cached in Docker volumes)

set -e

BUILD_TARGET="${1:-tv}"

if [[ "$BUILD_TARGET" != "tv" && "$BUILD_TARGET" != "phone" ]]; then
    echo "Usage: ./build-apk.sh [tv|phone]"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_NAME="openiptv-android-builder"
GRADLE_VOLUME="openiptv-gradle-cache"
DIST_DIR="$SCRIPT_DIR/dist"

# Prerequisites
if ! command -v npx &>/dev/null; then
    echo "❌ Node.js / npx not found. Install with: brew install node"
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Start Docker Desktop first."
    exit 1
fi

# Step 1: Apply Capacitor config for target (runs on Mac, needs Node)
# 'sync' (not 'copy') so newly installed Capacitor plugins are registered in Gradle
echo "⚙️  Applying Capacitor config (target: ${BUILD_TARGET})..."
BUILD_TARGET="$BUILD_TARGET" npx cap sync android

# Step 2: Build Docker image (cached after first run)
# --platform linux/amd64: AAPT2 is an x86_64 binary; run via Rosetta 2 on Apple Silicon
echo "🔨 Building Docker image (cached after first run)..."
docker build --quiet --platform linux/amd64 -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile.android" "$SCRIPT_DIR"

# Step 3: Build APK inside Docker
# Mount the whole @capacitor scope (and community plugins if present) —
# capacitor.settings.gradle references each plugin at ../node_modules/<pkg>/android
PLUGIN_MOUNTS=(-v "$SCRIPT_DIR/node_modules/@capacitor":/workspace/node_modules/@capacitor)
if [ -d "$SCRIPT_DIR/node_modules/@capacitor-community" ]; then
    PLUGIN_MOUNTS+=(-v "$SCRIPT_DIR/node_modules/@capacitor-community":/workspace/node_modules/@capacitor-community)
fi
echo "📦 Building ${BUILD_TARGET} APK..."
docker run --rm --platform linux/amd64 \
    -v "$SCRIPT_DIR/android":/workspace/android \
    "${PLUGIN_MOUNTS[@]}" \
    -v "$GRADLE_VOLUME":/root/.gradle \
    -w /workspace \
    "$IMAGE_NAME" \
    sh -c "
        echo 'sdk.dir=/opt/android-sdk' > /workspace/android/local.properties
        chmod +x /workspace/android/gradlew
        /workspace/android/gradlew -p /workspace/android assembleDebug
    "

# Step 4: Copy to dist/
mkdir -p "$DIST_DIR"
APK_SRC="$SCRIPT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
APK_DEST="$DIST_DIR/openiptv-${BUILD_TARGET}.apk"

if [ -f "$APK_SRC" ]; then
    cp "$APK_SRC" "$APK_DEST"
    SIZE=$(du -h "$APK_DEST" | cut -f1)
    echo ""
    echo "✅ $APK_DEST ($SIZE)"
    echo ""
    echo "Sideload to device:"
    echo "  adb connect <device-ip>:5555"
    echo "  adb install -r \"$APK_DEST\""
else
    echo "❌ Build failed — APK not found at $APK_SRC"
    exit 1
fi
