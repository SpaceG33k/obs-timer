const { parseDuration } = require('../timer/timerUtils');

// Constants for validation
const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_DURATION_MS = 0;
const MAX_ADJUST_MS = 60 * 60 * 1000; // 1 hour max adjustment per call

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const RATE_LIMIT_MAX_EVENTS = 10; // max events per window

function setupSocketHandlers(io, timerManager) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    let currentChannel = null;

    // Rate limiting state
    const eventCounts = new Map(); // eventName -> { count, resetTime }

    function checkRateLimit(eventName) {
      const now = Date.now();
      const limit = eventCounts.get(eventName);

      if (!limit || now > limit.resetTime) {
        eventCounts.set(eventName, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
      }

      if (limit.count >= RATE_LIMIT_MAX_EVENTS) {
        return false;
      }

      limit.count++;
      return true;
    }

    // Helper to validate duration is within bounds
    function validateDuration(ms) {
      if (typeof ms !== 'number' || isNaN(ms)) return null;
      return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, ms));
    }

    // Helper to validate adjustment delta
    function validateDelta(ms) {
      if (typeof ms !== 'number' || isNaN(ms)) return null;
      return Math.max(-MAX_ADJUST_MS, Math.min(MAX_ADJUST_MS, ms));
    }

    // Join a channel room
    socket.on('join', ({ channel }) => {
      if (!channel || typeof channel !== 'string') {
        socket.emit('error', { message: 'Invalid channel name' });
        return;
      }

      // Sanitize channel name
      const sanitizedChannel = channel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

      if (!sanitizedChannel) {
        socket.emit('error', { message: 'Invalid channel name' });
        return;
      }

      // Leave previous channel if any
      if (currentChannel) {
        socket.leave(`channel:${currentChannel}`);
      }

      currentChannel = sanitizedChannel;
      socket.join(`channel:${currentChannel}`);

      // Send current state
      const state = timerManager.getState(currentChannel);
      socket.emit('room:state', state);

      console.log(`Client ${socket.id} joined channel: ${currentChannel}`);
    });

    // Timer controls
    socket.on('timer:start', () => {
      if (!currentChannel) {
        socket.emit('error', { message: 'Not joined to any channel' });
        return;
      }
      if (!checkRateLimit('timer:start')) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const state = timerManager.start(currentChannel);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:stop', () => {
      if (!currentChannel) {
        socket.emit('error', { message: 'Not joined to any channel' });
        return;
      }
      if (!checkRateLimit('timer:stop')) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const state = timerManager.stop(currentChannel);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:reset', ({ duration } = {}) => {
      if (!currentChannel) {
        socket.emit('error', { message: 'Not joined to any channel' });
        return;
      }
      if (!checkRateLimit('timer:reset')) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      let duration_ms = null;
      if (duration !== undefined) {
        const parsed = parseDuration(duration);
        duration_ms = validateDuration(parsed);
        if (duration_ms === null) {
          socket.emit('error', { message: 'Invalid duration value' });
          return;
        }
      }

      const state = timerManager.reset(currentChannel, duration_ms);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:set', ({ duration, mode, remaining }) => {
      if (!currentChannel) {
        socket.emit('error', { message: 'Not joined to any channel' });
        return;
      }
      if (!checkRateLimit('timer:set')) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const updates = {};
      if (duration !== undefined) {
        const parsed = parseDuration(duration);
        const validated = validateDuration(parsed);
        if (validated === null) {
          socket.emit('error', { message: 'Invalid duration value' });
          return;
        }
        updates.duration_ms = validated;
      }
      if (mode !== undefined) {
        if (!['countdown', 'countup'].includes(mode)) {
          socket.emit('error', { message: 'Invalid mode' });
          return;
        }
        updates.mode = mode;
      }
      if (remaining !== undefined) {
        const parsed = parseDuration(remaining);
        const validated = validateDuration(parsed);
        if (validated === null) {
          socket.emit('error', { message: 'Invalid remaining value' });
          return;
        }
        updates.remaining_ms = validated;
      }

      const state = timerManager.set(currentChannel, updates);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:adjust', ({ delta }) => {
      if (!currentChannel) {
        socket.emit('error', { message: 'Not joined to any channel' });
        return;
      }
      if (!checkRateLimit('timer:adjust')) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const parsed = parseDuration(delta);
      const delta_ms = validateDelta(parsed);
      if (delta_ms === null) {
        socket.emit('error', { message: 'Invalid adjustment value' });
        return;
      }

      const state = timerManager.adjust(currentChannel, delta_ms);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    // Configuration updates
    socket.on('config:update', (config) => {
      if (!currentChannel) {
        socket.emit('error', { message: 'Not joined to any channel' });
        return;
      }
      if (!checkRateLimit('config:update')) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      const state = timerManager.updateConfig(currentChannel, config);
      io.to(`channel:${currentChannel}`).emit('config:updated', state);
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
