const db = require('./connection');

// Field validators - return sanitized value or null if invalid
const fieldValidators = {
  mode: (v) => ['countdown', 'countup'].includes(v) ? v : null,
  duration_ms: (v) => typeof v === 'number' && v >= 0 && v <= 86400000 ? Math.floor(v) : null,
  remaining_ms: (v) => typeof v === 'number' && v >= -86400000 && v <= 86400000 ? Math.floor(v) : null,
  is_running: (v) => [0, 1].includes(v) ? v : null,
  started_at: (v) => v === null || (typeof v === 'number' && v > 0) ? v : null,
  end_behavior: (v) => ['stop', 'negative', 'hide', 'confetti'].includes(v) ? v : null,
  format: (v) => ['auto', 'HH:MM:SS', 'MM:SS', 'SS'].includes(v) ? v : null,
  font_family: (v) => typeof v === 'string' && v.length > 0 && v.length <= 200 ? v : null,
  font_size: (v) => typeof v === 'number' && v >= 8 && v <= 500 ? Math.floor(v) : null,
  font_weight: (v) => typeof v === 'number' && v >= 100 && v <= 900 ? Math.floor(v) : null,
  text_color: (v) => typeof v === 'string' && v.length > 0 && v.length <= 50 ? v : null,
  shadow_enabled: (v) => [0, 1].includes(v) ? v : null,
  shadow_color: (v) => typeof v === 'string' && v.length > 0 && v.length <= 50 ? v : null,
  shadow_blur: (v) => typeof v === 'number' && v >= 0 && v <= 100 ? Math.floor(v) : null,
  shadow_offset_x: (v) => typeof v === 'number' && v >= -50 && v <= 50 ? Math.floor(v) : null,
  shadow_offset_y: (v) => typeof v === 'number' && v >= -50 && v <= 50 ? Math.floor(v) : null,
  stroke_enabled: (v) => [0, 1].includes(v) ? v : null,
  stroke_color: (v) => typeof v === 'string' && v.length > 0 && v.length <= 50 ? v : null,
  stroke_width: (v) => typeof v === 'number' && v >= 0 && v <= 20 ? Math.floor(v) : null
};

function getTimer(channel) {
  return db.prepare('SELECT * FROM timers WHERE channel = ?').get(channel);
}

function getOrCreateTimer(channel) {
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO timers (channel, created_at, updated_at)
    VALUES (?, ?, ?)
  `).run(channel, now, now);
  return getTimer(channel);
}

function updateTimer(channel, updates) {
  const timer = getOrCreateTimer(channel);

  const filteredUpdates = {};
  for (const key of Object.keys(fieldValidators)) {
    if (updates[key] !== undefined) {
      const validator = fieldValidators[key];
      const validated = validator(updates[key]);
      if (validated !== null) {
        filteredUpdates[key] = validated;
      }
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return timer;
  }

  const setClauses = Object.keys(filteredUpdates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(filteredUpdates), Date.now(), channel];

  db.prepare(`
    UPDATE timers SET ${setClauses}, updated_at = ? WHERE channel = ?
  `).run(...values);

  return getTimer(channel);
}

function getAllTimers() {
  return db.prepare('SELECT * FROM timers').all();
}

function deleteStaleTimers(maxAgeDays = 30) {
  const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  const result = db.prepare(`
    DELETE FROM timers
    WHERE is_running = 0 AND updated_at < ?
  `).run(cutoff);
  return result.changes;
}

module.exports = {
  getTimer,
  getOrCreateTimer,
  updateTimer,
  getAllTimers,
  deleteStaleTimers
};
