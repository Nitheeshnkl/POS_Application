"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlySales = exports.getDailySales = exports.getTopProducts = exports.getCashierPerformance = exports.getGstReport = exports.getProfitLossReport = exports.getPurchasesReport = exports.getStockReport = exports.getSalesReport = exports.getDashboardMetrics = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getDashboardMetrics = async (req, res, next) => {
    try {
        // Today metrics
        const todaySalesResult = await db_js_1.default.query('SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count FROM bills WHERE DATE(created_at) = CURRENT_DATE AND payment_status != \'cancelled\'');
        const todayItemsResult = await db_js_1.default.query('SELECT COALESCE(SUM(quantity), 0) as total FROM bill_items bi JOIN bills b ON bi.bill_id = b.id WHERE DATE(b.created_at) = CURRENT_DATE AND b.payment_status != \'cancelled\'');
        // Monthly metrics
        const monthSalesResult = await db_js_1.default.query('SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', CURRENT_DATE) AND payment_status != \'cancelled\'');
        const monthPurchasesResult = await db_js_1.default.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', CURRENT_DATE)');
        const monthExpensesResult = await db_js_1.default.query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', CURRENT_DATE)');
        res.json({
            today: {
                sales: Number(todaySalesResult.rows[0].total),
                bills: Number(todaySalesResult.rows[0].count),
                items_sold: Number(todayItemsResult.rows[0].total)
            },
            thisMonth: {
                sales: Number(monthSalesResult.rows[0].total),
                purchases: Number(monthPurchasesResult.rows[0].total),
                expenses: Number(monthExpensesResult.rows[0].total)
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardMetrics = getDashboardMetrics;
const getSalesReport = async (req, res, next) => {
    try {
        const { start_date, end_date, cashier_id, payment_mode } = req.query;
        let query = 'SELECT b.*, u.name as cashier_name FROM bills b LEFT JOIN users u ON b.cashier_id = u.id WHERE b.payment_status != \'cancelled\'';
        const params = [];
        if (start_date) {
            query += ' AND b.created_at >= $' + (params.length + 1);
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND b.created_at <= $' + (params.length + 1);
            params.push(end_date);
        }
        if (cashier_id) {
            query += ' AND b.cashier_id = $' + (params.length + 1);
            params.push(cashier_id);
        }
        if (payment_mode) {
            query += ' AND b.payment_mode = $' + (params.length + 1);
            params.push(payment_mode);
        }
        query += ' ORDER BY b.created_at DESC';
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getSalesReport = getSalesReport;
const getStockReport = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query(`
      SELECT 
        id, name_en, name_ta, current_stock, unit_type, purchase_price, 
        (current_stock * purchase_price) as valuation
      FROM products 
      WHERE is_active = TRUE
      ORDER BY current_stock DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getStockReport = getStockReport;
const getPurchasesReport = async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        let query = 'SELECT * FROM purchases WHERE 1=1';
        const params = [];
        if (start_date) {
            query += ' AND created_at >= $' + (params.length + 1);
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND created_at <= $' + (params.length + 1);
            params.push(end_date);
        }
        query += ' ORDER BY created_at DESC';
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPurchasesReport = getPurchasesReport;
const getProfitLossReport = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const dateStr = `${year}-${month}-01`;
        const revenueResult = await db_js_1.default.query('SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE DATE_TRUNC(\'month\', created_at) = $1 AND payment_status != \'cancelled\'', [dateStr]);
        const expensesResult = await db_js_1.default.query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE_TRUNC(\'month\', created_at) = $1', [dateStr]);
        // COGS estimation: Sum of (quantity * purchase_price at time of sale)
        // For simplicity, we'll use current purchase_price from products join
        const cogsResult = await db_js_1.default.query(`
      SELECT COALESCE(SUM(bi.quantity * p.purchase_price), 0) as total
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN products p ON bi.product_id = p.id
      WHERE DATE_TRUNC('month', b.created_at) = $1 AND b.payment_status != 'cancelled'
    `, [dateStr]);
        const revenue = Number(revenueResult.rows[0].total);
        const expenses = Number(expensesResult.rows[0].total);
        const cogs = Number(cogsResult.rows[0].total);
        const grossProfit = revenue - cogs;
        const netProfit = grossProfit - expenses;
        res.json({
            revenue,
            cogs,
            grossProfit,
            expenses,
            netProfit
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfitLossReport = getProfitLossReport;
const getGstReport = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const dateStr = `${year}-${month}-01`;
        const result = await db_js_1.default.query(`
      SELECT 
        gst_rate,
        SUM(line_total / (1 + gst_rate/100) * (gst_rate/100)) as total_gst,
        SUM(line_total / (1 + gst_rate/100)) as taxable_amount
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE DATE_TRUNC('month', b.created_at) = $1 AND b.payment_status != 'cancelled'
      GROUP BY gst_rate
    `, [dateStr]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getGstReport = getGstReport;
const getCashierPerformance = async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
      SELECT 
        u.name,
        COUNT(b.id) as bill_count,
        SUM(b.grand_total) as total_sales
      FROM users u
      LEFT JOIN bills b ON u.id = b.cashier_id
      WHERE u.role = 'cashier'
    `;
        const params = [];
        if (start_date) {
            query += ' AND b.created_at >= $' + (params.length + 1);
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND b.created_at <= $' + (params.length + 1);
            params.push(end_date);
        }
        query += ' GROUP BY u.id, u.name';
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getCashierPerformance = getCashierPerformance;
const getTopProducts = async (req, res, next) => {
    try {
        const { start_date, end_date, limit = 10 } = req.query;
        let query = `
      SELECT 
        p.name_en,
        SUM(bi.quantity) as total_qty,
        SUM(bi.line_total) as total_sales
      FROM bill_items bi
      JOIN products p ON bi.product_id = p.id
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.payment_status != 'cancelled'
    `;
        const params = [];
        if (start_date) {
            query += ' AND b.created_at >= $' + (params.length + 1);
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND b.created_at <= $' + (params.length + 1);
            params.push(end_date);
        }
        query += ' GROUP BY p.id, p.name_en ORDER BY total_qty DESC LIMIT $' + (params.length + 1);
        params.push(limit);
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getTopProducts = getTopProducts;
const getDailySales = async (req, res, next) => {
    try {
        const { days = 30 } = req.query;
        const result = await db_js_1.default.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(grand_total) as total
      FROM bills
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1 AND payment_status != 'cancelled'
      GROUP BY date
      ORDER BY date ASC
    `, [days]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getDailySales = getDailySales;
const getMonthlySales = async (req, res, next) => {
    try {
        const { months = 12 } = req.query;
        const result = await db_js_1.default.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(grand_total) as total
      FROM bills
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 month' * $1 AND payment_status != 'cancelled'
      GROUP BY month
      ORDER BY month ASC
    `, [months]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getMonthlySales = getMonthlySales;
