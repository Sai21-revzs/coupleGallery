-- Migration 004: Create sticky_notes table for page and memory/picture sticky notes.
-- Safe to run more than once (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS sticky_notes (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    memory_id   INTEGER REFERENCES memories(id) ON DELETE CASCADE,
    photo_index INTEGER,
    content     TEXT NOT NULL DEFAULT '',
    color       VARCHAR(20) NOT NULL DEFAULT 'yellow',
    pos_x       REAL NOT NULL DEFAULT 50,
    pos_y       REAL NOT NULL DEFAULT 50,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_id ON sticky_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_memory_id ON sticky_notes(memory_id);
