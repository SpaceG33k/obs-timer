const db = require('./connection');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS timers (
      channel TEXT PRIMARY KEY,

      -- Timer State
      mode TEXT DEFAULT 'countdown' CHECK(mode IN ('countdown', 'countup')),
      duration_ms INTEGER DEFAULT 300000,
      remaining_ms INTEGER DEFAULT 300000,
      is_running INTEGER DEFAULT 0,
      started_at INTEGER,
      end_behavior TEXT DEFAULT 'stop' CHECK(end_behavior IN ('stop', 'negative', 'hide', 'confetti')),

      -- Display Format
      format TEXT DEFAULT 'auto' CHECK(format IN ('auto', 'HH:MM:SS', 'MM:SS', 'SS')),

      -- Styling
      font_family TEXT DEFAULT '''Inter'', sans-serif',
      font_size INTEGER DEFAULT 72,
      font_weight INTEGER DEFAULT 600,
      text_color TEXT DEFAULT '#FFFFFF',
      shadow_enabled INTEGER DEFAULT 1,
      shadow_color TEXT DEFAULT 'rgba(0,0,0,0.8)',
      shadow_blur INTEGER DEFAULT 4,
      shadow_offset_x INTEGER DEFAULT 2,
      shadow_offset_y INTEGER DEFAULT 2,
      stroke_enabled INTEGER DEFAULT 1,
      stroke_color TEXT DEFAULT '#000000',
      stroke_width INTEGER DEFAULT 2,

      -- Metadata
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_timers_is_running ON timers(is_running);
    CREATE INDEX IF NOT EXISTS idx_timers_created_at ON timers(created_at);
    CREATE INDEX IF NOT EXISTS idx_timers_cleanup ON timers(is_running, updated_at);
  `);

  console.log('Database initialized');
}

module.exports = { initializeDatabase };
