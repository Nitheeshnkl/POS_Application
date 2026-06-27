import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, category } = req.query;
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];

    if (start_date) {
      query += ' AND date >= $' + (params.length + 1);
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date <= $' + (params.length + 1);
      params.push(end_date);
    }

    if (category) {
      query += ' AND category = $' + (params.length + 1);
      params.push(category);
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, description, amount, date, payment_mode } = req.body;
    const created_by = req.user?.id;

    const result = await pool.query(
      'INSERT INTO expenses (category, description, amount, date, payment_mode, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [category, description, amount, date || new Date(), payment_mode, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getMonthlyExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(amount) as total
      FROM expenses
      GROUP BY category, month
      ORDER BY month DESC, total DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
