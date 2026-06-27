"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchasesSummary = exports.getPurchaseById = exports.createPurchase = exports.getAllPurchases = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getAllPurchases = async (req, res, next) => {
    const { start_date, end_date, supplier } = req.query;
    let query = `
    SELECT p.*, u.name as created_by_name 
    FROM purchases p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE 1=1
  `;
    const params = [];
    if (start_date) {
        params.push(start_date);
        query += ` AND p.purchase_date >= $${params.length}`;
    }
    if (end_date) {
        params.push(end_date);
        query += ` AND p.purchase_date <= $${params.length}`;
    }
    if (supplier) {
        params.push(`%${supplier}%`);
        query += ` AND p.supplier_name ILIKE $${params.length}`;
    }
    query += ' ORDER BY p.purchase_date DESC, p.created_at DESC';
    try {
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllPurchases = getAllPurchases;
const createPurchase = async (req, res, next) => {
    const { supplier_name, supplier_phone, invoice_number, purchase_date, payment_mode, notes, items } = req.body;
    const client = await db_js_1.default.connect();
    try {
        await client.query('BEGIN');
        // 1. Calculate total
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        // 2. Insert purchase
        const purchaseResult = await client.query(`INSERT INTO purchases (supplier_name, supplier_phone, invoice_number, purchase_date, total_amount, payment_mode, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [supplier_name, supplier_phone, invoice_number, purchase_date || new Date(), totalAmount, payment_mode, notes, req.user?.id]);
        const purchaseId = purchaseResult.rows[0].id;
        // 3. Insert items and update stock
        for (const item of items) {
            const { product_id, quantity, unit_price } = item;
            const totalPrice = quantity * unit_price;
            // Insert purchase item
            await client.query(`INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`, [purchaseId, product_id, quantity, unit_price, totalPrice]);
            // Update product stock and purchase price
            const productRes = await client.query('SELECT current_stock FROM products WHERE id = $1 FOR UPDATE', [product_id]);
            if ((productRes.rowCount ?? 0) > 0) {
                const previousStock = parseFloat(productRes.rows[0].current_stock);
                const newStock = previousStock + parseFloat(quantity);
                await client.query('UPDATE products SET current_stock = $1, purchase_price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [newStock, unit_price, product_id]);
                // Insert stock movement
                await client.query(`INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, performed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [product_id, 'purchase', quantity, previousStock, newStock, `Purchase Invoice: ${invoice_number}`, req.user?.id]);
            }
        }
        await client.query('COMMIT');
        res.status(201).json(purchaseResult.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        next(error);
    }
    finally {
        client.release();
    }
};
exports.createPurchase = createPurchase;
const getPurchaseById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const purchaseRes = await db_js_1.default.query(`SELECT p.*, u.name as created_by_name 
       FROM purchases p 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.id = $1`, [id]);
        if (purchaseRes.rowCount === 0) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        const itemsRes = await db_js_1.default.query(`SELECT pi.*, pr.name_en, pr.unit_type 
       FROM purchase_items pi 
       JOIN products pr ON pi.product_id = pr.id 
       WHERE pi.purchase_id = $1`, [id]);
        res.json({
            ...purchaseRes.rows[0],
            items: itemsRes.rows
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPurchaseById = getPurchaseById;
const getPurchasesSummary = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query(`
      SELECT 
        TO_CHAR(purchase_date, 'YYYY-MM') as month,
        SUM(total_amount) as total_amount,
        COUNT(*) as purchase_count
      FROM purchases
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getPurchasesSummary = getPurchasesSummary;
