import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, string> = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        [key, String(value)]
      );
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
};
