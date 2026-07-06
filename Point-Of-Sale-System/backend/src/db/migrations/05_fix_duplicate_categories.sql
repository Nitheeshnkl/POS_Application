-- =============================================================================
-- Migration: 05_fix_duplicate_categories.sql
-- Purpose:   Fix the category duplication bug caused by the seed in
--            01_initial_schema.sql running on every backend startup.
--            That INSERT used ON CONFLICT DO NOTHING but categories had
--            no UNIQUE constraint, so it inserted fresh rows every restart.
--
-- This migration:
--   1. Remaps products.category_id from duplicate IDs → canonical ID
--      (lowest id per name_en), preserving all product associations.
--   2. Deletes the now-unreferenced duplicate category rows.
--   3. Adds UNIQUE(name_en) so future ON CONFLICT (name_en) works correctly.
--   4. Re-seeds the 4 default categories — now truly idempotent.
--
-- Safe to run multiple times (fully idempotent).
-- =============================================================================

-- Step 1: Remap products.category_id from duplicate ids to the canonical
--         (lowest) id for each name_en group.
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT name_en, MIN(id) AS canonical_id
    FROM categories
    GROUP BY name_en
    HAVING COUNT(*) > 1
  LOOP
    UPDATE products
    SET    category_id = dup.canonical_id
    WHERE  category_id IN (
             SELECT id
             FROM   categories
             WHERE  name_en = dup.name_en
               AND  id <> dup.canonical_id
           );
  END LOOP;
END;
$$;

-- Step 2: Delete duplicate rows (non-canonical ids per name_en).
--         All products have already been remapped, so no FK violations occur.
DELETE FROM categories
WHERE id NOT IN (
  SELECT MIN(id)
  FROM   categories
  GROUP  BY name_en
);

-- Step 3: Add UNIQUE constraint on name_en.
--         Wrapped in a DO block so re-runs are safe if it already exists.
DO $$
BEGIN
  ALTER TABLE categories
    ADD CONSTRAINT categories_name_en_unique UNIQUE (name_en);
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- constraint already exists, nothing to do
END;
$$;

-- Step 4: Re-seed the 4 default categories.
--         ON CONFLICT (name_en) DO NOTHING is now truly idempotent because
--         the UNIQUE constraint above is in place.
INSERT INTO categories (name_en, name_ta) VALUES
  ('Groceries',         'மளிகை'),
  ('Beverages',         'பானங்கள்'),
  ('Snacks',            'தின்பண்டங்கள்'),
  ('Cleaning Supplies', 'சுத்தம் செய்யும் பொருட்கள்')
ON CONFLICT (name_en) DO NOTHING;
