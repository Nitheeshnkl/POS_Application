import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getRequestedProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as requested_by_name 
       FROM requested_products r 
       LEFT JOIN users u ON r.requested_by = u.id 
       ORDER BY r.requested_count DESC, r.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createRequestedProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { product_name, product_name_ta, notes } = req.body;
  try {
    // Check if it already exists
    const existing = await pool.query(
      'SELECT id FROM requested_products WHERE product_name ILIKE $1 OR (product_name_ta IS NOT NULL AND product_name_ta ILIKE $2)',
      [product_name, product_name_ta || '']
    );

    if (existing.rowCount && existing.rowCount > 0) {
      // Increment count
      const result = await pool.query(
        'UPDATE requested_products SET requested_count = requested_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [existing.rows[0].id]
      );
      return res.json(result.rows[0]);
    }

    const result = await pool.query(
      `INSERT INTO requested_products (product_name, product_name_ta, notes, requested_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [product_name, product_name_ta, notes, req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateRequestedProductStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE requested_products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Requested product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
