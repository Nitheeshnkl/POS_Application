import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, credit_limit } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (name, phone, credit_limit) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, credit_limit || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ message: 'Phone number already exists' });
    }
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, credit_limit } = req.body;
    const result = await pool.query(
      'UPDATE customers SET name = COALESCE($1, name), phone = COALESCE($2, phone), credit_limit = COALESCE($3, credit_limit) WHERE id = $4 RETURNING *',
      [name, phone, credit_limit, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ message: 'Phone number already exists' });
    }
    next(error);
  }
};
