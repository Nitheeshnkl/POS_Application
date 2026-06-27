import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const todaySalesResult = await pool.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count FROM bills WHERE DATE(created_at) = CURRENT_DATE AND payment_status != 'cancelled'"
    );
    const todayItemsResult = await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM bill_items bi JOIN bills b ON bi.bill_id = b.id WHERE DATE(b.created_at) = CURRENT_DATE AND b.payment_status != 'cancelled'"
    );
    const todayExpensesResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE(created_at) = CURRENT_DATE"
    );
    const todayCogsResult = await pool.query(`
      SELECT COALESCE(SUM(bi.quantity * p.purchase_price), 0) as total
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN products p ON bi.product_id = p.id
      WHERE DATE(b.created_at) = CURRENT_DATE AND b.payment_status != 'cancelled'
    `);
    const paymentModesResult = await pool.query(`
      SELECT payment_mode, SUM(grand_total) as total
      FROM bills
      WHERE DATE(created_at) = CURRENT_DATE AND payment_status = 'paid'
      GROUP BY payment_mode
    `);

    const monthSalesResult = await pool.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND payment_status != 'cancelled'"
    );
    const monthPurchasesResult = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)"
    );
    const monthExpensesResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)"
    );

    const todaySales = Number(todaySalesResult.rows[0].total);
    const todayCogs = Number(todayCogsResult.rows[0].total);
    const todayExpenses = Number(todayExpensesResult.rows[0].total);
    const todayProfit = todaySales - todayCogs - todayExpenses;

    res.json({
      today: {
        sales: todaySales,
        bills: Number(todaySalesResult.rows[0].count),
        items_sold: Number(todayItemsResult.rows[0].total),
        profit: todayProfit,
        payment_modes: paymentModesResult.rows,
      },
      thisMonth: {
        sales: Number(monthSalesResult.rows[0].total),
        purchases: Number(monthPurchasesResult.rows[0].total),
        expenses: Number(monthExpensesResult.rows[0].total),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, cashier_id, payment_mode } = req.query;
    let query =
      "SELECT b.*, u.name as cashier_name FROM bills b LEFT JOIN users u ON b.cashier_id = u.id WHERE b.payment_status != 'cancelled'";
    const params: any[] = [];

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
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getStockReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name_en, p.name_ta, p.current_stock, p.unit_type, p.purchase_price, 
        (p.current_stock * p.purchase_price) as valuation,
        c.name_en as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      ORDER BY p.current_stock DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getPurchasesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query;
    let query = 'SELECT * FROM purchases WHERE 1=1';
    const params: any[] = [];
    if (start_date) {
      query += ' AND created_at >= $' + (params.length + 1);
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= $' + (params.length + 1);
      params.push(end_date);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getProfitLossReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const dateStr = `${year}-${month}-01`;

    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE DATE_TRUNC('month', created_at) = $1 AND payment_status != 'cancelled'",
      [dateStr]
    );
    const expensesResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE_TRUNC('month', created_at) = $1",
      [dateStr]
    );
    const cogsResult = await pool.query(
      `SELECT COALESCE(SUM(bi.quantity * p.purchase_price), 0) as total
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       JOIN products p ON bi.product_id = p.id
       WHERE DATE_TRUNC('month', b.created_at) = $1 AND b.payment_status != 'cancelled'`,
      [dateStr]
    );

    const revenue = Number(revenueResult.rows[0].total);
    const expenses = Number(expensesResult.rows[0].total);
    const cogs = Number(cogsResult.rows[0].total);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    res.json({ revenue, cogs, grossProfit, expenses, netProfit });
  } catch (error) {
    next(error);
  }
};

export const getGstReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const dateStr = `${year}-${month}-01`;

    const result = await pool.query(
      `SELECT 
        gst_rate,
        SUM(line_total / (1 + gst_rate/100) * (gst_rate/100)) as total_gst,
        SUM(line_total / (1 + gst_rate/100)) as taxable_amount
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE DATE_TRUNC('month', b.created_at) = $1 AND b.payment_status != 'cancelled'
       GROUP BY gst_rate`,
      [dateStr]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getCashierPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT 
        u.name,
        COUNT(b.id) as bill_count,
        COALESCE(SUM(b.grand_total), 0) as total_sales
      FROM users u
      LEFT JOIN bills b ON u.id = b.cashier_id AND b.payment_status != 'cancelled'
      WHERE u.role = 'cashier'
    `;
    const params: any[] = [];
    if (start_date) {
      query += ' AND b.created_at >= $' + (params.length + 1);
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND b.created_at <= $' + (params.length + 1);
      params.push(end_date);
    }
    query += ' GROUP BY u.id, u.name ORDER BY total_sales DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;
    let query = `
      SELECT 
        p.name_en as name,
        SUM(bi.quantity) as total_qty,
        SUM(bi.line_total) as total_sales
      FROM bill_items bi
      JOIN products p ON bi.product_id = p.id
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.payment_status != 'cancelled'
    `;
    const params: any[] = [];
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

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getDailySales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(grand_total) as total
       FROM bills
       WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1 AND payment_status != 'cancelled'
       GROUP BY date
       ORDER BY date ASC`,
      [days]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getMonthlySales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { months = 12 } = req.query;
    const result = await pool.query(
      `SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(grand_total) as total
       FROM bills
       WHERE created_at >= CURRENT_DATE - INTERVAL '1 month' * $1 AND payment_status != 'cancelled'
       GROUP BY month
       ORDER BY month ASC`,
      [months]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
