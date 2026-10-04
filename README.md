# Ghost_FileShuttler

![Framework](https://img.shields.io/badge/Framework-Flask_2.3-000000?style=for-the-badge&logo=flask&logoColor=white)
![Proxy](https://img.shields.io/badge/Proxy-Nginx_OWASP_CRS-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Database](https://img.shields.io/badge/Database-PostgreSQL_15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Theme](https://img.shields.io/badge/Theme-Ghost_Cyan-00c3cf?style=for-the-badge)
![Real-Time](https://img.shields.io/badge/Sync-1s_Polling-00ff9d?style=for-the-badge)

A production-ready, ultra-secure, and lightning-fast local-network file-sharing system. Designed with a premium Ghost Cyan aesthetic, it allows for seamless file transfers between devices (Mobile, Desktop, Tablet) without leaving your local network.

---

## Features

- **Real-Time Sync:** Files appear across all connected nodes within 1 second without refreshing.
- **Secure Vault:** Protected by PIN-based authentication with SHA-256 tenant isolation.
- **Cross-Platform:** Fully responsive UI tailored for Mobile, Tablet, and Desktop.
- **Themed Modals:** Custom-built Ghost dialogs for a premium user experience.
- **Easy Management:** Upload, Download, and Permanently Delete files from any device.
- **Privacy First:** Data never leaves your local network.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |          Local Wi-Fi Subnet           |
                      |   (Mobile / Tablet / Desktop Clients) |
                      +-------------------+-------------------+
                                          |
                      HTTPS (Port 8443) / HTTP (Port 8080)
                                          v
                      +---------------------------------------+
                      |         Nginx (OWASP ModSecurity)     |
                      |      - SSL Termination (Certs)        |
                      |      - Reverse Proxy to Flask:5000    |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |             Flask Web Node            |
                      |  - SQLAlchemy ORM & Auth Session      |
                      |  - Multi-Tenant Vault Routing         |
                      +-------------------+-------------------+
                                          |
                       +------------------+------------------+
                       |                                     |
                       v                                     v
         +---------------------------+         +---------------------------+
         |      PostgreSQL DB        |         |    shuttle_vault/ Disk    |
         |  - Vault IDs (Hashed PIN) |         |  - Direct File Storage    |
         |  - File Metadata & Sizes  |         |  - UUID Prefixed Paths    |
         +---------------------------+         +---------------------------+
```

---

## Directory Structure

```
ghost_fileshuttler/
|-- app/
|   |-- static/
|   |   |-- css/
|   |   |   |-- plugins/              # Vendor styling libraries (swiper, fancybox, bootstrap-grid)
|   |   |   |-- style.css             # Main theme styles
|   |   |   `-- styles.css            # Dropzone & vault UI overrides
|   |   |-- js/
|   |   |   |-- plugins/              # Vendor scripts (GSAP, Swup, Tilt, jQuery)
|   |   |   |-- main.js               # Theme navigation logic
|   |   |   `-- shuttler.js           # Vault polling, upload, and delete interactions
|   |   |-- robots.txt                # Search crawler rules
|   |   `-- sitemap.xml               # XML sitemap
|   |-- templates/
|   |   `-- index.html                # Jinja2 root vault interface
|   |-- app.py                        # Flask server, SQLAlchemy models, and API routes
|   |-- Dockerfile                    # Containerization specification for web service
|   `-- requirements.txt              # Python runtime dependencies
|-- nginx/
|   |-- certs/                        # Local self-signed SSL certificates (git-ignored)
|   `-- nginx.conf                    # Nginx reverse proxy and TLS configuration
|-- docker-compose.yml                # Multi-container orchestration (web, db, nginx)
|-- .gitignore                        # Git exclusion rules (safeguarding .agents, AGENTS.md, CLAUDE.md)
`-- README.md                         # Complete project documentation and guide
```

---

## Quick Start (Docker - Recommended)

The easiest way to get Ghost_FileShuttler running is using Docker.

1. **Clone the repo:**
   ```bash
   git clone https://github.com/thulanesigasa/ghost_fileshuttler.git
   cd ghost_fileshuttler
   ```

2. **Launch the Ghost Node:**
   ```bash
   docker compose up -d --build
   ```

3. **Access the App:**
   - **Local Desktop:** Open `https://localhost:8443`
   - **LAN / Mobile:** Locate your `LAN_IP` in the app terminal or the header (e.g., `https://192.168.34.48:8443`).

---

## Mobile Access Guide

To run and access Ghost_FileShuttler on your mobile device:

1. **Connect to the same Network:** Ensure your phone/tablet is connected to the same Wi-Fi as the host machine.
2. **Find the LAN IP:** Look at the top-right corner of the Ghost_FS desktop header to find your `LAN_IP`.
3. **Open Browser:** On your mobile device, enter the URL: `https://<YOUR_LAN_IP>:8443` (e.g., `https://192.168.34.48:8443`).
4. **SSL Warning:** Since Ghost uses a self-signed certificate for local encryption, your browser will show a "Your connection is not private" warning.
   - Click **Advanced**.
   - Select **Proceed to <IP> (unsafe)** to enter the vault.
5. **Pin Access:** Enter your `GHOST_PIN` to unlock the vault from your mobile.

---

## Local Development Setup

If you want to run the application natively for development purposes:

### 1. Prerequisites
- Python 3.10+
- PostgreSQL (or adjust `DATABASE_URL` for SQLite in `app.py`)

### 2. Create and Activate Virtual Environment
**On Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```powershell
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r app/requirements.txt
```

### 4. Set Environment Variables
```bash
export SECRET_KEY="your-super-secret-key"
export DATABASE_URL="postgresql://shuttler:ghostpass@localhost:5432/shuttlerdb"
export GHOST_PIN="1234"
```

### 5. Run the Application
```bash
cd app
python app.py
```

---

## Networking

To connect from your phone or other devices:
1. Ensure your device is on the **same Wi-Fi/LAN** as the host.
2. Open your browser and type the **LAN_IP** shown in the host's Ghost_FS header.
3. Accept the self-signed certificate (Ghost uses HTTPS for local security).

## Security Note
Ghost_FileShuttler uses a self-signed certificate by default for encrypted local traffic. In production environments, it is recommended to use a valid SSL certificate via Let's Encrypt or similar.

---
**Maintained by:** [Thulane Sigasa](https://github.com/thulanesigasa)
