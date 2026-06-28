import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';

const getQueryParams = (req: Request) => {
  const { start_date, end_date, page = '1', limit = '1000' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  return { start_date, end_date, limit: Number(limit), offset };
};

export const exportBills = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, limit, offset } = getQueryParams(req);
    const baseQuery = `
      SELECT 
        b.bill_number as "Bill No", 
        b.created_at as "Date",
        u.name as "Cashier",
        b.customer_name as "Customer",
        (SELECT COUNT(*) FROM bill_items bi WHERE bi.bill_id = b.id) as "Items Count",
        b.subtotal as "Subtotal",
        b.gst_total as "GST",
        b.discount_total as "Discount",
        b.grand_total as "Total",
        b.payment_mode as "Payment Mode"
      FROM bills b 
      LEFT JOIN users u ON b.cashier_id = u.id 
      WHERE b.payment_status != 'cancelled'
    `;
    
    let query = baseQuery;
    const params: any[] = [];
    if (start_date) { params.push(start_date); query += ` AND b.created_at >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND b.created_at <= $${params.length}`; }
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    let result = await pool.query(query, params);
    
    if (result.rows.length === 0 && (start_date || end_date)) {
      result = await pool.query(`${baseQuery} ORDER BY b.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    }
    
    res.json(result.rows);
  } catch (error) { next(error); }
};

export const exportCashout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, limit, offset } = getQueryParams(req);
    const baseQuery = `
      SELECT 
        c.cashout_date as "Date",
        c.opening_cash as "Opening Cash",
        c.actual_cash as "Cash Sales",
        c.actual_gpay as "UPI Sales",
        c.expenses as "Expenses",
        (c.opening_cash + c.actual_cash - c.expenses) as "Closing Cash",
        (c.actual_cash - c.system_cash) as "Difference",
        u.name as "Cashier"
      FROM cashouts c
      LEFT JOIN users u ON c.performed_by = u.id
      WHERE c.status = 'closed'
    `;
    
    let query = baseQuery;
    const params: any[] = [];
    if (start_date) { params.push(start_date); query += ` AND c.cashout_date >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND c.cashout_date <= $${params.length}`; }
    query += ` ORDER BY c.cashout_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    let result = await pool.query(query, params);
    
    if (result.rows.length === 0 && (start_date || end_date)) {
      result = await pool.query(`${baseQuery} ORDER BY c.cashout_date DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    }
    
    res.json(result.rows);
  } catch (error) { next(error); }
};

export const exportInvestment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, limit, offset } = getQueryParams(req);
    const baseQuery = `
      SELECT 
        p.created_at as "Date",
        s.name as "Supplier",
        p.total_amount as "Purchase Value",
        p.paid_amount as "Paid Amount",
        (p.total_amount - p.paid_amount) as "Outstanding",
        p.payment_mode as "Category"
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    
    let query = baseQuery;
    const params: any[] = [];
    if (start_date) { params.push(start_date); query += ` AND p.created_at >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND p.created_at <= $${params.length}`; }
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    let result = await pool.query(query, params);
    
    if (result.rows.length === 0 && (start_date || end_date)) {
      result = await pool.query(`${baseQuery} ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    }

    res.json(result.rows);
  } catch (error) { next(error); }
};

export const exportPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, limit, offset } = getQueryParams(req);
    const baseQuery = `
      SELECT 
        p.invoice_number as "Invoice No",
        s.name as "Supplier",
        (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as "Items",
        (SELECT COALESCE(SUM(quantity), 0) FROM purchase_items pi WHERE pi.purchase_id = p.id) as "Quantity",
        p.total_amount as "Total",
        p.payment_mode as "Payment Mode"
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    
    let query = baseQuery;
    const params: any[] = [];
    if (start_date) { params.push(start_date); query += ` AND p.created_at >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND p.created_at <= $${params.length}`; }
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    let result = await pool.query(query, params);
    
    if (result.rows.length === 0 && (start_date || end_date)) {
      result = await pool.query(`${baseQuery} ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    }

    res.json(result.rows);
  } catch (error) { next(error); }
};

export const exportExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, limit, offset } = getQueryParams(req);
    const baseQuery = `
      SELECT 
        category as "Category",
        description as "Description",
        amount as "Amount",
        date as "Date"
      FROM expenses
      WHERE 1=1
    `;
    
    let query = baseQuery;
    const params: any[] = [];
    if (start_date) { params.push(start_date); query += ` AND date >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND date <= $${params.length}`; }
    query += ` ORDER BY date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    let result = await pool.query(query, params);
    
    if (result.rows.length === 0 && (start_date || end_date)) {
      result = await pool.query(`${baseQuery} ORDER BY date DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    }

    res.json(result.rows);
  } catch (error) { next(error); }
};

export const exportProfitLoss = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { start_date, end_date } = getQueryParams(req);
    
    const getQuery = (sd: any, ed: any) => `
      WITH DateList AS (
        SELECT generate_series(
          COALESCE($1::date, CURRENT_DATE - INTERVAL '30 days'), 
          COALESCE($2::date, CURRENT_DATE), 
          '1 day'::interval
        )::date AS day
      ),
      SalesData AS (
        SELECT DATE(created_at) as day, SUM(grand_total) as sales 
        FROM bills WHERE payment_status != 'cancelled' GROUP BY DATE(created_at)
      ),
      CogsData AS (
        SELECT DATE(b.created_at) as day, SUM(bi.quantity * p.purchase_price) as cogs
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        JOIN products p ON bi.product_id = p.id
        WHERE b.payment_status != 'cancelled'
        GROUP BY DATE(b.created_at)
      ),
      PurchasesData AS (
        SELECT DATE(created_at) as day, SUM(total_amount) as purchases 
        FROM purchases GROUP BY DATE(created_at)
      ),
      ExpensesData AS (
        SELECT date as day, SUM(amount) as expenses 
        FROM expenses GROUP BY date
      )
      SELECT 
        d.day as "Date",
        COALESCE(s.sales, 0) as "Sales",
        COALESCE(p.purchases, 0) as "Purchases",
        COALESCE(e.expenses, 0) as "Expenses",
        COALESCE(s.sales, 0) - COALESCE(c.cogs, 0) as "Gross Profit",
        COALESCE(s.sales, 0) - COALESCE(c.cogs, 0) - COALESCE(e.expenses, 0) as "Net Profit"
      FROM DateList d
      LEFT JOIN SalesData s ON d.day = s.day
      LEFT JOIN CogsData c ON d.day = c.day
      LEFT JOIN PurchasesData p ON d.day = p.day
      LEFT JOIN ExpensesData e ON d.day = e.day
      ORDER BY d.day DESC
    `;
    
    let result = await pool.query(getQuery(start_date, end_date), [start_date, end_date]);
    
    let hasData = result.rows.some(r => Number(r.Sales) > 0 || Number(r.Purchases) > 0 || Number(r.Expenses) > 0);
    
    if (!hasData && (start_date || end_date)) {
      result = await pool.query(getQuery(null, null), [null, null]);
    }
    
    res.json(result.rows);
  } catch (error) { next(error); }
};

export const exportStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = getQueryParams(req);
    let query = `
      SELECT 
        name_en as "Product",
        current_stock as "Current Stock",
        purchase_price as "Purchase Price",
        (current_stock * purchase_price) as "Stock Value"
      FROM products
      WHERE is_active = true
      ORDER BY name_en ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    res.json(result.rows);
  } catch (error) { next(error); }
};
