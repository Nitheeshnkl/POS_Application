import pool from '../config/db.js';
export const getExpenses = async (req, res, next) => {
    try {
        const { start_date, end_date, category } = req.query;
        let query = 'SELECT * FROM expenses WHERE 1=1';
        const params = [];
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
    }
    catch (error) {
        next(error);
    }
};
export const createExpense = async (req, res, next) => {
    try {
        const { category, description, amount, date, payment_mode } = req.body;
        const created_by = req.user?.id;
        const result = await pool.query('INSERT INTO expenses (category, description, amount, date, payment_mode, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [category, description, amount, date || new Date(), payment_mode, created_by]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
export const getMonthlyExpenses = async (req, res, next) => {
    try {
        const { start_date, end_date, category } = req.query;
        let query = 'SELECT COALESCE(SUM(amount), 0) AS total_this_month, COUNT(*) AS count FROM expenses WHERE 1=1';
        const params = [];
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
        const result = await pool.query(query, params);
        res.json({
            totalThisMonth: Number(result.rows[0].total_this_month),
            count: Number(result.rows[0].count)
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category, description, amount, date, payment_mode } = req.body;
        if (!category || typeof category !== 'string' || category.trim() === '') {
            return res.status(400).json({ success: false, message: 'Category is required' });
        }
        if (amount === undefined || amount === null || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Valid date is required' });
        }
        const checkResult = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        const result = await pool.query(`UPDATE expenses 
       SET category = $1, description = $2, amount = $3, date = $4, payment_mode = $5
       WHERE id = $6 
       RETURNING *`, [category, description, amount, date, payment_mode, id]);
        res.json({
            success: true,
            message: 'Expense updated',
            data: result.rows[0]
        });
    }
    catch (error) {
        next(error);
    }
};
