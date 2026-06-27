"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCashoutById = exports.getCashouts = exports.createCashout = exports.getTodaySummary = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getTodaySummary = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_mode = 'cash'   AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi'    AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS upi_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'card'   AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS card_total,
        COALESCE(SUM(CASE WHEN payment_mode = 'credit' AND payment_status = 'paid' THEN grand_total ELSE 0 END), 0) AS credit_total,
        COALESCE(SUM(grand_total) FILTER (WHERE payment_status = 'paid'), 0)                                        AS grand_total,
        COUNT(*) FILTER (WHERE payment_status = 'paid')                                                             AS bill_count,
        COUNT(*) FILTER (WHERE payment_status = 'cancelled')                                                        AS cancelled_count
      FROM bills b
      WHERE DATE(b.created_at) = CURRENT_DATE
    `);
        const existsResult = await db_js_1.default.query(`SELECT c.id, c.closed_at, u.name AS cashier_name
       FROM cashouts c
       JOIN users u ON u.id = c.cashier_id
       WHERE c.cashout_date = CURRENT_DATE
       LIMIT 1`);
        const row = result.rows[0];
        res.json({
            cash: Number(row.cash_total),
            upi: Number(row.upi_total),
            card: Number(row.card_total),
            credit: Number(row.credit_total),
            total: Number(row.grand_total),
            bill_count: Number(row.bill_count),
            cancelled_count: Number(row.cancelled_count),
            cashout_done: existsResult.rows.length > 0,
            cashout_closed_at: existsResult.rows[0]?.closed_at ?? null,
            cashout_cashier_name: existsResult.rows[0]?.cashier_name ?? null,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTodaySummary = getTodaySummary;
const createCashout = async (req, res, next) => {
    const client = await db_js_1.default.connect();
    try {
        await client.query('BEGIN');
        const existing = await client.query(`SELECT id FROM cashouts WHERE cashout_date = CURRENT_DATE LIMIT 1`);
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Cashout already recorded for today' });
        }
        const summary = await client.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_mode='cash'   AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_cash,
        COALESCE(SUM(CASE WHEN payment_mode='upi'    AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_upi,
        COALESCE(SUM(CASE WHEN payment_mode='card'   AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_card,
        COALESCE(SUM(CASE WHEN payment_mode='credit' AND payment_status='paid' THEN grand_total ELSE 0 END),0) AS expected_credit,
        COUNT(*) FILTER (WHERE payment_status='paid') AS bill_count
      FROM bills WHERE DATE(created_at) = CURRENT_DATE
    `);
        const s = summary.rows[0];
        const { actual_cash, denomination_breakdown, notes } = req.body;
        const userId = req.user?.id;
        const cashoutResult = await client.query(`
      INSERT INTO cashouts
        (cashier_id, cashout_date, expected_cash, expected_upi, expected_card, expected_credit,
         actual_cash, denomination_breakdown, notes, status, closed_at)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, 'closed', NOW())
      RETURNING *
    `, [
            userId,
            s.expected_cash, s.expected_upi, s.expected_card, s.expected_credit,
            actual_cash ?? null,
            denomination_breakdown ? JSON.stringify(denomination_breakdown) : null,
            notes ?? null,
        ]);
        const cashout = cashoutResult.rows[0];
        await client.query('INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1,$2,$3,$4,$5)', [userId, 'CASHOUT', 'cashouts', cashout.id, JSON.stringify(cashout)]);
        await client.query('COMMIT');
        res.status(201).json(cashout);
    }
    catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Cashout already recorded for today' });
        }
        next(error);
    }
    finally {
        client.release();
    }
};
exports.createCashout = createCashout;
const getCashouts = async (req, res, next) => {
    try {
        const { start_date, end_date, cashier_id, date } = req.query;
        const role = req.user?.role;
        const userId = req.user?.id;
        let query = `
      SELECT c.*, u.name AS cashier_name
      FROM cashouts c
      JOIN users u ON c.cashier_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (date === 'today') {
            query += ' AND c.cashout_date = CURRENT_DATE';
        }
        if (role === 'cashier') {
            query += ' AND c.cashier_id = $' + (params.length + 1);
            params.push(userId);
        }
        else if (cashier_id) {
            query += ' AND c.cashier_id = $' + (params.length + 1);
            params.push(cashier_id);
        }
        if (start_date) {
            query += ' AND c.cashout_date >= $' + (params.length + 1);
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND c.cashout_date <= $' + (params.length + 1);
            params.push(end_date);
        }
        query += ' ORDER BY c.cashout_date DESC, c.created_at DESC';
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getCashouts = getCashouts;
const getCashoutById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role;
        const result = await db_js_1.default.query(`SELECT c.*, u.name AS cashier_name FROM cashouts c JOIN users u ON c.cashier_id = u.id WHERE c.id = $1`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Cashout not found' });
        const cashout = result.rows[0];
        if (role === 'cashier' && cashout.cashier_id !== userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        res.json(cashout);
    }
    catch (error) {
        next(error);
    }
};
exports.getCashoutById = getCashoutById;
