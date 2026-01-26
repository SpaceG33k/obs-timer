const { getOrCreateRoom, updateRoom } = require('../db/queries');
const { formatTime } = require('./timerUtils');

// Maximum negative duration before auto-stopping (24 hours in ms)
const MAX_NEGATIVE_DURATION_MS = 24 * 60 * 60 * 1000;

class TimerManager {
  constructor(io) {
    this.io = io;
    this.syncIntervals = new Map(); // channel -> intervalId
  }

  /**
   * Get current timer state for a channel, calculating real-time remaining
   */
  getState(channel) {
    const room = getOrCreateRoom(channel);
    let remaining_ms = room.remaining_ms;

    // If timer is running, calculate actual remaining time
    if (room.is_running && room.started_at) {
      const elapsed = Date.now() - room.started_at;

      if (room.mode === 'countdown') {
        remaining_ms = room.remaining_ms - elapsed;
      } else {
        remaining_ms = room.remaining_ms + elapsed;
      }
    }

    return {
      ...room,
      remaining_ms,
      formatted: formatTime(remaining_ms, room.format)
    };
  }

  /**
   * Start or resume the timer
   */
  start(channel) {
    const room = getOrCreateRoom(channel);

    if (room.is_running) {
      return this.getState(channel);
    }

    updateRoom(channel, {
      is_running: 1,
      started_at: Date.now()
    });

    this.startSync(channel);
    return this.getState(channel);
  }

  /**
   * Stop/pause the timer
   */
  stop(channel) {
    const room = getOrCreateRoom(channel);

    if (!room.is_running) {
      return this.getState(channel);
    }

    // Calculate and save the current remaining time
    const elapsed = Date.now() - room.started_at;
    let remaining_ms;

    if (room.mode === 'countdown') {
      remaining_ms = room.remaining_ms - elapsed;
    } else {
      remaining_ms = room.remaining_ms + elapsed;
    }

    updateRoom(channel, {
      is_running: 0,
      remaining_ms,
      started_at: null
    });

    this.stopSync(channel);
    return this.getState(channel);
  }

  /**
   * Reset timer to initial duration
   */
  reset(channel, duration_ms = null) {
    const room = getOrCreateRoom(channel);
    const newDuration = duration_ms !== null ? duration_ms : room.duration_ms;

    const startValue = room.mode === 'countdown' ? newDuration : 0;

    updateRoom(channel, {
      is_running: 0,
      duration_ms: newDuration,
      remaining_ms: startValue,
      started_at: null
    });

    this.stopSync(channel);
    return this.getState(channel);
  }

  /**
   * Set timer to a specific value
   */
  set(channel, { duration_ms, mode, remaining_ms }) {
    const room = getOrCreateRoom(channel);
    const updates = {};

    if (duration_ms !== undefined) {
      updates.duration_ms = duration_ms;
      // Also reset remaining time to new duration (for countdown) or 0 (for countup)
      const currentMode = mode !== undefined ? mode : room.mode;
      updates.remaining_ms = currentMode === 'countdown' ? duration_ms : 0;
    }

    if (mode !== undefined) {
      updates.mode = mode;
      // Reset remaining time based on new mode
      const dur = duration_ms !== undefined ? duration_ms : room.duration_ms;
      updates.remaining_ms = mode === 'countdown' ? dur : 0;
    }

    if (remaining_ms !== undefined) {
      updates.remaining_ms = remaining_ms;
    }

    // Stop timer when setting new values
    updates.is_running = 0;
    updates.started_at = null;

    updateRoom(channel, updates);
    this.stopSync(channel);
    return this.getState(channel);
  }

  /**
   * Adjust timer by delta (positive or negative)
   */
  adjust(channel, delta_ms) {
    const room = getOrCreateRoom(channel);
    let current_remaining = room.remaining_ms;

    // If running, calculate real remaining
    if (room.is_running && room.started_at) {
      const elapsed = Date.now() - room.started_at;
      if (room.mode === 'countdown') {
        current_remaining = room.remaining_ms - elapsed;
      } else {
        current_remaining = room.remaining_ms + elapsed;
      }
    }

    const new_remaining = Math.max(0, current_remaining + delta_ms);

    if (room.is_running) {
      // Update remaining and reset started_at to now
      updateRoom(channel, {
        remaining_ms: new_remaining,
        started_at: Date.now()
      });
    } else {
      updateRoom(channel, {
        remaining_ms: new_remaining
      });
    }

    return this.getState(channel);
  }

  /**
   * Update configuration/styling
   */
  updateConfig(channel, config) {
    updateRoom(channel, config);
    return this.getState(channel);
  }

  /**
   * Start periodic sync for a channel
   */
  startSync(channel) {
    this.stopSync(channel);

    const intervalId = setInterval(() => {
      const state = this.getState(channel);
      this.io.to(`channel:${channel}`).emit('timer:sync', state);

      // Check for timer end
      if (state.mode === 'countdown' && state.remaining_ms <= 0 && state.is_running) {
        this.handleTimerEnd(channel, state);
      }
    }, 1000);

    this.syncIntervals.set(channel, intervalId);
  }

  /**
   * Stop periodic sync for a channel
   */
  stopSync(channel) {
    const intervalId = this.syncIntervals.get(channel);
    if (intervalId) {
      clearInterval(intervalId);
      this.syncIntervals.delete(channel);
    }
  }

  /**
   * Handle timer reaching zero
   */
  handleTimerEnd(channel, state) {
    const room = getOrCreateRoom(channel);

    switch (room.end_behavior) {
      case 'stop':
      case 'confetti':
        updateRoom(channel, {
          is_running: 0,
          remaining_ms: 0,
          started_at: null
        });
        this.stopSync(channel);
        break;

      case 'negative':
        // Keep running into negative, but stop after max duration to prevent memory leak
        if (state.remaining_ms < -MAX_NEGATIVE_DURATION_MS) {
          updateRoom(channel, {
            is_running: 0,
            remaining_ms: state.remaining_ms,
            started_at: null
          });
          this.stopSync(channel);
        }
        break;

      case 'hide':
        updateRoom(channel, {
          is_running: 0,
          remaining_ms: 0,
          started_at: null
        });
        this.stopSync(channel);
        break;
    }

    this.io.to(`channel:${channel}`).emit('timer:ended', {
      channel,
      behavior: room.end_behavior
    });
  }

  /**
   * Restore running timers on server restart
   */
  restoreTimers() {
    const { getAllRooms } = require('../db/queries');
    const rooms = getAllRooms();

    for (const room of rooms) {
      if (room.is_running && room.started_at) {
        const elapsed = Date.now() - room.started_at;
        let remaining_ms;

        if (room.mode === 'countdown') {
          remaining_ms = room.remaining_ms - elapsed;

          // Check if timer should have ended
          if (remaining_ms <= 0) {
            switch (room.end_behavior) {
              case 'stop':
              case 'hide':
              case 'confetti':
                // Timer ended while server was down - mark as stopped
                updateRoom(room.channel, {
                  is_running: 0,
                  remaining_ms: 0,
                  started_at: null
                });
                console.log(`Timer for channel ${room.channel} ended while server was down`);
                continue;

              case 'negative':
                // Check if exceeded max negative duration
                if (remaining_ms < -MAX_NEGATIVE_DURATION_MS) {
                  updateRoom(room.channel, {
                    is_running: 0,
                    remaining_ms: remaining_ms,
                    started_at: null
                  });
                  console.log(`Timer for channel ${room.channel} exceeded max negative duration`);
                  continue;
                }
                // Otherwise, continue running in negative
                break;
            }
          }
        } else {
          remaining_ms = room.remaining_ms + elapsed;
        }

        // Update the remaining time and reset started_at
        updateRoom(room.channel, {
          remaining_ms,
          started_at: Date.now()
        });

        // Restart sync
        this.startSync(room.channel);
        console.log(`Restored timer for channel: ${room.channel}`);
      }
    }
  }
}

module.exports = TimerManager;
