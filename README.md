# 👻 Ghost_FileShuttler

A production-ready, ultra-secure, and lightning-fast local-network file-sharing system. Designed with a premium **Cyan Ghost** aesthetic, it allows for seamless file transfers between devices (Mobile, Desktop, Tablet) without leaving your local network.

![Theme Preview](https://img.shields.io/badge/Theme-Ghost_Cyan-00c3cf?style=for-the-badge)
![Real-Time](https://img.shields.io/badge/Sync-1s_Polling-00ff9d?style=for-the-badge)

## ✨ Features

- **Real-Time Sync:** Files appear across all connected nodes within 1 second without refreshing.
- **Secure Vault:** Protected by PIN-based authentication.
- **Cross-Platform:** Fully responsive UI tailored for Mobile, Tablet, and Desktop.
- **Themed Modals:** Custom-built Ghost dialogs for a premium user experience.
- **Easy Management:** Upload, Download, and Permanently Delete files from any device.
- **Privacy First:** Data never leaves your local network.

---

## 🚀 Quick Start (Docker - Recommended)

The easiest way to get Ghost_FileShuttler running is using Docker.

1. **Clone the repo:**
   ```bash
   git clone https://github.com/thulanesigasa/ghost_fileshuttler.git
   cd ghost_fileshuttler
   ```

2. **Launch the Ghost Node:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the App:**
   - **Local:** `https://localhost:8443`
   - **Network:** Check the app header for your `LAN_IP` (e.g., `https://192.168.1.100:8443`)

---

## 🛠️ Local Development Setup

If you want to run the application natively for development purposes, follow these steps:

### 1. Prerequisites
- Python 3.10+
- PostgreSQL (or adjust `DATABASE_URL` for SQLite)

### 2. Create and Activate Virtual Environment
Keeping your dependencies isolated is a best practice.

**On Linux/macOS:**
```bash
# Create the venv
python3 -m venv venv

# Activate the venv
source venv/bin/activate
```

**On Windows:**
```bash
# Create the venv
python -m venv venv

# Activate the venv
venv\Scripts\activate
```

### 3. Install Dependencies
With the `venv` active, install the required packages:
```bash
pip install -r app/requirements.txt
```

### 4. Set Environment Variables
The app requires a few variables to function. Create a `.env` file in the root directory (or export them):
```bash
export SECRET_KEY="your-super-secret-key"
export DATABASE_URL="postgresql://user:password@localhost/ghost_fs"
export GHOST_PIN="1234" # Your vault access PIN
```

### 5. Run the Application
```bash
cd app
python app.py
```

---

## 📡 Networking

To connect from your phone or other devices:
1. Ensure your device is on the **same Wi-Fi/LAN** as the host.
2. Open your browser and type the **LAN_IP** shown in the host's Ghost_FS header.
3. Accept the self-signed certificate (Ghost uses HTTPS for local security).

## 🔒 Security Note
Ghost_FileShuttler uses a self-signed certificate by default for encrypted local traffic. In production environments, it is recommended to use a valid SSL certificate via Let's Encrypt or similar.

---
**Maintained by:** [Thulane Sigasa](https://github.com/thulanesigasa)
