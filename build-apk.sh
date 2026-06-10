#!/bin/bash
# Build the OpenIPTV Android APK inside Docker — no Java needed on your Mac.
#
# Usage:
#   ./build-apk.sh            # debug build (default)
#   ./build-apk.sh release    # release build (unsigned)
#
# First run: builds Docker image (~5 min) + downloads Gradle deps (~5 min)
# Subsequent runs: ~1-2 min (everything cached)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_TYPE="${1:-debug}"
IMAGE_NAME="openiptv-android-builder"
GRADLE_VOLUME="openiptv-gradle-cache"

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Start Docker Desktop and try again."
    exit 1
fi

echo "🔨 Building Docker image (cached after first run)..."
docker build \
    --quiet \
    -t "$IMAGE_NAME" \
    -f "$SCRIPT_DIR/Dockerfile.android" \
    "$SCRIPT_DIR"

echo "📦 Building Android APK (${BUILD_TYPE})..."
docker run --rm \
    -v "$SCRIPT_DIR/android":/workspace/android \
    -v "$GRADLE_VOLUME":/root/.gradle \
    -w /workspace \
    "$IMAGE_NAME" \
    sh -c "
        echo 'sdk.dir=/opt/android-sdk' > /workspace/android/local.properties
        cd /workspace/android
        chmod +x gradlew
        ./gradlew assemble$(echo "${BUILD_TYPE}" | sed 's/./\u&/')
    "

APK_PATH="$SCRIPT_DIR/android/app/build/outputs/apk/${BUILD_TYPE}/app-${BUILD_TYPE}.apk"

if [ -f "$APK_PATH" ]; then
    SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "✅ APK ready: $APK_PATH ($SIZE)"
    echo ""
    echo "Sideload to Android TV:"
    echo "  adb connect <tv-ip>:5555"
    echo "  adb install -r \"$APK_PATH\""
else
    echo "❌ Build failed — APK not found at expected path"
    exit 1
fi
