"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlyExpenses = exports.createExpense = exports.getExpenses = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getExpenses = async (req, res, next) => {
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
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getExpenses = getExpenses;
const createExpense = async (req, res, next) => {
    try {
        const { category, description, amount, date, payment_mode } = req.body;
        const created_by = req.user?.id;
        const result = await db_js_1.default.query('INSERT INTO expenses (category, description, amount, date, payment_mode, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [category, description, amount, date || new Date(), payment_mode, created_by]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.createExpense = createExpense;
const getMonthlyExpenses = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query(`
      SELECT 
        category,
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(amount) as total
      FROM expenses
      GROUP BY category, month
      ORDER BY month DESC, total DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getMonthlyExpenses = getMonthlyExpenses;
