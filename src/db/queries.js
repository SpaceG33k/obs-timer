const db = require('./connection');

const defaultRoom = {
  mode: 'countdown',
  duration_ms: 300000,
  remaining_ms: 300000,
  is_running: 0,
  started_at: null,
  end_behavior: 'stop',
  format: 'auto',
  font_family: "'Roboto Mono', monospace",
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

function getRoom(channel) {
  return db.prepare('SELECT * FROM rooms WHERE channel = ?').get(channel);
}

function getOrCreateRoom(channel) {
  let room = getRoom(channel);

  if (!room) {
    const now = Date.now();
    db.prepare(`
      INSERT INTO rooms (channel, created_at, updated_at)
      VALUES (?, ?, ?)
    `).run(channel, now, now);
    room = getRoom(channel);
  }

  return room;
}

function updateRoom(channel, updates) {
  const room = getOrCreateRoom(channel);

  const allowedFields = [
    'mode', 'duration_ms', 'remaining_ms', 'is_running', 'started_at', 'end_behavior',
    'format', 'font_family', 'font_size', 'font_weight', 'text_color',
    'shadow_enabled', 'shadow_color', 'shadow_blur', 'shadow_offset_x', 'shadow_offset_y',
    'stroke_enabled', 'stroke_color', 'stroke_width'
  ];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
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

module.exports = {
  getRoom,
  getOrCreateRoom,
  updateRoom,
  getAllRooms,
  defaultRoom
};
