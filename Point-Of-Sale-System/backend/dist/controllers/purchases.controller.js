import pool from '../config/db.js';
export const getAllPurchases = async (req, res, next) => {
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
        const result = await pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const createPurchase = async (req, res, next) => {
    const { supplier_id, supplier_name, supplier_phone, invoice_number, purchase_date, payment_mode, notes, items } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // 1. Calculate total
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        let supplier_credit_due = 0;
        if (payment_mode === 'credit')
            supplier_credit_due = totalAmount;
        // 2. Insert purchase
        const purchaseResult = await client.query(`INSERT INTO purchases (supplier_id, supplier_name, supplier_phone, invoice_number, purchase_date, total_amount, payment_mode, notes, created_by, supplier_credit_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [supplier_id || null, supplier_name, supplier_phone, invoice_number, purchase_date || new Date(), totalAmount, payment_mode, notes, req.user?.id, supplier_credit_due]);
        const purchaseId = purchaseResult.rows[0].id;
        // 3. Supplier Transaction Link
        if (supplier_id) {
            if (payment_mode === 'credit') {
                const supRes = await client.query('SELECT credit_limit, balance FROM suppliers WHERE id = $1', [supplier_id]);
                if (supRes.rows.length > 0) {
                    const { credit_limit, balance } = supRes.rows[0];
                    if (Number(balance) + totalAmount > Number(credit_limit) && Number(credit_limit) > 0) {
                        return res.status(400).json({ message: 'Supplier credit limit exceeded' });
                    }
                }
            }
            await client.query('INSERT INTO supplier_transactions (supplier_id, type, amount, reference_id, notes) VALUES ($1, $2, $3, $4, $5)', [supplier_id, 'purchase', totalAmount, purchaseId, `Purchase Invoice: ${invoice_number}`]);
            await client.query('UPDATE suppliers SET balance = balance + $1 WHERE id = $2', [totalAmount, supplier_id]);
        }
        // 4. Insert items and update stock
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
export const getPurchaseById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const purchaseRes = await pool.query(`SELECT p.*, u.name as created_by_name 
       FROM purchases p 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.id = $1`, [id]);
        if (purchaseRes.rowCount === 0) {
            return res.status(404).json({ message: 'Purchase not found' });
        }
        const itemsRes = await pool.query(`SELECT pi.*, pr.name_en, pr.unit_type 
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
export const getPurchasesSummary = async (req, res, next) => {
    try {
        const result = await pool.query(`
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
