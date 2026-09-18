#!/usr/bin/env bash
# EcoSetu Android Release APK Build Script
set -e

echo "=== Building EcoSetu Android Release APK ==="
cd "$(dirname "$0")/../mobile/android"

./gradlew assembleRelease

echo "Build complete. Output APK located at:"
echo "mobile/android/app/build/outputs/apk/release/app-release.apk"
