-- Migration 001: add photo + soundtrack storage to the existing memories table.
-- Safe to run more than once (IF NOT EXISTS). Existing rows are kept;
-- they simply get an empty photo list and no soundtrack.
--
-- Run it in pgAdmin: Databases -> memory_db -> Query Tool, paste, Alt+F5 / F5.

ALTER TABLE memories ADD COLUMN IF NOT EXISTS photos     TEXT[] NOT NULL DEFAULT '{}'; -- ordered server paths, e.g. /uploads/photos/<id>.jpg
ALTER TABLE memories ADD COLUMN IF NOT EXISTS music_path TEXT;                         -- e.g. /uploads/music/<id>.mp3 (NULL = no soundtrack)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS music_name TEXT;                         -- original filename, for display only
