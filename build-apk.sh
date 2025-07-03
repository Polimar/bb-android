#!/bin/bash

# BrainBrawler Mobile - Build APK Universal Script
# Funziona sia dal sistema host che dal container Docker

set -e

echo "🚀 BrainBrawler Mobile APK Builder"
echo "=================================="

# Rileva se siamo nel container o nel sistema host
if [ -d "/opt/android" ] && [ "$ANDROID_HOME" = "/opt/android" ]; then
    echo "📱 Detected: Docker Container Environment"
    ENVIRONMENT="container"
    ANDROID_SDK_PATH="/opt/android"
    CURRENT_DIR="/home/node/project"
else
    echo "💻 Detected: Host System Environment"
    ENVIRONMENT="host"
    PROJECT_DIR="/home/bb/brainbrawler/mobile-app/BrainBrawlerMobile"
    
    # Verifica che il container sia attivo
    if ! docker ps | grep -q "brainbrawler-android-builder-1"; then
        echo "❌ Error: brainbrawler-android-builder-1 container is not running"
        echo "   Run: cd /home/bb/brainbrawler && docker-compose up -d"
        exit 1
    fi
    
    echo "🔄 Delegating build to Docker container..."
    docker exec -w /home/node/project brainbrawler-android-builder-1 bash -c "
        echo '📱 Building APK in container...'
        cd android
        export ANDROID_HOME=/opt/android
        export ANDROID_SDK_ROOT=/opt/android
        export PATH=\$PATH:/opt/android/cmdline-tools/latest/bin:/opt/android/platform-tools
        ./gradlew assembleDebug
        
        # Verifica che l'APK sia stato creato
        if [ -f 'app/build/outputs/apk/debug/app-debug.apk' ]; then
            echo '✅ APK created successfully!'
            echo '📍 Location: /home/node/project/android/app/build/outputs/apk/debug/app-debug.apk'
            ls -lh app/build/outputs/apk/debug/app-debug.apk
        else
            echo '❌ APK not found!'
            exit 1
        fi
    "
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ BUILD SUCCESSFUL!"
        echo "📱 APK Location: $PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
        echo ""
        echo "🎯 Next Steps:"
        echo "   1. Transfer APK to your Android device"
        echo "   2. Install: adb install app-debug.apk"
        echo "   3. Test P2P functionality with admin@brainbrawler.com"
    fi
    exit $?
fi

# Esecuzione nel container
echo "🔧 Building APK directly in container..."
cd android

# Verifica Android SDK
if [ ! -d "$ANDROID_SDK_PATH" ]; then
    echo "❌ Error: Android SDK not found at $ANDROID_SDK_PATH"
    exit 1
fi

# Configura environment
export ANDROID_HOME="$ANDROID_SDK_PATH"
export ANDROID_SDK_ROOT="$ANDROID_SDK_PATH"
export PATH="$PATH:$ANDROID_SDK_PATH/cmdline-tools/latest/bin:$ANDROID_SDK_PATH/platform-tools"

echo "📦 Running: ./gradlew assembleDebug"
./gradlew assembleDebug

# Verifica risultato
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo ""
    echo "✅ BUILD SUCCESSFUL!"
    echo "📱 APK Created:"
    ls -lh app/build/outputs/apk/debug/app-debug.apk
    echo ""
    echo "🎯 APK Ready for deployment!"
else
    echo "❌ BUILD FAILED: APK not found"
    exit 1
fi 