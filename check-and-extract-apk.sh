#!/bin/bash

# Script per monitorare il build Android e estrarre APK
echo "📱 Monitoring Android build for BrainBrawler..."

# Function to check if build is complete
check_build_status() {
    local gradle_running=$(docker exec brainbrawler-android-builder-1 bash -c "ps aux | grep gradle | grep -v grep | wc -l")
    local apk_exists=$(docker exec brainbrawler-android-builder-1 bash -c "find /app/android -name '*.apk' 2>/dev/null | wc -l")
    
    if [ "$apk_exists" -gt 0 ]; then
        return 0  # APK found
    elif [ "$gradle_running" -eq 0 ]; then
        return 2  # Build failed
    else
        return 1  # Still building
    fi
}

# Monitor build status
max_attempts=60  # 30 minutes max
attempt=0

while [ $attempt -lt $max_attempts ]; do
    check_build_status
    status=$?
    
    case $status in
        0)
            echo "✅ Build completed! Extracting APK..."
            
            # Find and copy APK
            apk_path=$(docker exec brainbrawler-android-builder-1 bash -c "find /app/android -name '*.apk' 2>/dev/null | head -1")
            
            if [ -n "$apk_path" ]; then
                # Extract APK to host
                docker cp "brainbrawler-android-builder-1:$apk_path" ./BrainBrawler-1.0.0.apk
                
                # Get APK info
                apk_size=$(ls -lh BrainBrawler-1.0.0.apk | awk '{print $5}')
                echo "📦 APK extracted: BrainBrawler-1.0.0.apk ($apk_size)"
                echo "🚀 Ready for distribution!"
                
                # Optional: Show APK details
                if command -v aapt >/dev/null 2>&1; then
                    echo "📋 APK Details:"
                    aapt dump badging BrainBrawler-1.0.0.apk | grep -E "(package|version)"
                fi
                
                exit 0
            else
                echo "❌ APK found but extraction failed"
                exit 1
            fi
            ;;
        1)
            echo "⏳ Build in progress... (attempt $((attempt+1))/$max_attempts)"
            sleep 30
            ;;
        2)
            echo "❌ Build failed - Gradle process not running"
            
            # Show last build logs
            echo "📋 Last build output:"
            docker exec brainbrawler-android-builder-1 bash -c "cd /app/android && ls -la build/ app/build/ 2>/dev/null || echo 'No build directories found'"
            exit 1
            ;;
    esac
    
    attempt=$((attempt+1))
done

echo "⏰ Build timeout reached (30 minutes)"
echo "💡 You can manually check with:"
echo "   docker exec brainbrawler-android-builder-1 bash -c 'cd /app/android && find . -name \"*.apk\"'"
exit 1 