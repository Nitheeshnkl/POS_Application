import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, gstin, address, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO suppliers (name, phone, email, gstin, address, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, phone, email, gstin, address, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, email, gstin, address, notes } = req.body;
    const result = await pool.query(
      'UPDATE suppliers SET name=$1, phone=$2, email=$3, gstin=$4, address=$5, notes=$6 WHERE id=$7 RETURNING *',
      [name, phone, email, gstin, address, notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const getSupplierPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM purchases WHERE supplier_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getSupplierTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM supplier_transactions WHERE supplier_id = $1 ORDER BY created_at DESC', [id]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const addSupplierTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { type, amount, reference_id, notes } = req.body;

    const result = await client.query(
      'INSERT INTO supplier_transactions (supplier_id, type, amount, reference_id, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, type, amount, reference_id, notes]
    );

    // Update supplier balance
    // If it's a purchase, they owe more (balance increases). If it's a payment, balance decreases.
    const modifier = type === 'purchase' ? 1 : type === 'payment' ? -1 : 1; 
    await client.query(
      'UPDATE suppliers SET balance = balance + $1 WHERE id = $2',
      [amount * modifier, id]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
