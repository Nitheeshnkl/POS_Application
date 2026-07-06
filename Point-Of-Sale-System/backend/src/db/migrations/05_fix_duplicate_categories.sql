-- =============================================================================
-- Migration: 05_fix_duplicate_categories.sql
--
-- Purpose:
--   Fix duplicate categories caused by repeated startup migrations.
--
-- Safe to run multiple times.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Step 1: Remap products from duplicate category IDs to the canonical category.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    dup RECORD;
BEGIN
    FOR dup IN
        SELECT
            name_en,
            MIN(id) AS canonical_id
        FROM categories
        GROUP BY name_en
        HAVING COUNT(*) > 1
    LOOP
        UPDATE products
        SET category_id = dup.canonical_id
        WHERE category_id IN (
            SELECT id
            FROM categories
            WHERE name_en = dup.name_en
              AND id <> dup.canonical_id
        );
    END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- Step 2: Remove duplicate category rows.
-- -----------------------------------------------------------------------------

DELETE FROM categories
WHERE id NOT IN (
    SELECT MIN(id)
    FROM categories
    GROUP BY name_en
);

-- -----------------------------------------------------------------------------
-- Step 3: Add UNIQUE(name_en) only if it does not already exist.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'categories_name_en_unique'
          AND conrelid = 'categories'::regclass
    ) THEN
        ALTER TABLE categories
            ADD CONSTRAINT categories_name_en_unique
            UNIQUE (name_en);
    END IF;
END
$$;
-- -----------------------------------------------------------------------------
-- Step 4: Re-seed default categories.
-- -----------------------------------------------------------------------------

INSERT INTO categories (name_en, name_ta)
VALUES
    ('Groceries', 'மளிகை'),
    ('Beverages', 'பானங்கள்'),
    ('Snacks', 'தின்பண்டங்கள்'),
    ('Cleaning Supplies', 'சுத்தம் செய்யும் பொருட்கள்')
ON CONFLICT (name_en) DO NOTHING;

COMMIT;
