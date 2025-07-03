# BrainBrawler 2.0 Mobile - Android Studio Project

🎮 **Sistema P2P Mobile completo per BrainBrawler con WebRTC**

## 🚀 Setup Rapido per Android Studio

### 1. Clone del Repository e Setup Dipendenze
```bash
git clone https://github.com/Polimar/bb-android.git
cd bb-android

# METODO AUTOMATICO: Script di setup
./setup-android-studio.sh

# OPPURE manuale:
npm install
```

### 2. Apri in Android Studio
1. **Open Project** → Seleziona la cartella `android/` (NON la root!)
2. **Sync Project with Gradle Files** (automatico)
3. **Build APK**: Menu → Build → Build Bundle(s)/APK(s) → Build APK(s)

### 3. Configurazione Necessaria
- **Android SDK**: API 24+ (Android 7.0+)
- **RAM consigliata**: 8GB+ (Gradle configurato per 12GB)
- **Java**: OpenJDK 17 o superiore
- **Node.js**: v18+ (per installare dipendenze)

## ⚠️ **ERRORI COMUNI**

### "Included build does not exist" Error
**Causa**: Mancano le dipendenze npm (node_modules)
**Fix**: 
```bash
cd bb-android
npm install  # Installa tutte le dipendenze React Native
```

### "SDK location not found" Error  
**Causa**: Android SDK non configurato
**Fix**: File → Project Structure → SDK Location → Android SDK

## ✅ Sistema P2P Implementato

### Architettura
- **WebRTC**: Comunicazione peer-to-peer diretta
- **Server Election**: Algoritmo automatico per host selection
- **Emergency Failover**: Promozione automatica in caso di disconnessione
- **Real-time Sync**: Sincronizzazione game state tra dispositivi

### Server Election Algorithm
```typescript
Priority Score = Account Type + Battery Level + Connection Quality
- ADMIN: 1000 punti
- PREMIUM: 500 punti  
- FREE: 100 punti
```

### Account di Test
- **Admin**: admin@brainbrawler.com / BrainBrawler2024!
- **Server**: https://www.brainbrawler.com

## 📱 Build dell'APK

### Metodo 1: Android Studio GUI
1. Menu → Build → Build Bundle(s)/APK(s) → Build APK(s)
2. APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Metodo 2: Terminale
```bash
cd android
./gradlew assembleDebug
```

### Metodo 3: Script Automatizzato
```bash
./build-apk.sh
```

## 🔧 Configurazione Gradle Ottimizzata

Il progetto è già configurato per performance ottimali:
```properties
org.gradle.jvmargs=-Xmx12g -XX:MaxMetaspaceSize=4g -XX:+UseParallelGC
org.gradle.daemon=true
org.gradle.parallel=true
```

## 🎯 Test del Sistema P2P

1. **Installa APK** su dispositivi Android
2. **Login** con account admin
3. **Crea Game** e invita altri player
4. **Test Server Election**: Disconnetti host, verifica promotion automatica
5. **Test Failover**: Simula disconnessioni per emergency takeover

## 📂 Struttura Progetto

```
bb-android/
├── android/           # Progetto Android Studio ← APRI QUESTA CARTELLA
├── src/              # Codice React Native + P2P
├── node_modules/     # Dipendenze npm (da installare)
├── build-apk.sh      # Script build universale
└── BUILD_GUIDE.md    # Documentazione completa
```

## 🔍 Troubleshooting

### Build Errors
- **"Included build does not exist"** → Installa npm dependencies
- **"SDK location not found"** → Configura ANDROID_HOME in Android Studio
- **"BuildConfig not found"** → Risolto (import già aggiunto)
- **"Memory errors"** → Aumenta heap memory in gradle.properties

### Runtime Errors
- **App crash al startup** → Verifica connessione internet
- **P2P connection failed** → Controlla firewall/NAT
- **Login failed** → Verifica server https://www.brainbrawler.com

## ⚡ Performance

**Build Times:**
- Clean build: ~2-3 minuti
- Incremental: ~10-30 secondi
- APK size: ~140MB (include WebRTC libraries)

**Supported Devices:**
- Android 7.0+ (API Level 24+)
- RAM: 3GB+ raccomandati
- Storage: 200MB+ liberi

## 🌐 Tecnologie

- **React Native 0.75.4**
- **WebRTC** per P2P communication
- **TypeScript** per type safety
- **Android SDK 35**
- **Gradle 8.14.1**

## 📝 Licenza

Sistema sviluppato per BrainBrawler.com - Proprietario
