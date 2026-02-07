const { getOrCreateTimer, updateTimer, getAllTimers } = require('../db/queries');
const { formatTime } = require('./timerUtils');

// Maximum negative duration before auto-stopping (24 hours in ms)
const MAX_NEGATIVE_DURATION_MS = 24 * 60 * 60 * 1000;

class TimerManager {
  constructor(io) {
    this.io = io;
    this.syncIntervals = new Map(); // channel -> intervalId
  }

  /**
   * Calculate the real-time remaining ms for a timer, accounting for elapsed time if running.
   */
  calculateRemaining(timer) {
    if (timer.is_running && timer.started_at) {
      const elapsed = Date.now() - timer.started_at;
      return timer.mode === 'countdown'
        ? timer.remaining_ms - elapsed
        : timer.remaining_ms + elapsed;
    }
    return timer.remaining_ms;
  }

  /**
   * Get current timer state for a channel, calculating real-time remaining
   */
  getState(channel) {
    const timer = getOrCreateTimer(channel);
    const remaining_ms = this.calculateRemaining(timer);

    return {
      ...timer,
      remaining_ms,
      formatted: formatTime(remaining_ms, timer.format)
    };
  }

  /**
   * Start or resume the timer
   */
  start(channel) {
    const timer = getOrCreateTimer(channel);

    if (timer.is_running) {
      return this.getState(channel);
    }

    updateTimer(channel, {
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
    const timer = getOrCreateTimer(channel);

    if (!timer.is_running) {
      return this.getState(channel);
    }

    const remaining_ms = this.calculateRemaining(timer);

    updateTimer(channel, {
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
    const timer = getOrCreateTimer(channel);
    const newDuration = duration_ms !== null ? duration_ms : timer.duration_ms;

    const startValue = timer.mode === 'countdown' ? newDuration : 0;

    updateTimer(channel, {
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
    const timer = getOrCreateTimer(channel);
    const updates = {};

    if (duration_ms !== undefined) {
      updates.duration_ms = duration_ms;
      // Also reset remaining time to new duration (for countdown) or 0 (for countup)
      const currentMode = mode !== undefined ? mode : timer.mode;
      updates.remaining_ms = currentMode === 'countdown' ? duration_ms : 0;
    }

    if (mode !== undefined) {
      updates.mode = mode;
      // Reset remaining time based on new mode
      const dur = duration_ms !== undefined ? duration_ms : timer.duration_ms;
      updates.remaining_ms = mode === 'countdown' ? dur : 0;
    }

    if (remaining_ms !== undefined) {
      updates.remaining_ms = remaining_ms;
    }

    // Stop timer when setting new values
    updates.is_running = 0;
    updates.started_at = null;

    updateTimer(channel, updates);
    this.stopSync(channel);
    return this.getState(channel);
  }

  /**
   * Adjust timer by delta (positive or negative)
   */
  adjust(channel, delta_ms) {
    const timer = getOrCreateTimer(channel);
    const current_remaining = this.calculateRemaining(timer);
    const new_remaining = Math.max(0, current_remaining + delta_ms);

    if (timer.is_running) {
      // Update remaining and reset started_at to now
      updateTimer(channel, {
        remaining_ms: new_remaining,
        started_at: Date.now()
      });
    } else {
      updateTimer(channel, {
        remaining_ms: new_remaining
      });
    }

    return this.getState(channel);
  }

  /**
   * Update configuration/styling
   */
  updateConfig(channel, config) {
    updateTimer(channel, config);
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
    const timer = getOrCreateTimer(channel);

    switch (timer.end_behavior) {
      case 'stop':
      case 'confetti':
      case 'hide':
        updateTimer(channel, {
          is_running: 0,
          remaining_ms: 0,
          started_at: null
        });
        this.stopSync(channel);
        break;

      case 'negative':
        // Keep running into negative, but stop after max duration to prevent memory leak
        if (state.remaining_ms < -MAX_NEGATIVE_DURATION_MS) {
          updateTimer(channel, {
            is_running: 0,
            remaining_ms: state.remaining_ms,
            started_at: null
          });
          this.stopSync(channel);
        }
        break;
    }

    this.io.to(`channel:${channel}`).emit('timer:ended', {
      channel,
      behavior: timer.end_behavior
    });
  }

  /**
   * Restore running timers on server restart
   */
  restoreTimers() {
    const timers = getAllTimers();

    for (const timer of timers) {
      if (timer.is_running && timer.started_at) {
        const remaining_ms = this.calculateRemaining(timer);

        if (timer.mode === 'countdown' && remaining_ms <= 0) {
          switch (timer.end_behavior) {
            case 'stop':
            case 'hide':
            case 'confetti':
              // Timer ended while server was down - mark as stopped
              updateTimer(timer.channel, {
                is_running: 0,
                remaining_ms: 0,
                started_at: null
              });
              console.log(`Timer for channel ${timer.channel} ended while server was down`);
              continue;

            case 'negative':
              // Check if exceeded max negative duration
              if (remaining_ms < -MAX_NEGATIVE_DURATION_MS) {
                updateTimer(timer.channel, {
                  is_running: 0,
                  remaining_ms: remaining_ms,
                  started_at: null
                });
                console.log(`Timer for channel ${timer.channel} exceeded max negative duration`);
                continue;
              }
              // Otherwise, continue running in negative
              break;
          }
        }

        // Update the remaining time and reset started_at
        updateTimer(timer.channel, {
          remaining_ms,
          started_at: Date.now()
        });

        // Restart sync
        this.startSync(timer.channel);
        console.log(`Restored timer for channel: ${timer.channel}`);
      }
    }
  }
}

module.exports = TimerManager;
