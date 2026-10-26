-- Migration 003: Add username and avatar_path to users table.
-- Safe to run more than once (IF NOT EXISTS).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- Populate username for any existing users created before username was added
UPDATE users
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL OR BTRIM(username) = '';
