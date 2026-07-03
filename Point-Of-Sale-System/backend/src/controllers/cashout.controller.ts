import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

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
    expenses: Number(expensesResult.rows[0].total_expenses),
  };
}

function buildRecord(row: any, totals: { cash_sales: number; gpay_sales: number; expenses: number }) {
  const expected_cash = Number(row.opening_cash || 0) + totals.cash_sales - totals.expenses;
  const difference =
    row.actual_cash !== null && row.actual_cash !== undefined
      ? Number(row.actual_cash) - expected_cash
      : null;
  const gpay_difference =
    row.actual_gpay !== null && row.actual_gpay !== undefined
      ? Number(row.actual_gpay) - totals.gpay_sales
      : null;

  return {
    id: row.id,
    cashout_date: row.cashout_date,
    opening_cash: Number(row.opening_cash || 0),
    cash_sales: totals.cash_sales,
    gpay_sales: totals.gpay_sales,
    expenses: totals.expenses,
    expected_cash,
    actual_cash: row.actual_cash !== null && row.actual_cash !== undefined ? Number(row.actual_cash) : null,
    actual_gpay: row.actual_gpay !== null && row.actual_gpay !== undefined ? Number(row.actual_gpay) : null,
    difference,
    gpay_difference,
    notes: row.notes || '',
    opened_by_name: row.opened_by_name,
  };
}

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
        data: buildRecord(
          { id: null, cashout_date: today, opening_cash: 0, actual_cash: null, actual_gpay: null, notes: '' },
          totals
        ),
      });
    }

    res.json({ success: true, data: buildRecord(rows[0], totals) });
  } catch (error) {
    next(error);
  }
};

export const saveCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opening_cash = 0, actual_cash, actual_gpay = null, notes = '', date } = req.body;
    const cashout_date = date || new Date().toISOString().slice(0, 10);
    const opened_by = req.user?.id;

    const totals = await computeDailyTotals(cashout_date);
    const expected_cash = Number(opening_cash) + totals.cash_sales - totals.expenses;
    const difference = actual_cash !== undefined && actual_cash !== null ? Number(actual_cash) - expected_cash : 0;

    const { rows } = await pool.query(
      `INSERT INTO cashouts (opened_by, cashout_date, opening_cash, actual_cash, actual_gpay, difference, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (cashout_date)
       DO UPDATE SET opening_cash = EXCLUDED.opening_cash,
                     actual_cash = EXCLUDED.actual_cash,
                     actual_gpay = EXCLUDED.actual_gpay,
                     difference = EXCLUDED.difference,
                     notes = EXCLUDED.notes,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [opened_by, cashout_date, opening_cash, actual_cash, actual_gpay, difference, notes]
    );

    res.status(201).json({ success: true, data: buildRecord(rows[0], totals) });
  } catch (error) {
    next(error);
  }
};

export const editCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { opening_cash, actual_cash, actual_gpay, notes } = req.body;

    const existing = await pool.query('SELECT * FROM cashouts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cashout record not found' });
    }

    const current = existing.rows[0];
    const nextOpeningCash = opening_cash !== undefined ? opening_cash : current.opening_cash;
    const nextActualCash = actual_cash !== undefined ? actual_cash : current.actual_cash;
    const nextActualGpay = actual_gpay !== undefined ? actual_gpay : current.actual_gpay;
    const nextNotes = notes !== undefined ? notes : current.notes;

    const cashoutDate = current.cashout_date.toISOString ? current.cashout_date.toISOString().slice(0, 10) : current.cashout_date;
    const totals = await computeDailyTotals(cashoutDate);
    const expected_cash = Number(nextOpeningCash || 0) + totals.cash_sales - totals.expenses;
    const difference = nextActualCash !== null && nextActualCash !== undefined ? Number(nextActualCash) - expected_cash : 0;

    const { rows } = await pool.query(
      `UPDATE cashouts
       SET opening_cash = $1, actual_cash = $2, actual_gpay = $3, difference = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [nextOpeningCash, nextActualCash, nextActualGpay, difference, nextNotes, id]
    );

    res.json({ success: true, data: buildRecord(rows[0], totals) });
  } catch (error) {
    next(error);
  }
};

export const getCashoutHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS opened_by_name
       FROM cashouts c
       LEFT JOIN users u ON u.id = c.opened_by
       ORDER BY c.cashout_date DESC
       LIMIT 90`
    );

    const data = [];
    for (const row of rows) {
      const cashoutDate = row.cashout_date.toISOString ? row.cashout_date.toISOString().slice(0, 10) : row.cashout_date;
      const totals = await computeDailyTotals(cashoutDate);
      data.push(buildRecord(row, totals));
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const openDrawer = saveCashout;
export const closeDrawer = saveCashout;
