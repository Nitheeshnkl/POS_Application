"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.searchProducts = exports.getAllProducts = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getAllProducts = async (req, res, next) => {
    const { q, category_id, is_active } = req.query;
    let query = `
    SELECT p.*, c.name_en as category_name_en, c.name_ta as category_name_ta 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE 1=1
  `;
    const params = [];
    if (q) {
        params.push(`%${q}%`);
        query += ` AND (p.name_en ILIKE $${params.length} OR p.name_ta ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`;
    }
    if (category_id) {
        params.push(category_id);
        query += ` AND p.category_id = $${params.length}`;
    }
    if (is_active !== undefined) {
        params.push(is_active === 'true');
        query += ` AND p.is_active = $${params.length}`;
    }
    query += ' ORDER BY p.name_en ASC';
    try {
        const result = await db_js_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllProducts = getAllProducts;
const searchProducts = async (req, res, next) => {
    const { q } = req.query;
    if (!q)
        return res.json([]);
    try {
        const query = `
      SELECT id, name_en, name_ta, unit_type, selling_price, current_stock, barcode
      FROM products 
      WHERE (name_en ILIKE $1 OR name_ta ILIKE $1 OR barcode ILIKE $1) AND is_active = true
      LIMIT 20
    `;
        const result = await db_js_1.default.query(query, [`%${q}%`]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.searchProducts = searchProducts;
const getProductById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await db_js_1.default.query(`SELECT p.*, c.name_en as category_name_en, c.name_ta as category_name_ta 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res, next) => {
    const client = await db_js_1.default.connect();
    try {
        await client.query('BEGIN');
        const { category_id, name_en, name_ta, barcode, unit_type, purchase_price, selling_price, initial_stock, min_stock_alert, gst_rate } = req.body;
        const productResult = await client.query(`INSERT INTO products 
       (category_id, name_en, name_ta, barcode, unit_type, purchase_price, selling_price, current_stock, min_stock_alert, gst_rate) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [category_id, name_en, name_ta, barcode, unit_type, purchase_price || 0, selling_price || 0, initial_stock || 0, min_stock_alert || 5, gst_rate || 0]);
        const product = productResult.rows[0];
        if (initial_stock && initial_stock > 0) {
            await client.query(`INSERT INTO stock_movements 
         (product_id, type, quantity, previous_stock, new_stock, reason, performed_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [product.id, 'in', initial_stock, 0, initial_stock, 'Opening Stock', req.user?.id]);
        }
        await client.query('COMMIT');
        res.status(201).json(product);
    }
    catch (error) {
        await client.query('ROLLBACK');
        next(error);
    }
    finally {
        client.release();
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const { category_id, name_en, name_ta, barcode, unit_type, purchase_price, selling_price, min_stock_alert, gst_rate, is_active } = req.body;
    try {
        // Note: Only owner should update price edits according to details, 
        // but the roleGuard will handle that in routes if we separate it.
        // For now, let's just do a single update.
        const result = await db_js_1.default.query(`UPDATE products 
       SET category_id = $1, name_en = $2, name_ta = $3, barcode = $4, unit_type = $5, 
           purchase_price = $6, selling_price = $7, min_stock_alert = $8, gst_rate = $9, 
           is_active = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`, [category_id, name_en, name_ta, barcode, unit_type, purchase_price, selling_price, min_stock_alert, gst_rate, is_active, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await db_js_1.default.query('UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deactivated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
