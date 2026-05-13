const { parseDuration } = require('../timer/timerUtils');
const { sanitizeChannel } = require('../utils');

// Constants for validation
const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_DURATION_MS = 0;
const MAX_ADJUST_MS = 60 * 60 * 1000; // 1 hour max adjustment per call

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const RATE_LIMIT_MAX_EVENTS = 10; // max events per window

const clamp = (ms, min, max) =>
  typeof ms === 'number' && !isNaN(ms) ? Math.max(min, Math.min(max, ms)) : null;

function setupSocketHandlers(io, timerManager) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    let currentChannel = null;
    const eventCounts = new Map(); // eventName -> { count, resetTime }

    function checkRateLimit(eventName) {
      const now = Date.now();
      const limit = eventCounts.get(eventName);

      if (!limit || now > limit.resetTime) {
        eventCounts.set(eventName, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
      }
      if (limit.count >= RATE_LIMIT_MAX_EVENTS) return false;
      limit.count++;
      return true;
    }

    function guard(eventName) {
      if (!currentChannel) {
        socket.emit('error', { message: 'Not joined to any channel' });
        return false;
      }
      if (!checkRateLimit(eventName)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return false;
      }
      return true;
    }

    function broadcast(event, state) {
      io.to(`channel:${currentChannel}`).emit(event, state);
    }

    // Join a channel
    socket.on('join', ({ channel }) => {
      const sanitizedChannel = sanitizeChannel(channel);

      if (!sanitizedChannel) {
        socket.emit('error', { message: 'Invalid channel name' });
        return;
      }

      if (currentChannel) {
        socket.leave(`channel:${currentChannel}`);
      }

      currentChannel = sanitizedChannel;
      socket.join(`channel:${currentChannel}`);

      socket.emit('timer:state', timerManager.getState(currentChannel));
      console.log(`Client ${socket.id} joined channel: ${currentChannel}`);
    });

    socket.on('timer:start', () => {
      if (!guard('timer:start')) return;
      broadcast('timer:sync', timerManager.start(currentChannel));
    });

    socket.on('timer:stop', () => {
      if (!guard('timer:stop')) return;
      broadcast('timer:sync', timerManager.stop(currentChannel));
    });

    socket.on('timer:reset', ({ duration } = {}) => {
      if (!guard('timer:reset')) return;

      let duration_ms = null;
      if (duration !== undefined) {
        duration_ms = clamp(parseDuration(duration), MIN_DURATION_MS, MAX_DURATION_MS);
        if (duration_ms === null) {
          socket.emit('error', { message: 'Invalid duration value' });
          return;
        }
      }

      broadcast('timer:sync', timerManager.reset(currentChannel, duration_ms));
    });

    socket.on('timer:set', ({ duration, mode, remaining }) => {
      if (!guard('timer:set')) return;

      const updates = {};
      if (duration !== undefined) {
        const validated = clamp(parseDuration(duration), MIN_DURATION_MS, MAX_DURATION_MS);
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
        const validated = clamp(parseDuration(remaining), MIN_DURATION_MS, MAX_DURATION_MS);
        if (validated === null) {
          socket.emit('error', { message: 'Invalid remaining value' });
          return;
        }
        updates.remaining_ms = validated;
      }

      broadcast('timer:sync', timerManager.set(currentChannel, updates));
    });

    socket.on('timer:adjust', ({ delta }) => {
      if (!guard('timer:adjust')) return;

      const delta_ms = clamp(parseDuration(delta), -MAX_ADJUST_MS, MAX_ADJUST_MS);
      if (delta_ms === null) {
        socket.emit('error', { message: 'Invalid adjustment value' });
        return;
      }

      broadcast('timer:sync', timerManager.adjust(currentChannel, delta_ms));
    });

    socket.on('config:update', (config) => {
      if (!guard('config:update')) return;
      broadcast('config:updated', timerManager.updateConfig(currentChannel, config));
    });

    // Disconnect handling — clean up sync intervals when no clients remain
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);

      if (currentChannel) {
        const room = io.sockets.adapter.rooms.get(`channel:${currentChannel}`);
        if (!room || room.size === 0) {
          console.log(`No clients in channel ${currentChannel}, stopping sync`);
          timerManager.stopSync(currentChannel);
        }
      }
    });
  });
}

module.exports = { setupSocketHandlers };
