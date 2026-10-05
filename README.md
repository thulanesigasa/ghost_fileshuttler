# Ghost_FileShuttler

![Framework](https://img.shields.io/badge/Framework-Flask_2.3-000000?style=for-the-badge&logo=flask&logoColor=white)
![Android](https://img.shields.io/badge/Mobile-Native_Android_Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)
![Build](https://img.shields.io/badge/Build-Gradle_8.7-02303A?style=for-the-badge&logo=gradle&logoColor=white)
![Proxy](https://img.shields.io/badge/Proxy-Nginx_OWASP_CRS-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Database](https://img.shields.io/badge/Database-PostgreSQL_15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions_Native-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Theme](https://img.shields.io/badge/Theme-Ghost_Cyan-00c3cf?style=for-the-badge)
![Real-Time](https://img.shields.io/badge/Sync-Real--Time_2s-00ff9d?style=for-the-badge)
![Brand](https://img.shields.io/badge/Brand-.Vault_Access-ffffff?style=for-the-badge)

A production-ready, ultra-secure, and lightning-fast local-network file-sharing system. Designed with a premium Ghost Cyan aesthetic, it enables seamless cross-device file shuttling between desktop web browsers and native Android mobile devices over your local Wi-Fi without leaving your private network.

---

## Key Features

- **Real-Time Cross-Device Synchronization:** Files shuttled from desktop web or mobile devices synchronize every 2 seconds without requiring manual page reloads.
- **4-Digit Secure Vault Partitioning:** Protected by SHA-256 tenant isolation. Entering the identical 4-digit PIN on any phone or desktop joins the devices to the same private partition for immediate mutual file access.
- **Native Android Companion App (100% Kotlin):** Built natively in Kotlin using Android Studio architecture, Gradle 8.7, Material 3, OkHttp 4.12, Coroutines, and ViewBinding.
- **Floating Pill Bottom Navigation:** Implements the curved rectangular floating pill tab bar with dynamic horizontal centering (280dp x 50dp, 16dp radius, 4x4 active dot indicator) with Upload and Archives screens.
- **Direct GitHub Actions Native Compilation:** Compiles release APK binaries directly on GitHub Actions runners using open-source Eclipse Temurin Java 17 and Android SDK toolchains without relying on third-party cloud build queues.
- **Automatic GitHub Releases Distribution:** Every release compiled in CI is automatically packaged and published to GitHub Releases as a downloadable APK.
- **Strict 60-30-10 Design System:** 60% deep obsidian background (#0A0C10), 30% panel/surface (#161A22), and 10% Ghost Cyan accent (#00F0FF).
- **Decoupled Adaptive Launcher & In-App Brand Icons:** Android adaptive launcher icon calibrated with 96px icon height and ~72% breathing room to prevent Samsung One UI squircle clipping, paired with crisp in-app brand logos.

---

## System Architecture

```
                      +---------------------------------------+
                      |          Local Wi-Fi Subnet           |
                      |   (Android Native & Desktop Browsers) |
                      +-------------------+-------------------+
                                          |
                      HTTP (Port 5000) / HTTPS (Port 8443)
                                          v
                      +---------------------------------------+
                      |         Nginx (OWASP ModSecurity)     |
                      |      - Reverse Proxy to Flask:5000    |
                      |      - SSL Termination & Headers      |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |             Flask Web Node            |
                      |  - Multi-Tenant Vault Routing (PIN)   |
                      |  - Session Cookies & File Streaming   |
                      +-------------------+-------------------+
                                          |
                        +------------------+------------------+
                        |                                     |
                        v                                     v
          +---------------------------+         +---------------------------+
          |      PostgreSQL / SQLite  |         |    shuttle_vault/ Disk    |
          |  - SHA-256 Hashed PIN     |         |  - Direct File Storage    |
          |  - File Metadata & Sizes  |         |  - UUID Prefixed Names    |
          +---------------------------+         +---------------------------+
```

---

## Directory Structure

```
ghost_fileshuttler/
|-- android/                               # Native Android Mobile Application (Kotlin)
|   |-- gradle/
|   |   `-- wrapper/                       # Gradle 8.7 wrapper distribution
|   |-- app/
|   |   |-- src/main/
|   |   |   |-- java/com/ghost/fileshuttler/
|   |   |   |   |-- data/
|   |   |   |   |   |-- model/             # Data models (VaultFile, AuthResponse)
|   |   |   |   |   `-- api/               # OkHttp 4.12 VaultApiService client
|   |   |   |   |-- ui/
|   |   |   |   |   |-- auth/              # AuthActivity (4-digit numeric keypad)
|   |   |   |   |   `-- main/              # MainActivity, UploadFragment, ArchivesFragment
|   |   |   |   |-- util/                  # SessionManager (PIN, host, port, cookies)
|   |   |   |   `-- GhostApplication.kt    # Application entrypoint
|   |   |   |-- res/
|   |   |   |   |-- drawable/              # Vector drawables & shape backgrounds
|   |   |   |   |-- layout/                # XML UI layouts with ViewBinding
|   |   |   |   |-- values/                # 60-30-10 colors, strings, dimens, themes
|   |   |   |   `-- mipmap-*/              # Calibrated adaptive & standard launcher icons
|   |   |   `-- AndroidManifest.xml        # Permissions, activities, FileProvider
|   |   |-- build.gradle.kts               # Android app configuration & dependencies
|   |   `-- proguard-rules.pro             # Proguard obfuscation & serialization rules
|   |-- build.gradle.kts                   # Root Gradle build script
|   |-- settings.gradle.kts                # Project module definitions
|   |-- gradle.properties                  # JVM parameters and AndroidX flags
|   |-- gradlew                            # Linux/macOS Gradle executable wrapper
|   `-- gradlew.bat                        # Windows Gradle batch script
|-- app/                                   # Web Vault Backend (Python / Flask)
|   |-- static/                            # CSS, JS, brand logos, dropzone styling
|   |-- templates/                         # Jinja2 index vault view
|   |-- app.py                             # Flask server, SQLAlchemy models, API routes
|   `-- requirements.txt                   # Web dependencies
|-- .github/
|   `-- workflows/
|       `-- android-ci.yml                 # Direct GitHub Actions native APK compilation
|-- .gitignore                             # Git exclusion rules
`-- README.md                              # Complete architecture documentation
```

---

## Native Android Application Development (Kotlin)

### 1. Requirements
- Android Studio Iguana / Jellyfish or later
- JDK 17 (Temurin recommended)
- Android SDK Platform 34 (Android 14)

### 2. Opening in Android Studio
1. Launch Android Studio.
2. Select **Open** and choose the `android/` directory inside this repository.
3. Gradle will automatically sync using Gradle 8.7 and download dependencies.
4. Select your connected Android device or emulator and click **Run**.

### 3. Server Configuration & Pairing
1. On the authentication screen, tap **Target: http://10.17.178.160:5000** to configure your host machine's LAN IP address.
2. Enter the same 4-digit PIN on both your phone and your desktop web browser.
3. Once authenticated, files dropped from either device are shuttled in real time.

---

## GitHub Actions CI/CD Native Compilation

Native Android release APKs are compiled directly on GitHub Actions runners without requiring external cloud build services:
- **Runner:** `ubuntu-latest`
- **JDK:** Eclipse Temurin Java 17 via `actions/setup-java@v4`
- **Android SDK:** Command-line tools and build-tools via `android-actions/setup-android@v3`
- **Build Execution:** `./gradlew assembleRelease -x lint -x test --no-daemon`
- **Dynamic VersionCode:** Automatically matches `${{ github.run_number }}`
- **Asset Distribution:** Uploaded to GitHub Releases as `ghost-fileshuttler-v1.0.1.apk`

---

## Web Vault Quick Start (Python)

1. **Activate Virtual Environment:**
   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install Dependencies:**
   ```powershell
   pip install -r app/requirements.txt
   ```

3. **Start Flask Server:**
   ```powershell
   cd app
   python app.py
   ```
   The web server listens on port 5000 and is accessible locally and across the Wi-Fi subnet.

---

**Maintained by:** [Thulane Sigasa](https://github.com/thulanesigasa)
