-- Migration 004: remove icon column from categories
ALTER TABLE categories DROP COLUMN IF EXISTS icon;
