import pool from '../config/db.js';
export const getCurrentStock = async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT p.id, p.name_en, p.name_ta, p.unit_type, p.current_stock, p.purchase_price,
             (p.current_stock * p.purchase_price) as stock_value,
             c.name_en as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY p.name_en ASC
    `);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const getLowStockAlerts = async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT id, name_en, name_ta, current_stock, min_stock_alert, unit_type
      FROM products
      WHERE is_active = true AND current_stock <= min_stock_alert
      ORDER BY current_stock ASC
    `);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const getStockMovements = async (req, res, next) => {
    const { product_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = `
    SELECT sm.*, p.name_en as product_name, u.name as performed_by_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN users u ON sm.performed_by = u.id
    WHERE 1=1
  `;
    const params = [];
    if (product_id) {
        params.push(product_id);
        query += ` AND sm.product_id = $${params.length}`;
    }
    query += ` ORDER BY sm.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    try {
        const result = await pool.query(query, params);
        const countResult = await pool.query('SELECT COUNT(*) FROM stock_movements' + (product_id ? ' WHERE product_id = $1' : ''), product_id ? [product_id] : []);
        res.json({
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: Number(page),
                limit: Number(limit)
            }
        });
    }
    catch (error) {
        next(error);
    }
};
export const adjustStock = async (req, res, next) => {
    const { product_id, quantity, type, reason } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const productRes = await client.query('SELECT current_stock FROM products WHERE id = $1 FOR UPDATE', [product_id]);
        if (productRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Product not found' });
        }
        const previousStock = parseFloat(productRes.rows[0].current_stock);
        const adjustQty = parseFloat(quantity);
        let newStock;
        if (type === 'adjustment' || type === 'in') {
            newStock = previousStock + adjustQty;
        }
        else if (type === 'out' || type === 'damage') {
            newStock = previousStock - adjustQty;
        }
        else {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid movement type for manual adjustment' });
        }
        await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [newStock, product_id]);
        const smResult = await client.query(`INSERT INTO stock_movements 
       (product_id, type, quantity, previous_stock, new_stock, reason, performed_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [product_id, type, adjustQty, previousStock, newStock, reason, req.user?.id]);
        await client.query('COMMIT');
        res.json(smResult.rows[0]);
    }
    catch (error) {
        await client.query('ROLLBACK');
        next(error);
    }
    finally {
        client.release();
    }
};
export const markDamaged = async (req, res, next) => {
    req.body.type = 'damage';
    return adjustStock(req, res, next);
};
export const getStockValuation = async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT 
        SUM(current_stock * purchase_price) as total_value,
        COUNT(*) as product_count
      FROM products
      WHERE is_active = true
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
