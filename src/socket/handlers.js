const { parseDuration } = require('../timer/timerUtils');

function setupSocketHandlers(io, timerManager) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    let currentChannel = null;

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
      if (!currentChannel) return;

      const state = timerManager.start(currentChannel);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:stop', () => {
      if (!currentChannel) return;

      const state = timerManager.stop(currentChannel);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:reset', ({ duration } = {}) => {
      if (!currentChannel) return;

      const duration_ms = duration ? parseDuration(duration) : null;
      const state = timerManager.reset(currentChannel, duration_ms);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:set', ({ duration, mode, remaining }) => {
      if (!currentChannel) return;

      const updates = {};
      if (duration !== undefined) {
        updates.duration_ms = parseDuration(duration);
      }
      if (mode !== undefined) {
        updates.mode = mode;
      }
      if (remaining !== undefined) {
        updates.remaining_ms = parseDuration(remaining);
      }

      const state = timerManager.set(currentChannel, updates);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    socket.on('timer:adjust', ({ delta }) => {
      if (!currentChannel) return;

      const delta_ms = parseDuration(delta);
      const state = timerManager.adjust(currentChannel, delta_ms);
      io.to(`channel:${currentChannel}`).emit('timer:sync', state);
    });

    // Configuration updates
    socket.on('config:update', (config) => {
      if (!currentChannel) return;

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
