# Ghost_FileShuttler

![Framework](https://img.shields.io/badge/Framework-Flask_2.3-000000?style=for-the-badge&logo=flask&logoColor=white)
![Mobile](https://img.shields.io/badge/Mobile-Native_Android_Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)
![Cloud](https://img.shields.io/badge/Cloud-Supabase_Storage_%26_PostgREST-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Build](https://img.shields.io/badge/Build-Gradle_8.7-02303A?style=for-the-badge&logo=gradle&logoColor=white)
![Proxy](https://img.shields.io/badge/Proxy-Nginx_OWASP_CRS-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Database](https://img.shields.io/badge/Database-PostgreSQL_15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions_Native-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Theme](https://img.shields.io/badge/Theme-Ghost_Cyan-00c3cf?style=for-the-badge)
![Sync](https://img.shields.io/badge/Sync-Real--Time_2s-00ff9d?style=for-the-badge)
![Brand](https://img.shields.io/badge/Brand-.Vault_Access-ffffff?style=for-the-badge)

A production-ready, ultra-secure, and lightning-fast cross-platform file-shuttling ecosystem. Featuring a calibrated **.Vault Access** aesthetic with a strict 60-30-10 dark obsidian palette, it enables seamless file shuttling between desktop web browsers and native Android devices globally across networks via Supabase Cloud Vault or locally over LAN Wi-Fi without forcing IP address configuration.

---

## Key Features

- **Cross-Network Global File Shuttling (Supabase Cloud Vault):** Bypass direct IP addresses and Wi-Fi boundaries. Devices on separate networks (mobile data, remote offices, separate cities) pair instantly through an identical 4-digit PIN.
- **Zero-Configuration Instant Pairing:** When launching the Android app or web interface, entering a 4-digit secret PIN (e.g. `1024`) joins the device to that secret partition. Files uploaded on PC appear immediately on phone in real-time.
- **Auto-Purge & Cloud Hygiene:** Downloaded or removed files are seamlessly deleted from cloud storage and database records, preventing redundant cloud storage consumption.
- **Calibrated Brand Typography & Proportional Logos:** Features precise brand styling where **.Vault** is bold and **Access** is regular text weight in pure white (#FFFFFF), paired with calibrated compact logo sizing across splash screens (118x14dp), in-app logos (20x20dp / 16x16dp), and web styling (16px / 27px).
- **Floating Pill Bottom Navigation:** Implements the curved rectangular floating pill tab bar with dynamic horizontal centering (280dp x 50dp, 16dp radius, 4x4 active dot indicator) with Upload and Archives screens.
- **Direct GitHub Actions Native Compilation:** Compiles release APK binaries directly on GitHub Actions runners using open-source Eclipse Temurin Java 17 and Android SDK toolchains without relying on third-party cloud build credits.
- **Automatic GitHub Releases Distribution:** Every release compiled in CI is automatically packaged and published to GitHub Releases as a downloadable APK.
- **Strict 60-30-10 Design System:** 60% deep obsidian background (#0A0C10), 30% panel/surface (#161A22), and 10% Ghost Cyan accent (#00F0FF).

---

## System Architecture

```
                      +---------------------------------------+
                      |         Anywhere in the World         |
                      |   (Android Native & Desktop Web)      |
                      +-------------------+-------------------+
                                          |
                                          | Pure HTTPS REST / Storage
                                          v
                      +---------------------------------------+
                      |        Supabase Cloud Gateway         |
                      |   - PostgREST: /rest/v1/vault_shuttle |
                      |   - Storage:   /storage/v1/vault_files|
                      |   - Global 4-Digit PIN Partitioning   |
                      +-------------------+-------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
          +---------------------------+       +---------------------------+
          |  Android App (OkHttp)     |       |  Web Vault (Flask/JS)     |
          |  - Instant 2s Sync        |       |  - Drag & Drop Dropzone   |
          |  - Zero-IP Cloud Pairing  |       |  - Cloud & LAN Modes      |
          +---------------------------+       +---------------------------+
```

### Local LAN Fallback Architecture

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
|   |   |   |   |   `-- api/               # OkHttp 4.12 VaultApiService (Cloud & LAN)
|   |   |   |   |-- ui/
|   |   |   |   |   |-- auth/              # AuthActivity (4-digit PIN keypad, mode selector)
|   |   |   |   |   `-- main/              # MainActivity, UploadFragment, ArchivesFragment
|   |   |   |   |-- util/                  # SessionManager (VaultMode.CLOUD, Supabase config)
|   |   |   |   `-- GhostApplication.kt    # Application entrypoint
|   |   |   |-- res/
|   |   |   |   |-- drawable/              # Vector drawables (ic_cloud, ic_server, etc.)
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
|   |-- templates/                         # Jinja2 index vault view (.Vault Access)
|   |-- app.py                             # Flask server, Supabase Cloud Gateway, SQLite/PostgreSQL
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
1. On the authentication screen, the app connects to **Cloud Vault (Global Sync)** by default — no IP address is required.
2. Enter the same 4-digit PIN (e.g. `1024`) on both your mobile device and your desktop web browser.
3. Once authenticated, files uploaded on either device appear immediately in the Archives tab in real time.
4. To connect to an air-gapped local server, tap the mode indicator to switch to **Local Area Network (LAN Node)** mode.

---

## GitHub Actions CI/CD Native Compilation

Native Android release APKs are compiled directly on GitHub Actions runners without requiring external cloud build services:
- **Runner:** `ubuntu-latest`
- **JDK:** Eclipse Temurin Java 17 via `actions/setup-java@v4`
- **Android SDK:** Command-line tools and build-tools via `android-actions/setup-android@v3`
- **Build Execution:** `./gradlew assembleRelease -x lint -x test --no-daemon`
- **Dynamic VersionCode:** Automatically matches `${{ github.run_number }}`
- **Asset Distribution:** Dynamically published and uploaded to GitHub Releases matching the active release version (e.g. `ghost-fileshuttler-v1.0.2.apk`).

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
   python app/app.py
   ```
   The web server listens on port 5000 and is accessible locally and across the Wi-Fi subnet.

---

## Supabase Cloud Vault Configuration (.env)

To connect your own Supabase project for cross-network file shuttling:

1. **Create `.env` from template:**
   ```powershell
   cp .env.example .env
   ```

2. **Configure your keys in `.env`:**
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   VAULT_MODE=CLOUD
   ```

3. **Supabase Database & Storage Setup:**
   - In your Supabase SQL Editor, run:
     ```sql
     CREATE TABLE IF NOT EXISTS public.vault_shuttle (
         id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
         vault_pin TEXT NOT NULL,
         filename TEXT NOT NULL,
         file_url TEXT,
         file_size BIGINT,
         mime_type TEXT,
         storage_path TEXT,
         created_at TIMESTAMPTZ DEFAULT NOW()
     );

     ALTER TABLE public.vault_shuttle ENABLE ROW LEVEL SECURITY;

     CREATE POLICY "Allow public shuttling by pin" ON public.vault_shuttle
         FOR ALL TO anon, authenticated
         USING (true) WITH CHECK (true);
     ```
   - In Supabase Storage, create a bucket named **`vault_files`** (public or anon read/write).

---

**Maintained by:** [Thulane Sigasa](https://github.com/thulanesigasa)
