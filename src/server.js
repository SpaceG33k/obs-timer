const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { initializeDatabase } = require('./db/init');
const { deleteStaleRooms } = require('./db/queries');
const TimerManager = require('./timer/TimerManager');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const httpServer = createServer(app);

// CORS configuration - restrict origins in production
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' ? [] : '*');

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Helper to sanitize channel names
function sanitizeChannel(channel) {
  if (!channel || typeof channel !== 'string') return null;
  const sanitized = channel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return sanitized || null;
}

// Initialize database
initializeDatabase();

// Create timer manager
const timerManager = new TimerManager(io);

// Restore any running timers from database
timerManager.restoreTimers();

// Setup socket handlers
setupSocketHandlers(io, timerManager);

// Stale room cleanup
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ROOM_MAX_AGE_DAYS = parseInt(process.env.ROOM_MAX_AGE_DAYS, 10) || 30;

function runCleanup() {
  const deleted = deleteStaleRooms(ROOM_MAX_AGE_DAYS);
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} stale room(s)`);
  }
}

// Run cleanup on startup and then daily
runCleanup();
setInterval(runCleanup, CLEANUP_INTERVAL_MS);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API endpoint to get room state (for debugging/integrations)
app.get('/api/room/:channel', (req, res) => {
  const sanitizedChannel = sanitizeChannel(req.params.channel);

  if (!sanitizedChannel) {
    return res.status(400).json({ error: 'Invalid channel name' });
  }

  const state = timerManager.getState(sanitizedChannel);
  res.json(state);
});

// Routes - serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/overlay', (req, res) => {
  const sanitizedRoom = sanitizeChannel(req.query.room);
  if (!sanitizedRoom) {
    return res.redirect('/?error=invalid_room');
  }
  // Redirect to sanitized room name if different
  if (req.query.room !== sanitizedRoom) {
    return res.redirect(`/overlay?room=${sanitizedRoom}`);
  }
  res.sendFile(path.join(__dirname, '../public/overlay.html'));
});

app.get('/control', (req, res) => {
  const sanitizedRoom = sanitizeChannel(req.query.room);
  if (!sanitizedRoom) {
    return res.redirect('/?error=invalid_room');
  }
  // Redirect to sanitized room name if different
  if (req.query.room !== sanitizedRoom) {
    return res.redirect(`/control?room=${sanitizedRoom}`);
  }
  res.sendFile(path.join(__dirname, '../public/control.html'));
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`OBS Timer server running on http://localhost:${PORT}`);
  console.log(`  - Instructions: http://localhost:${PORT}/`);
  console.log(`  - Control panel: http://localhost:${PORT}/control?room=<your-room>`);
  console.log(`  - OBS Overlay: http://localhost:${PORT}/overlay?room=<your-room>`);
});
