-- Migration 002: Add users table for email/password authentication
-- and link memories to user accounts.
-- Safe to run more than once (IF NOT EXISTS).
--
-- Run in pgAdmin: Databases -> memory_db -> Query Tool, paste, F5
-- (Also applied automatically by the backend server on startup).

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
