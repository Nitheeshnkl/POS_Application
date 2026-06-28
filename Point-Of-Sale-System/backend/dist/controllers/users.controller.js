import pool from '../config/db.js';
import bcrypt from 'bcrypt';
export const getUsers = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, name, username, role, phone, is_active, credit_limit, credit_used, created_at FROM users WHERE role = \'cashier\'');
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const createUser = async (req, res, next) => {
    try {
        const { name, username, password, phone, credit_limit } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query('INSERT INTO users (name, username, password, role, phone, credit_limit) VALUES ($1, $2, $3, \'cashier\', $4, $5) RETURNING id, name, username, role, phone, is_active, credit_limit, credit_used, created_at', [name, username, hashedPassword, phone, credit_limit || 0]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, is_active, password, credit_limit } = req.body;
        let query = 'UPDATE users SET name = $1, phone = $2, is_active = $3, credit_limit = COALESCE($4, credit_limit), updated_at = CURRENT_TIMESTAMP';
        const params = [name, phone, is_active, credit_limit];
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = $' + (params.length + 1);
            params.push(hashedPassword);
        }
        query += ' WHERE id = $' + (params.length + 1) + ' RETURNING id, name, username, role, phone, is_active, credit_limit, credit_used, created_at';
        params.push(id);
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const deactivateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, username, role, phone, is_active, created_at', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
