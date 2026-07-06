import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

// ── computeDailyTotals ────────────────────────────────────────────────────────
// Queries live bills + expenses tables for the given date.
// Called ONLY by getCurrentDrawer and saveCashout.
// NEVER called by editCashout or getCashoutHistory.
async function computeDailyTotals(date: string) {
  const salesResult = await pool.query(
    `SELECT
       COALESCE(SUM(grand_total) FILTER (WHERE payment_mode = 'cash'), 0) AS cash_sales,
       COALESCE(SUM(grand_total) FILTER (WHERE payment_mode IN ('upi', 'card')), 0) AS gpay_sales
     FROM bills
     WHERE payment_status != 'cancelled' AND created_at::date = $1`,
    [date]
  );

  const expensesResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses WHERE date::date = $1`,
    [date]
  );

  return {
    cash_sales: Number(salesResult.rows[0].cash_sales),
    gpay_sales: Number(salesResult.rows[0].gpay_sales),
    expenses:   Number(expensesResult.rows[0].total_expenses),
  };
}

// ── buildCurrentRecord ────────────────────────────────────────────────────────
// Used ONLY by getCurrentDrawer. All values computed live from today's bills.
// Nothing is persisted yet. Expenses are fetched for backward-compat but
// never used in the reconciliation formula.
function buildCurrentRecord(
  row: any,
  totals: { cash_sales: number; gpay_sales: number; expenses: number }
) {
  const opening      = Number(row.opening_cash || 0);
  const expected_total = opening + totals.cash_sales + totals.gpay_sales;

  const actual_cash = row.actual_cash !== null && row.actual_cash !== undefined
    ? Number(row.actual_cash) : null;
  const actual_gpay = row.actual_gpay !== null && row.actual_gpay !== undefined
    ? Number(row.actual_gpay) : null;

  const actual_total = (actual_cash ?? 0) + (actual_gpay ?? 0);
  const difference   = actual_cash !== null
    ? actual_total - expected_total
    : null;
  const gpay_difference = actual_gpay !== null
    ? actual_gpay - totals.gpay_sales
    : null;

  return {
    id:              row.id,
    cashout_date:    row.cashout_date,
    opening_cash:    opening,
    cash_sales:      totals.cash_sales,
    gpay_sales:      totals.gpay_sales,
    expenses:        totals.expenses,        // kept for backward compat
    expected_cash:   expected_total,          // kept for backward compat
    expected_total,                           // new field
    actual_cash,
    actual_gpay,
    actual_total,                             // new field
    difference,
    gpay_difference,
    notes:           row.notes || '',
    opened_by_name:  row.opened_by_name,
  };
}

// ── buildHistoryRecord ────────────────────────────────────────────────────────
// Used ONLY by getCashoutHistory. Reads stored DB values exclusively.
// Zero calls to computeDailyTotals. Zero queries to bills or expenses.
// cash_sales / gpay_sales are not stored — returned as null (frontend shows —).
// expected_total is null for records saved before migration 06 (shows —).
function buildHistoryRecord(row: any) {
  const actual_cash = row.actual_cash !== null && row.actual_cash !== undefined
    ? Number(row.actual_cash) : null;
  const actual_gpay = row.actual_gpay !== null && row.actual_gpay !== undefined
    ? Number(row.actual_gpay) : null;

  const actual_total   = (actual_cash ?? 0) + (actual_gpay ?? 0);
  const expected_total = row.expected_total !== null && row.expected_total !== undefined
    ? Number(row.expected_total) : null;
  const difference     = row.difference !== null && row.difference !== undefined
    ? Number(row.difference) : null;

  return {
    id:             row.id,
    cashout_date:   row.cashout_date,
    opening_cash:   Number(row.opening_cash || 0),
    cash_sales:     null,          // not stored — frontend displays —
    gpay_sales:     null,          // not stored — frontend displays —
    expenses:       null,          // kept for backward compat
    expected_cash:  expected_total, // kept for backward compat
    expected_total,                 // new field — stored snapshot
    actual_cash,
    actual_gpay,
    actual_total,                   // new field
    difference,                     // stored at save time — never recomputed here
    gpay_difference: null,          // kept for backward compat
    notes:          row.notes || '',
    opened_by_name: row.opened_by_name,
  };
}

// ── getCurrentDrawer ──────────────────────────────────────────────────────────
// Live calculation from today's bills. Uses buildCurrentRecord.
export const getCurrentDrawer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS opened_by_name
       FROM cashouts c
       LEFT JOIN users u ON u.id = c.opened_by
       WHERE c.cashout_date = $1`,
      [today]
    );

    const totals = await computeDailyTotals(today);

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: buildCurrentRecord(
          { id: null, cashout_date: today, opening_cash: 0, actual_cash: null, actual_gpay: null, notes: '' },
          totals
        ),
      });
    }

    res.json({ success: true, data: buildCurrentRecord(rows[0], totals) });
  } catch (error) {
    next(error);
  }
};

// ── saveCashout ───────────────────────────────────────────────────────────────
// Persists a new cashout or updates today's record.
// Stores expected_total as a permanent snapshot of the new formula.
// After save, opening_cash and expected_total become immutable.
export const saveCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opening_cash = 0, actual_cash, actual_gpay = null, notes = '', date } = req.body;
    const cashout_date = date || new Date().toISOString().slice(0, 10);
    const opened_by = req.user?.id;

    const totals = await computeDailyTotals(cashout_date);

    // New formula: expenses do NOT participate
    const expected_total = Number(opening_cash) + totals.cash_sales + totals.gpay_sales;
    const actual_total   = Number(actual_cash ?? 0) + Number(actual_gpay ?? 0);
    const difference     = actual_cash !== undefined && actual_cash !== null
      ? actual_total - expected_total
      : 0;

    const { rows } = await pool.query(
      `INSERT INTO cashouts
         (opened_by, cashout_date, opening_cash, expected_total, actual_cash, actual_gpay, difference, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (cashout_date)
       DO UPDATE SET
         opening_cash   = EXCLUDED.opening_cash,
         expected_total = EXCLUDED.expected_total,
         actual_cash    = EXCLUDED.actual_cash,
         actual_gpay    = EXCLUDED.actual_gpay,
         difference     = EXCLUDED.difference,
         notes          = EXCLUDED.notes,
         updated_at     = CURRENT_TIMESTAMP
       RETURNING *`,
      [opened_by, cashout_date, opening_cash, expected_total, actual_cash, actual_gpay, difference, notes]
    );

    res.status(201).json({ success: true, data: buildCurrentRecord(rows[0], totals) });
  } catch (error) {
    next(error);
  }
};

// ── editCashout ───────────────────────────────────────────────────────────────
// Corrects counting mistakes only. Snapshot fields are immutable.
// Editable: actual_cash, actual_gpay, notes.
// difference is recalculated using the STORED expected_total — no live queries.
// NEVER calls computeDailyTotals. NEVER queries bills or expenses.
export const editCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { actual_cash, actual_gpay, notes } = req.body;

    const existing = await pool.query('SELECT * FROM cashouts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cashout record not found' });
    }

    const current = existing.rows[0];

    // Resolve new values — fall back to stored values if not provided
    const nextActualCash = actual_cash !== undefined ? actual_cash : current.actual_cash;
    const nextActualGpay = actual_gpay !== undefined ? actual_gpay : current.actual_gpay;
    const nextNotes      = notes      !== undefined ? notes       : current.notes;

    // Use stored expected_total — never recompute from live bills
    const storedExpected = Number(current.expected_total ?? 0);
    const newActualTotal = Number(nextActualCash ?? 0) + Number(nextActualGpay ?? 0);
    const newDifference  = nextActualCash !== null && nextActualCash !== undefined
      ? newActualTotal - storedExpected
      : 0;

    const { rows } = await pool.query(
      `UPDATE cashouts
       SET actual_cash = $1,
           actual_gpay = $2,
           difference  = $3,
           notes       = $4,
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [nextActualCash, nextActualGpay, newDifference, nextNotes, id]
    );

    res.json({ success: true, data: buildHistoryRecord(rows[0]) });
  } catch (error) {
    next(error);
  }
};

// ── getCashoutHistory ─────────────────────────────────────────────────────────
// Reads ONLY from the cashouts table. Zero live queries.
// Uses buildHistoryRecord — no computeDailyTotals calls.
// Single SQL query — no N+1 to bills/expenses.
export const getCashoutHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS opened_by_name
       FROM cashouts c
       LEFT JOIN users u ON u.id = c.opened_by
       ORDER BY c.cashout_date DESC
       LIMIT 90`
    );

    const data = rows.map(row => buildHistoryRecord(row));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const openDrawer  = saveCashout;
export const closeDrawer = saveCashout;
