/**
 * Shared utilities for OBS Timer
 */

var formatTime = TimerUtils.formatTime;
var parseDuration = TimerUtils.parseDuration;

/**
 * Get timer name from URL query parameter
 */
function getTimer() {
  const params = new URLSearchParams(window.location.search);
  return params.get('timer');
}

/**
 * Apply styling to timer element
 */
function applyTimerStyles(element, state) {
  element.style.fontFamily = state.font_family;
  element.style.fontSize = state.font_size + 'px';
  element.style.fontWeight = state.font_weight;
  element.style.fontVariantNumeric = 'tabular-nums';
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
  socket.on('timer:state', (newState) => {
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
