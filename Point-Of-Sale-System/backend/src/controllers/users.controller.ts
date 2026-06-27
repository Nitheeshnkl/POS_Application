import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT id, name, username, role, phone, is_active, created_at FROM users WHERE role = \'cashier\'');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, username, password, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, username, password, role, phone) VALUES ($1, $2, $3, \'cashier\', $4) RETURNING id, name, username, role, phone, is_active, created_at',
      [name, username, hashedPassword, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, is_active, password } = req.body;
    
    let query = 'UPDATE users SET name = $1, phone = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [name, phone, is_active];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = $' + (params.length + 1);
      params.push(hashedPassword);
    }

    query += ' WHERE id = $' + (params.length + 1) + ' RETURNING id, name, username, role, phone, is_active, created_at';
    params.push(id);

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};
