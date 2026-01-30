-- POS-282: Merge Agênere into Trans category
-- Consolidate gender demographics by merging "Agênere" into "Trans" category
--
-- This migration:
-- 1. Migrates existing gender_agender data into gender_trans
-- 2. Drops the gender_agender column from event_demographics_history table

-- Migrate existing data: add gender_agender to gender_trans
UPDATE event_demographics_history
SET gender_trans = COALESCE(gender_trans, 0) + COALESCE(gender_agender, 0)
WHERE gender_agender IS NOT NULL AND gender_agender > 0;

-- Drop the gender_agender column
ALTER TABLE event_demographics_history DROP COLUMN IF EXISTS gender_agender;
