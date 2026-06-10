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
echo "⚙️  Applying Capacitor config (target: ${BUILD_TARGET})..."
BUILD_TARGET="$BUILD_TARGET" npx cap copy android

# Step 2: Build Docker image (cached after first run)
echo "🔨 Building Docker image (cached after first run)..."
docker build --quiet -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile.android" "$SCRIPT_DIR"

# Step 3: Build APK inside Docker
echo "📦 Building ${BUILD_TARGET} APK..."
docker run --rm \
    -v "$SCRIPT_DIR/android":/workspace/android \
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
