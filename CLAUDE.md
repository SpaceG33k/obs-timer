# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OBS Timer is a self-hosted countdown/countup timer overlay for OBS Studio with multi-room support, real-time WebSocket sync, and persistent storage.

## Tech Stack

- **Backend:** Node.js + Express + Socket.io
- **Database:** SQLite (better-sqlite3)
- **Frontend:** Vanilla JS + Tailwind CSS
- **Deployment:** Docker

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start with nodemon (auto-restart)
npm start            # Start production server
npm run build:css    # Build Tailwind CSS (required after HTML changes)
npm run watch:css    # Watch and rebuild Tailwind CSS
```

## Architecture

### URL Structure
- `/` - Instructions page
- `/overlay?room=xxx` - OBS browser source (transparent background)
- `/control?room=xxx` - Control panel for managing timer
- `/api/room/:channel` - REST API for timer state

### Key Files

**Backend:**
- `src/server.js` - Express + Socket.io server, routes, initialization
- `src/timer/TimerManager.js` - Timer logic (start/stop/reset/adjust), state persistence, periodic sync
- `src/socket/handlers.js` - WebSocket event handlers for timer controls and config updates
- `src/db/queries.js` - SQLite CRUD operations for rooms

**Frontend:**
- `public/js/shared.js` - Shared utilities (socket connection, time formatting, style application)
- `public/js/overlay.js` - OBS overlay client with timer interpolation
- `public/js/control.js` - Control panel UI and event handlers

### Data Flow

1. Control panel emits WebSocket events (`timer:start`, `timer:stop`, etc.)
2. Server's `TimerManager` updates state and persists to SQLite
3. Server broadcasts `timer:sync` to all clients in the channel room
4. Overlay receives sync and updates display with client-side interpolation

### Timer State Persistence

Running timers store `started_at` timestamp. On sync or restart, remaining time is calculated as:
```javascript
remaining = stored_remaining - (now - started_at)
```

### Multi-Room Isolation

Each room is a separate Socket.io room (`channel:xxx`). State is stored per-room in the `rooms` SQLite table.

## Database Schema

Single `rooms` table with columns for:
- Timer state: `mode`, `duration_ms`, `remaining_ms`, `is_running`, `started_at`, `end_behavior`
- Display format: `format` (auto/HH:MM:SS/MM:SS/SS)
- Styling: `font_*`, `text_color`, `shadow_*`, `stroke_*`

Rooms are auto-created on first access with sensible defaults.

## Docker Deployment

```bash
docker compose up -d --build
```

The SQLite database is stored in a Docker volume (`timer-data`) mapped to `/app/data`.
