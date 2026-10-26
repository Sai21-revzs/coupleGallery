-- Migration 005: Create bucket_list_items table for user bucket list.
-- Safe to run more than once (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS bucket_list_items (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL DEFAULT '',
    is_done     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bucket_list_user_id ON bucket_list_items(user_id);
