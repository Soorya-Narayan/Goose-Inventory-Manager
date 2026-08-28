# CIP OEE Dashboard — Edge Deployment Guide

## Architecture Overview

```
S7-1200 PLC
    │  (S7-Protocol, 100ms cyclic)
    ▼
SIMATIC S7 Connector
    │  (publishes to IE Databus MQTT)
    ▼
IIH Essentials  ←── stores time-series data by variable UUID
    │  REST API: http://edgeappdataservice:4203/DataService/Data
    ▼
CIP Dashboard (nginx:8888)
    └── /iih/ → proxied internally to edgeappdataservice:4203
```

No Node-RED, no MQTT in the dashboard container. The dashboard polls
IIH Essentials every 5 seconds via a simple HTTP GET.

---

## Step 1 — Build the Docker Image

Run this on your **Windows development machine** (where Docker Desktop is installed):

```powershell
cd "d:\Documents\cip-dashboard-react_backup_41"

docker build --platform linux/amd64 -t cip-dashboard:1.0.0 .
```

> Build takes ~3-5 minutes on first run (downloads node:20-alpine).
> The `--platform linux/amd64` flag is required for the IPC227G (x86_64).

Verify the image was created:
```powershell
docker images | findstr cip-dashboard
```

---

## Step 2 — Export the Image as a TAR File

```powershell
docker save cip-dashboard:1.0.0 -o .\IIH-Package\cip-dashboard-1.0.0.tar
```

Check the file size (expect ~60-90 MB):
```powershell
Get-Item .\IIH-Package\cip-dashboard-1.0.0.tar | Select-Object Length
```

---

## Step 3 — Package with App Publisher

1. Open **Industrial Edge App Publisher** (v0.102.0) on your PC
2. Click **+ New App**
3. Fill in the details:
   - **App Name:** `cip-dashboard`
   - **Version:** `1.0.0`
   - **Title:** `CIP OEE Dashboard`
4. Under **Docker Compose**, click **Import** and select `docker-compose.edge.yml`
5. Under **Images**, click **Add image tar** and select `IIH-Package/cip-dashboard-1.0.0.tar`
6. Click **Review** — confirm resource limits (0.5 CPU, 256MB RAM)
7. Click **Build** → App Publisher creates `cip-dashboard_1.0.0.app`

---

## Step 4 — Upload to Industrial Edge Management (IEM)

1. Open your browser → `https://192.168.1.150`
2. Log in with your Edge device credentials
3. Navigate to **App Management** → **My Apps**
4. Click **Upload App** → select `cip-dashboard_1.0.0.app`
5. Wait for upload to complete (~1-2 min depending on network)

---

## Step 5 — Install on the IPC227G

1. In IEM → **App Management** → find **CIP OEE Dashboard**
2. Click **Install** → select your device (IPC227G)
3. Click **Install Now**
4. Wait for status to show **Running** (typically 30-60 seconds)

---

## Step 6 — Verify

Open a browser and navigate to:

```
http://192.168.1.150:8888
```

You should see:
- ✅ Green **"IIH Connected"** pill in the header
- ✅ Live OEE values for all 13 machines
- ✅ Machine state badges updating every 5 seconds
- ✅ Defect counts from Sandwiching and Packing lines

---

## Troubleshooting

### Dashboard shows "IIH Offline" / connection error

1. Check that IIH Essentials is running on the edge device:
   ```
   IEM → Installed Apps → IIH Essentials → Status = Running
   ```
2. Verify the `proxy-redirect` network exists:
   ```bash
   docker network ls | grep proxy-redirect
   ```
3. Test connectivity from inside the container:
   ```bash
   docker exec -it cip-dashboard wget -qO- http://edgeappdataservice:4203/DataService/Data?variableIds=1ce12eda-f3aa-4079-9947-93d825dd7d35
   ```
   Should return a JSON array. If it returns nothing, IIH is not on the same network.

### All values show "—" but connection is green

The variable UUIDs may not yet have data. Check that:
1. S7 Connector is **deployed** and **running** in IEM
2. The PLC data sources (PLC, PLJ, test) are **connected** — visible in Common Configurator
3. Tags are being acquired (Common Configurator → Tags tab → values appear)

### Port 8888 is blocked

The app publishes on port 8888. If you cannot reach it, check:
- IE firewall rules allow TCP 8888 inbound
- No other app is using port 8888 on the device

---

## Environment Variables (Advanced)

| Variable | Default | Description |
|---|---|---|
| `IIH_BASE_URL` | `/iih` | nginx proxy path to IIH DataService |
| `API_BASE_URL` | `/api` | Reserved for future Flask backend |

To change poll interval (currently 5s), edit `src/services/iihDataService.js`
line with `startPolling(onData, onError, 5000)` and rebuild.
