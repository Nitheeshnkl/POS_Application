import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    const result = await pool.query(
      'SELECT * FROM notifications WHERE target_role = $1 OR target_role = \'all\' ORDER BY created_at DESC',
      [role]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE target_role = $1 OR target_role = \'all\'', [role]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
