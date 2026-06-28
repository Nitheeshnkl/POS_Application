import pool from '../config/db.js';
export const getSuppliers = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Supplier not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const createSupplier = async (req, res, next) => {
    try {
        const { name, phone, email, gstin, address, notes } = req.body;
        const result = await pool.query('INSERT INTO suppliers (name, phone, email, gstin, address, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [name, phone, email, gstin, address, notes]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, email, gstin, address, notes } = req.body;
        const result = await pool.query('UPDATE suppliers SET name=$1, phone=$2, email=$3, gstin=$4, address=$5, notes=$6 WHERE id=$7 RETURNING *', [name, phone, email, gstin, address, notes, id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Supplier not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const getSupplierPurchases = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM purchases WHERE supplier_id = $1 ORDER BY created_at DESC', [id]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
