/**
 * Shared utilities for OBS Timer
 */

/**
 * Get room from URL query parameter
 */
function getRoom() {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

/**
 * Format milliseconds to time string
 */
function formatTime(ms, format = 'auto') {
  const negative = ms < 0;
  const absMs = Math.abs(ms);

  const hours = Math.floor(absMs / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  const seconds = Math.floor((absMs % 60000) / 1000);

  const pad = (n) => n.toString().padStart(2, '0');
  const prefix = negative ? '-' : '';

  switch (format) {
    case 'HH:MM:SS':
      return `${prefix}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    case 'MM:SS':
      const totalMinutes = hours * 60 + minutes;
      return `${prefix}${pad(totalMinutes)}:${pad(seconds)}`;

    case 'SS':
      const totalSeconds = Math.floor(absMs / 1000);
      return `${prefix}${totalSeconds}`;

    case 'auto':
    default:
      if (hours > 0) {
        return `${prefix}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      } else if (minutes > 0) {
        return `${prefix}${pad(minutes)}:${pad(seconds)}`;
      } else {
        return `${prefix}${pad(seconds)}`;
      }
  }
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(input) {
  if (typeof input === 'number') {
    return input;
  }

  const str = input.trim().toLowerCase();

  // Check for HH:MM:SS or MM:SS format
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return (h * 3600 + m * 60 + s) * 1000;
    } else if (parts.length === 2) {
      const [m, s] = parts;
      return (m * 60 + s) * 1000;
    }
  }

  // Check for duration notation (1h30m45s)
  const hourMatch = str.match(/(\d+)h/);
  const minMatch = str.match(/(\d+)m/);
  const secMatch = str.match(/(\d+)s/);

  if (hourMatch || minMatch || secMatch) {
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minMatch ? parseInt(minMatch[1]) : 0;
    const seconds = secMatch ? parseInt(secMatch[1]) : 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  // Plain number - assume seconds
  const num = parseInt(str);
  if (!isNaN(num)) {
    return num * 1000;
  }

  return 0;
}

/**
 * Apply styling to timer element
 */
function applyTimerStyles(element, state) {
  element.style.fontFamily = state.font_family;
  element.style.fontSize = state.font_size + 'px';
  element.style.fontWeight = state.font_weight;
  element.style.color = state.text_color;

  // Shadow
  if (state.shadow_enabled) {
    element.style.textShadow = `${state.shadow_offset_x}px ${state.shadow_offset_y}px ${state.shadow_blur}px ${state.shadow_color}`;
  } else {
    element.style.textShadow = 'none';
  }

  // Stroke (using CSS paint-order trick)
  if (state.stroke_enabled) {
    element.style.webkitTextStroke = `${state.stroke_width}px ${state.stroke_color}`;
    element.style.paintOrder = 'stroke fill';
  } else {
    element.style.webkitTextStroke = 'none';
  }
}

/**
 * Create socket connection and return helper object
 */
function createTimerConnection(channel, callbacks = {}) {
  const socket = io();

  let state = null;
  let serverTime = 0;
  let serverTimestamp = 0;
  let animationFrame = null;

  // Join channel on connect
  socket.on('connect', () => {
    socket.emit('join', { channel });
    if (callbacks.onConnect) callbacks.onConnect();
  });

  // Receive initial state
  socket.on('room:state', (newState) => {
    state = newState;
    serverTime = newState.remaining_ms;
    serverTimestamp = Date.now();
    if (callbacks.onState) callbacks.onState(state);
  });

  // Receive timer updates
  socket.on('timer:sync', (newState) => {
    state = newState;
    serverTime = newState.remaining_ms;
    serverTimestamp = Date.now();
    if (callbacks.onSync) callbacks.onSync(state);
  });

  // Receive config updates
  socket.on('config:updated', (newState) => {
    state = newState;
    if (callbacks.onConfigUpdate) callbacks.onConfigUpdate(state);
  });

  // Timer ended
  socket.on('timer:ended', (data) => {
    if (callbacks.onTimerEnd) callbacks.onTimerEnd(data);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    if (callbacks.onError) callbacks.onError(error);
  });

  socket.on('disconnect', () => {
    if (callbacks.onDisconnect) callbacks.onDisconnect();
  });

  // Get interpolated current time
  function getCurrentTime() {
    if (!state) return 0;
    if (!state.is_running) return serverTime;

    const elapsed = Date.now() - serverTimestamp;
    if (state.mode === 'countdown') {
      return serverTime - elapsed;
    } else {
      return serverTime + elapsed;
    }
  }

  // Start render loop
  function startRenderLoop(callback) {
    function render() {
      const currentTime = getCurrentTime();
      callback(currentTime, state);
      animationFrame = requestAnimationFrame(render);
    }
    render();
  }

  function stopRenderLoop() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  return {
    socket,
    getState: () => state,
    getCurrentTime,
    startRenderLoop,
    stopRenderLoop,

    // Control methods
    start: () => socket.emit('timer:start'),
    stop: () => socket.emit('timer:stop'),
    reset: (duration) => socket.emit('timer:reset', { duration }),
    set: (options) => socket.emit('timer:set', options),
    adjust: (delta) => socket.emit('timer:adjust', { delta }),
    updateConfig: (config) => socket.emit('config:update', config)
  };
}
