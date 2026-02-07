# OBS Timer Overlay

A self-hosted timer overlay for OBS with real-time sync, multi-timer support, and full customization.

## Features

- **Timer modes**: Countdown and countup
- **End behaviors**: Stop at zero, count negative, hide, or confetti celebration
- **Multi-timer**: Isolated timers via `?timer=xxx` URL parameter
- **Real-time sync**: WebSocket-based, instant updates across all clients
- **Full styling**: Font, size, color, shadow, and stroke customization
- **Persistent state**: SQLite database, survives restarts

## URLs

| Path | Purpose |
|------|---------|
| `/` | Instructions and setup guide |
| `/overlay?timer=xxx` | OBS browser source (transparent background) |
| `/control?timer=xxx` | Control panel |

## Coolify Setup

### 1. Create New Resource

- Go to your Coolify dashboard
- Click **+ New Resource** → **Public Repository**
- Enter the repository URL
- Select **Dockerfile** as build pack

### 2. Configure Environment

Set the following in **Environment Variables**:

```
PORT=3000
```

### 3. Configure Persistent Storage

This is required to persist timer state across deployments.

1. Go to **Storages** tab
2. Click **+ Add**
3. Configure:
   - **Source Path**: `/data`
   - **Destination Path**: `/app/data`
4. Save

### 4. Configure Network

1. Go to **Network** tab
2. Set your desired domain
3. Port should be `3000`

### 5. Deploy

Click **Deploy** and wait for the build to complete.

## Local Development

```bash
# Install dependencies
npm install

# Build CSS
npm run build:css

# Start server
npm start

# Or with auto-reload
npm run dev
```

## OBS Setup

1. Add a **Browser Source** in OBS
2. Set URL to `http://your-domain/overlay?timer=mytimer`
3. Set width/height as needed (e.g., 400x100)
4. Check **"Shutdown source when not visible"** (optional)

## Tech Stack

- Node.js + Express
- Socket.io (WebSockets)
- SQLite (better-sqlite3)
- Tailwind CSS
