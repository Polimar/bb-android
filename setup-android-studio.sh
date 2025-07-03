#!/bin/bash

echo "🎮 BrainBrawler Android Studio Setup"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Errore: Esegui questo script dalla directory bb-android"
    echo "   cd bb-android && ./setup-android-studio.sh"
    exit 1
fi

echo "📦 Installazione dipendenze npm..."

# Check if npm is available
if command -v npm >/dev/null 2>&1; then
    echo "✅ npm trovato, installazione in corso..."
    npm install
    echo "✅ Dipendenze npm installate!"
elif command -v node >/dev/null 2>&1; then
    echo "✅ Node.js trovato, installazione con npx..."
    npx npm install
    echo "✅ Dipendenze npm installate!"
else
    echo "⚠️  npm/node non trovato, tentativo con Docker..."
    if command -v docker >/dev/null 2>&1; then
        echo "🐳 Installazione dipendenze con Docker..."
        docker run --rm -v $(pwd):/app -w /app node:18 npm install
        echo "✅ Dipendenze npm installate con Docker!"
    else
        echo "❌ Errore: npm, node o docker non disponibili"
        echo ""
        echo "💡 Soluzioni possibili:"
        echo "   1. Installa Node.js: https://nodejs.org"
        echo "   2. Installa Docker: https://docker.com"
        echo "   3. Copia node_modules da progetto esistente:"
        echo "      cp -r /path/to/existing/node_modules ."
        exit 1
    fi
fi

# Check if Android Studio is needed
echo ""
echo "🚀 Setup completato!"
echo ""
echo "📱 Prossimi passi per Android Studio:"
echo "   1. Apri Android Studio"
echo "   2. Open Project → Seleziona cartella 'android/'"
echo "   3. Sync Project with Gradle Files"
echo "   4. Build → Build APK"
echo ""
echo "🎯 Account di test:"
echo "   Email: admin@brainbrawler.com"
echo "   Password: BrainBrawler2024!"
echo ""
echo "📍 APK output: android/app/build/outputs/apk/debug/app-debug.apk" 