-- Safe additive migration for cashouts table
-- All statements use IF NOT EXISTS so re-running is harmless

ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS status      VARCHAR(20)    DEFAULT 'closed';
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS opened_at   TIMESTAMP;
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS closed_at   TIMESTAMP;
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS opening_cash NUMERIC(10,2) DEFAULT 0;
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS actual_cash  NUMERIC(10,2);
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS actual_gpay  NUMERIC(10,2);
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS difference   NUMERIC(10,2) DEFAULT 0;
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE cashouts ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP      DEFAULT NOW();

-- Drop the old unique index that blocked multiple daily saves
DROP INDEX IF EXISTS idx_one_open_drawer;
