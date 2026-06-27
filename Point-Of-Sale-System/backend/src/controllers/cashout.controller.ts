import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getTodaySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const params: any[] = [];
    let whereExtra = '';
    if (role === 'cashier') {
      whereExtra = ' AND cashier_id = $1';
      params.push(userId);
    }

    const result = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_mode='cash'   THEN grand_total ELSE 0 END),0) AS cash,
        COALESCE(SUM(CASE WHEN payment_mode='upi'    THEN grand_total ELSE 0 END),0) AS upi,
        COALESCE(SUM(CASE WHEN payment_mode='card'   THEN grand_total ELSE 0 END),0) AS card,
        COALESCE(SUM(CASE WHEN payment_mode='credit' THEN grand_total ELSE 0 END),0) AS credit,
        COALESCE(SUM(grand_total),0) AS total,
        COUNT(*) AS bill_count
       FROM bills
       WHERE DATE(created_at) = CURRENT_DATE AND payment_status = 'paid'${whereExtra}`,
      params
    );

    const existsResult = await pool.query(
      `SELECT id, closed_at FROM cashouts WHERE cashier_id = $1 AND cashout_date = CURRENT_DATE AND status = 'closed' LIMIT 1`,
      [userId]
    );

    res.json({
      ...result.rows[0],
      cashout_done: existsResult.rows.length > 0,
      cashout_closed_at: existsResult.rows[0]?.closed_at ?? null,
    });
  } catch (error) {
    next(error);
  }
};

export const createCashout = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user?.id;
    const { actual_cash, denomination_breakdown, notes } = req.body;

    const summaryResult = await client.query(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_mode='cash'   THEN grand_total ELSE 0 END),0) AS expected_cash,
        COALESCE(SUM(CASE WHEN payment_mode='upi'    THEN grand_total ELSE 0 END),0) AS expected_upi,
        COALESCE(SUM(CASE WHEN payment_mode='card'   THEN grand_total ELSE 0 END),0) AS expected_card,
        COALESCE(SUM(CASE WHEN payment_mode='credit' THEN grand_total ELSE 0 END),0) AS expected_credit,
        COUNT(*) AS bill_count
       FROM bills
       WHERE DATE(created_at) = CURRENT_DATE AND payment_status = 'paid' AND cashier_id = $1`,
      [userId]
    );

    const s = summaryResult.rows[0];

    const cashoutResult = await client.query(
      `INSERT INTO cashouts
         (cashier_id, cashout_date, expected_cash, expected_upi, expected_card, expected_credit,
          actual_cash, denomination_breakdown, notes, status, closed_at)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, 'closed', NOW())
       RETURNING *`,
      [
        userId,
        s.expected_cash,
        s.expected_upi,
        s.expected_card,
        s.expected_credit,
        actual_cash ?? null,
        denomination_breakdown ? JSON.stringify(denomination_breakdown) : null,
        notes ?? null,
      ]
    );

    const cashout = cashoutResult.rows[0];

    await client.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1,$2,$3,$4,$5)',
      [userId, 'CASHOUT', 'cashouts', cashout.id, JSON.stringify(cashout)]
    );

    await client.query('COMMIT');
    res.status(201).json(cashout);
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Cashout already recorded for today' });
    }
    next(error);
  } finally {
    client.release();
  }
};

export const getCashouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, cashier_id } = req.query;
    const role = req.user?.role;
    const userId = req.user?.id;

    let query = `
      SELECT c.*, u.name AS cashier_name
      FROM cashouts c
      JOIN users u ON c.cashier_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

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
