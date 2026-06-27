import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getTodaySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_mode = 'cash'   AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi'    AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS upi_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'card'   AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS card_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'credit' AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS credit_total,
        COALESCE(SUM(grand_total) FILTER (WHERE payment_status = 'paid'), 0)                                        AS grand_total,
        COUNT(*) FILTER (WHERE payment_status = 'paid')                                                             AS bill_count,
        COUNT(*) FILTER (WHERE payment_status = 'cancelled')                                                        AS cancelled_count
      FROM bills b
      WHERE DATE(b.created_at) = CURRENT_DATE
    `);

    const existsResult = await pool.query(
      `SELECT c.id, c.closed_at, u.name AS cashier_name
       FROM cashouts c
       JOIN users u ON u.id = c.cashier_id
       WHERE c.cashout_date = CURRENT_DATE
       LIMIT 1`
    );

    const row = result.rows[0];
    res.json({
      cash:             Number(row.cash_total),
      upi:              Number(row.upi_total),
      card:             Number(row.card_total),
      credit:           Number(row.credit_total),
      total:            Number(row.grand_total),
      bill_count:       Number(row.bill_count),
      cancelled_count:  Number(row.cancelled_count),
      cashout_done:     existsResult.rows.length > 0,
      cashout_closed_at: existsResult.rows[0]?.closed_at ?? null,
      cashout_cashier_name: existsResult.rows[0]?.cashier_name ?? null,
    });
  } catch (error) {
    next(error);
  }
};

export const createCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { actual_cash, actual_gpay, actual_card, denomination_breakdown, notes } = req.body;
    const userId = req.user?.id;

    // Always fetch expected totals server-side — never trust client
    const s = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_mode='cash'   AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_cash,
        COALESCE(SUM(CASE WHEN payment_mode='upi'    AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_upi,
        COALESCE(SUM(CASE WHEN payment_mode='card'   AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_card,
        COALESCE(SUM(CASE WHEN payment_mode='credit' AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_credit
      FROM bills WHERE DATE(created_at) = CURRENT_DATE
    `).then(r => r.rows[0]);

    const cashoutResult = await pool.query(`
      INSERT INTO cashouts
        (cashier_id, cashout_date, expected_cash, expected_upi, expected_card, expected_credit,
         actual_cash, actual_gpay, actual_card, denomination_breakdown, notes, status, closed_at)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'closed', NOW())
      ON CONFLICT (cashout_date) DO UPDATE SET
        actual_cash    = EXCLUDED.actual_cash,
        actual_gpay    = EXCLUDED.actual_gpay,
        actual_card    = EXCLUDED.actual_card,
        denomination_breakdown = EXCLUDED.denomination_breakdown,
        notes          = EXCLUDED.notes,
        closed_at      = NOW(),
        cashier_id     = EXCLUDED.cashier_id,
        expected_cash  = EXCLUDED.expected_cash,
        expected_upi   = EXCLUDED.expected_upi,
        expected_card  = EXCLUDED.expected_card,
        expected_credit = EXCLUDED.expected_credit
      RETURNING *
    `, [
      userId,
      s.expected_cash, s.expected_upi, s.expected_card, s.expected_credit,
      actual_cash ?? null,
      actual_gpay ?? null,
      actual_card ?? null,
      denomination_breakdown ? JSON.stringify(denomination_breakdown) : null,
      notes ?? null,
    ]);

    const cashout = cashoutResult.rows[0];

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1,$2,$3,$4,$5)',
      [userId, 'CASHOUT', 'cashouts', cashout.id, JSON.stringify(cashout)]
    );

    res.status(201).json(cashout);
  } catch (error: any) {
    next(error);
  }
};

export const getCashouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, cashier_id, date } = req.query;
    const role = req.user?.role;
    const userId = req.user?.id;

    let query = `
      SELECT c.*, u.name AS cashier_name
      FROM cashouts c
      JOIN users u ON c.cashier_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date === 'today') {
      query += ' AND c.cashout_date = CURRENT_DATE';
    }
    if (role === 'cashier') {
      query += ' AND c.cashier_id = $' + (params.length + 1);
      params.push(userId);
    } else if (cashier_id) {
      query += ' AND c.cashier_id = $' + (params.length + 1);
      params.push(cashier_id);
    }
    if (start_date) {
      query += ' AND c.cashout_date >= $' + (params.length + 1);
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND c.cashout_date <= $' + (params.length + 1);
      params.push(end_date);
    }

    query += ' ORDER BY c.cashout_date DESC, c.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getCashoutById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const result = await pool.query(
      `SELECT c.*, u.name AS cashier_name FROM cashouts c JOIN users u ON c.cashier_id = u.id WHERE c.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cashout not found' });

    const cashout = result.rows[0];
    if (role === 'cashier' && cashout.cashier_id !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(cashout);
  } catch (error) {
    next(error);
  }
};
