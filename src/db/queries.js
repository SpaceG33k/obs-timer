const db = require('./connection');

const defaultRoom = {
  mode: 'countdown',
  duration_ms: 300000,
  remaining_ms: 300000,
  is_running: 0,
  started_at: null,
  end_behavior: 'stop',
  format: 'auto',
  font_family: "'Inter', sans-serif",
  font_size: 72,
  font_weight: 600,
  text_color: '#FFFFFF',
  shadow_enabled: 1,
  shadow_color: 'rgba(0,0,0,0.8)',
  shadow_blur: 4,
  shadow_offset_x: 2,
  shadow_offset_y: 2,
  stroke_enabled: 1,
  stroke_color: '#000000',
  stroke_width: 2
};

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

function getRoom(channel) {
  return db.prepare('SELECT * FROM rooms WHERE channel = ?').get(channel);
}

function getOrCreateRoom(channel) {
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO rooms (channel, created_at, updated_at)
    VALUES (?, ?, ?)
  `).run(channel, now, now);
  return getRoom(channel);
}

function updateRoom(channel, updates) {
  const room = getOrCreateRoom(channel);

  const filteredUpdates = {};
  for (const key of Object.keys(fieldValidators)) {
    if (updates[key] !== undefined) {
      const validator = fieldValidators[key];
      const validated = validator(updates[key]);
      if (validated !== null) {
        filteredUpdates[key] = validated;
      }
      // Skip invalid values silently - could log in debug mode if needed
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return room;
  }

  const setClauses = Object.keys(filteredUpdates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(filteredUpdates), Date.now(), channel];

  db.prepare(`
    UPDATE rooms SET ${setClauses}, updated_at = ? WHERE channel = ?
  `).run(...values);

  return getRoom(channel);
}

function getAllRooms() {
  return db.prepare('SELECT * FROM rooms').all();
}

function deleteStaleRooms(maxAgeDays = 30) {
  const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  const result = db.prepare(`
    DELETE FROM rooms
    WHERE is_running = 0 AND updated_at < ?
  `).run(cutoff);
  return result.changes;
}

module.exports = {
  getRoom,
  getOrCreateRoom,
  updateRoom,
  getAllRooms,
  deleteStaleRooms,
  defaultRoom
};
