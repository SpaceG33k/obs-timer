const db = require('./connection');

function initializeDatabase() {
  // Check if we need to migrate the table (add confetti to end_behavior constraint)
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'").get();

  if (tableExists) {
    // Need to recreate table to update CHECK constraint - SQLite doesn't support ALTER CONSTRAINT
    db.exec(`
      -- Create new table with updated constraint
      CREATE TABLE IF NOT EXISTS rooms_new (
        channel TEXT PRIMARY KEY,
        mode TEXT DEFAULT 'countdown' CHECK(mode IN ('countdown', 'countup')),
        duration_ms INTEGER DEFAULT 300000,
        remaining_ms INTEGER DEFAULT 300000,
        is_running INTEGER DEFAULT 0,
        started_at INTEGER,
        end_behavior TEXT DEFAULT 'stop' CHECK(end_behavior IN ('stop', 'negative', 'hide', 'confetti')),
        format TEXT DEFAULT 'auto' CHECK(format IN ('auto', 'HH:MM:SS', 'MM:SS', 'SS')),
        font_family TEXT DEFAULT '''Roboto Mono'', monospace',
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
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      -- Copy data from old table
      INSERT OR IGNORE INTO rooms_new SELECT * FROM rooms;

      -- Drop old table and rename new one
      DROP TABLE rooms;
      ALTER TABLE rooms_new RENAME TO rooms;

      CREATE INDEX IF NOT EXISTS idx_rooms_channel ON rooms(channel);
      CREATE INDEX IF NOT EXISTS idx_rooms_is_running ON rooms(is_running);
      CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);
    `);
    console.log('Database migrated');
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
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
      font_family TEXT DEFAULT '''Roboto Mono'', monospace',
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

    CREATE INDEX IF NOT EXISTS idx_rooms_channel ON rooms(channel);
    CREATE INDEX IF NOT EXISTS idx_rooms_is_running ON rooms(is_running);
    CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);
  `);

  // Ensure any NULL values get defaults (for rooms created before all columns existed)
  db.exec(`
    UPDATE rooms SET
      mode = COALESCE(mode, 'countdown'),
      duration_ms = COALESCE(duration_ms, 300000),
      remaining_ms = COALESCE(remaining_ms, 300000),
      is_running = COALESCE(is_running, 0),
      end_behavior = COALESCE(end_behavior, 'stop'),
      format = COALESCE(format, 'auto'),
      font_family = COALESCE(font_family, '''Roboto Mono'', monospace'),
      font_size = COALESCE(font_size, 72),
      font_weight = COALESCE(font_weight, 600),
      text_color = COALESCE(text_color, '#FFFFFF'),
      shadow_enabled = COALESCE(shadow_enabled, 1),
      shadow_color = COALESCE(shadow_color, 'rgba(0,0,0,0.8)'),
      shadow_blur = COALESCE(shadow_blur, 4),
      shadow_offset_x = COALESCE(shadow_offset_x, 2),
      shadow_offset_y = COALESCE(shadow_offset_y, 2),
      stroke_enabled = COALESCE(stroke_enabled, 1),
      stroke_color = COALESCE(stroke_color, '#000000'),
      stroke_width = COALESCE(stroke_width, 2)
    WHERE mode IS NULL OR format IS NULL OR font_family IS NULL;
  `);

  console.log('Database initialized');
}

module.exports = { initializeDatabase };
