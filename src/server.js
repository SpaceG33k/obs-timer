const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { initializeDatabase } = require('./db/init');
const { deleteStaleTimers } = require('./db/queries');
const TimerManager = require('./timer/TimerManager');
const { setupSocketHandlers } = require('./socket/handlers');
const { generateTimerName } = require('./wordlists');
const { sanitizeChannel } = require('./utils');

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

// Initialize database
initializeDatabase();

// Create timer manager
const timerManager = new TimerManager(io);

// Restore any running timers from database
timerManager.restoreTimers();

// Setup socket handlers
setupSocketHandlers(io, timerManager);

// Stale timer cleanup
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TIMER_MAX_AGE_DAYS = parseInt(process.env.TIMER_MAX_AGE_DAYS, 10) || 30;

function runCleanup() {
  const deleted = deleteStaleTimers(TIMER_MAX_AGE_DAYS);
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} stale timer(s)`);
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

// API endpoint to get timer state (for debugging/integrations)
app.get('/api/timer/:channel', (req, res) => {
  const sanitizedChannel = sanitizeChannel(req.params.channel);

  if (!sanitizedChannel) {
    return res.status(400).json({ error: 'Invalid channel name' });
  }

  const state = timerManager.getState(sanitizedChannel);
  res.json(state);
});

// API endpoint to generate a random timer name
app.get('/api/generate-name', (req, res) => {
  const timerName = generateTimerName();
  res.json({ name: timerName });
});

// Routes - serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/overlay', (req, res) => {
  const sanitizedTimer = sanitizeChannel(req.query.timer);
  if (!sanitizedTimer) {
    return res.redirect('/?error=invalid_timer');
  }
  // Redirect to sanitized timer name if different
  if (req.query.timer !== sanitizedTimer) {
    return res.redirect(`/overlay?timer=${sanitizedTimer}`);
  }
  res.sendFile(path.join(__dirname, '../public/overlay.html'));
});

app.get('/control', (req, res) => {
  const sanitizedTimer = sanitizeChannel(req.query.timer);
  if (!sanitizedTimer) {
    return res.redirect('/?error=invalid_timer');
  }
  // Redirect to sanitized timer name if different
  if (req.query.timer !== sanitizedTimer) {
    return res.redirect(`/control?timer=${sanitizedTimer}`);
  }
  res.sendFile(path.join(__dirname, '../public/control.html'));
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`OBS Timer server running on http://localhost:${PORT}`);
  console.log(`  - Instructions: http://localhost:${PORT}/`);
  console.log(`  - Control panel: http://localhost:${PORT}/control?timer=<your-timer>`);
  console.log(`  - OBS Overlay: http://localhost:${PORT}/overlay?timer=<your-timer>`);
});
