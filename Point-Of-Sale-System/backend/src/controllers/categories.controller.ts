import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name_en ASC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { name_en, name_ta } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categories (name_en, name_ta) VALUES ($1, $2) RETURNING *',
      [name_en, name_ta]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name_en, name_ta } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categories SET name_en = $1, name_ta = $2 WHERE id = $3 RETURNING *',
      [name_en, name_ta, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
