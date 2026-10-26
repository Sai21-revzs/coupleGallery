-- Migration 006: Add relationship_date to users, and create daily_quotes table.
-- Safe to run more than once.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS relationship_date DATE;

CREATE TABLE IF NOT EXISTS daily_quotes (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quote_text TEXT NOT NULL DEFAULT '',
    quote_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_daily_quotes_user_date UNIQUE (user_id, quote_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_quotes_user_date ON daily_quotes(user_id, quote_date);
