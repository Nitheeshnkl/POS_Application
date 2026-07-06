-- 06_cashouts_snapshot.sql
-- Adds expected_total so Cashout History never depends on live bills
-- for the reconciliation anchor value.
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE cashouts
  ADD COLUMN IF NOT EXISTS expected_total NUMERIC(12,2);
