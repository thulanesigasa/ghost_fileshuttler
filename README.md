# Ghost_FileShuttler

![Framework](https://img.shields.io/badge/Framework-Next.js_16_(App_Router)-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Language](https://img.shields.io/badge/Language-TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Runtime](https://img.shields.io/badge/Runtime-Node.js_24-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Database](https://img.shields.io/badge/Database-Embedded_SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Theme](https://img.shields.io/badge/Theme-Ghost_Cyan_60--30--10-00c3cf?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-SHA--256_Tenant_Isolation-00ff9d?style=for-the-badge)

A high-performance, ultra-secure, and lightning-fast local-network file-sharing system built as a full-stack Next.js application. Designed with a Ghost Cyan aesthetic adhering strictly to the 60-30-10 design system, it enables peer-to-peer file transfers between mobile devices, tablets, and desktops over your local Wi-Fi without ever routing data through external cloud servers.

---

## Architecture Overview

Ghost_FileShuttler operates entirely within the local area network (LAN) boundary. All transfers execute directly between client devices and the host machine over high-speed HTTP/1.1 and HTTP/2 local streams.

```
                      +---------------------------------------+
                      |          Local Wi-Fi Subnet           |
                      |   (Mobile / Tablet / Desktop Clients) |
                      +-------------------+-------------------+
                                          |
                        HTTP (LAN_IP:3000 | localhost:3000)
                                          v
                      +---------------------------------------+
                      |         Ghost_FS Next.js Server       |
                      |  - App Router / React 19 / TypeScript |
                      |  - Session Auth via HTTP-Only Cookies |
                      |  - Real-Time Vault Polling Engine     |
                      +-------------------+-------------------+
                                          |
                       +------------------+------------------+
                       |                                     |
                       v                                     v
         +---------------------------+         +---------------------------+
         |     node:sqlite DB        |         |    shuttle_vault/ Disk    |
         |  - Hashed Vault Index     |         |  - Encrypted / Isolated   |
         |  - File Metadata & Sizes  |         |  - Streaming Read/Write   |
         |  - Upload Timestamps      |         |  - UUID Prefixed Storage  |
         +---------------------------+         +---------------------------+
```

---

## Features

- ![Sync Badge](https://img.shields.io/badge/Sync-Real--Time_Polling-00c3cf?style=flat-square) **Real-Time Vault Sync:** Connected nodes synchronize vault contents every 1.5 seconds with zero-flicker JSON diffing.
- ![Isolation Badge](https://img.shields.io/badge/Multi--Tenant-SHA--256_Hashed_PINs-00ff9d?style=flat-square) **Multi-Tenant Vault Isolation:** Every unique PIN provisions a dedicated partition. Users on the same LAN entering different PINs access completely segregated storage partitions.
- ![Storage Badge](https://img.shields.io/badge/Storage-Zero_Cloud_Exposure-00c3cf?style=flat-square) **Local Subnet Privacy:** Binary files stream directly to and from the host disk. Telemetry, analytics, and external trackers are non-existent.
- ![Design Badge](https://img.shields.io/badge/Design-60--30--10_Palette-00ff9d?style=flat-square) **Ghost Cyan Design System:** 60% Void Black background, 30% Obsidian Slate card surfaces, and 10% Ghost Cyan accent highlights.
- ![SVG Badge](https://img.shields.io/badge/Icons-Pure_SVG_Vector-00c3cf?style=flat-square) **Pure Vector Graphics:** Clean SVG vectors for all actions, navigation, file indicators, and status prompts.
- ![Modal Badge](https://img.shields.io/badge/Modals-Custom_Ghost_Dialogs-00ff9d?style=flat-square) **Themed Confirmation Modals:** Custom-engineered non-blocking dialogs for permanent file removal with keyboard Escape support.

---

## Directory Structure

```
ghost_fileshuttler/
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- auth/
|   |   |   |   `-- route.ts          # PIN verification and session cookie issuer
|   |   |   |-- delete/
|   |   |   |   `-- [id]/
|   |   |   |       `-- route.ts      # Multi-tenant verified file deletion handler
|   |   |   |-- download/
|   |   |   |   `-- [id]/
|   |   |   |       `-- route.ts      # Streaming binary attachment downloader
|   |   |   |-- files/
|   |   |   |   `-- route.ts          # Vault file listing endpoint
|   |   |   |-- logout/
|   |   |   |   `-- route.ts          # Vault lock and cookie expiration handler
|   |   |   |-- network/
|   |   |   |   `-- route.ts          # Host Node ID and LAN IP discovery endpoint
|   |   |   `-- upload/
|   |   |       `-- route.ts          # Multipart file streaming upload handler
|   |   |-- globals.css               # Design tokens, resets, and typography
|   |   |-- layout.tsx                # HTML5 root layout, SEO metadata, JSON-LD
|   |   `-- page.tsx                  # Home controller coordinating auth and vault
|   |-- components/
|   |   |-- AboutSection.module.css   # Architecture and setup guide styling
|   |   |-- AboutSection.tsx          # Zero-cloud overview and mobile access steps
|   |   |-- AuthScreen.module.css     # PIN authentication card styles
|   |   |-- AuthScreen.tsx            # Access gatekeeper with numeric PIN input
|   |   |-- GhostModal.module.css     # Themed confirmation dialog styles
|   |   |-- GhostModal.tsx            # Accessible modal for destructive actions
|   |   |-- Header.module.css         # Responsive navigation and node metrics styles
|   |   |-- Header.tsx                # Brand bar with Node ID, LAN IP, and lock action
|   |   |-- Icons.tsx                 # Standardized inline SVG vector icons
|   |   |-- VaultDashboard.module.css # Dropzone and inventory list styles
|   |   `-- VaultDashboard.tsx        # Drag-and-drop upload and file inventory list
|   |-- lib/
|   |   |-- db.ts                     # Embedded SQLite database via node:sqlite
|   |   `-- vault.ts                  # Cryptographic hashing, cookies, and network helpers
|   `-- types/
|       `-- node-sqlite.d.ts          # Ambient TypeScript definitions for node:sqlite
|-- data/
|   |-- .gitkeep                      # Keeps SQLite directory tracked in git
|   `-- shuttler.db                   # Local SQLite database (git-ignored)
|-- shuttle_vault/
|   |-- .gitkeep                      # Keeps storage directory tracked in git
|   `-- ...                           # Physical uploaded files (git-ignored)
|-- legacy_flask/                     # Archived Python/Flask implementation
|-- nginx/                            # Archived Nginx reverse proxy configuration
|-- .gitignore                        # Git exclusion rules (safeguards .agents per Rule 22)
|-- next.config.ts                    # Next.js bundler and node:sqlite external package config
|-- package.json                      # Project dependencies and script definitions
|-- tsconfig.json                     # TypeScript compiler configuration
`-- README.md                         # Project documentation and architecture guide
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+ (Node.js 22 or 24 recommended for native `node:sqlite` support)
- npm 10+

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/thulanesigasa/ghost_fileshuttler.git
cd ghost_fileshuttler
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```
The server will bind to `localhost:3000` and automatically detect your network LAN IP:
- **Local Desktop:** Open [http://localhost:3000](http://localhost:3000)
- **Local Network / LAN:** Open `http://<YOUR_LAN_IP>:3000` (e.g. `http://192.168.1.100:3000`)

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Mobile and Tablet Access Guide

To access and shuttle files between your mobile phone, tablet, and host machine:

1. **Connect to Same Wi-Fi:** Ensure your smartphone or tablet is connected to the same Wi-Fi router as your host computer.
2. **Find Your LAN IP:** Look at the top-right header on the host screen or click **Copy** next to `LAN_IP`.
3. **Open Mobile Browser:** Open Safari, Chrome, or Firefox on your mobile device and navigate to:
   ```text
   http://<YOUR_LAN_IP>:3000
   ```
4. **Enter Ghost Key (PIN):** Enter the same PIN you used on your computer to open the matching vault partition.
5. **Shuttle Files:** Upload photos, videos, or documents directly from your mobile camera roll or files app to the host vault instantly.

---

## Security Model

- **Zero Cloud Leakage:** All files are written directly to `shuttle_vault/` on the local machine disk.
- **Tenant Isolation:** Vault IDs are computed using cryptographic SHA-256 digests (`hash(pin)`). No plain-text PINs are ever stored in the database.
- **Secure Cookies:** Authentication states are maintained via `httpOnly`, `sameSite=lax` session cookies.
- **Path Sanitization:** File paths and names are strictly sanitized against directory traversal attacks (`../`).

---

## License and Maintainer

Maintained by [Thulane Sigasa](https://github.com/thulanesigasa).
Distributed under the MIT License.
