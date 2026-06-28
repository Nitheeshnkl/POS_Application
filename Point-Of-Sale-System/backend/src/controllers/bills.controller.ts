import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import { generateBillNumber } from '../utils/billNumber.js';

export const getBills = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, cashier_id, payment_mode } = req.query;
    let query = 'SELECT * FROM bills WHERE 1=1';
    const params: any[] = [];

    if (req.user?.role === 'cashier') {
      query += ' AND cashier_id = $' + (params.length + 1);
      params.push(req.user.id);
    } else if (cashier_id) {
      query += ' AND cashier_id = $' + (params.length + 1);
      params.push(cashier_id);
    }

    if (start_date) {
      query += ' AND created_at >= $' + (params.length + 1);
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= $' + (params.length + 1);
      params.push(`${end_date} 23:59:59`);
    }

    if (payment_mode) {
      query += ' AND payment_mode = $' + (params.length + 1);
      params.push(payment_mode);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createBill = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      customer_id,
      customer_name,
      customer_phone,
      items,
      payment_mode,
      discount_total = 0,
      cash_given = null,
      change_returned = null,
      override_credit = false,
    } = req.body;
    const cashier_id = req.user?.id;
    const user_role = req.user?.role;

    const bill_number = await generateBillNumber();

    let subtotal = 0;
    let gst_total = 0;

    for (const item of items) {
      const productResult = await client.query(
        'SELECT name_en, selling_price, gst_rate, current_stock, min_stock_alert FROM products WHERE id = $1',
        [item.product_id]
      );
      if (productResult.rows.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found`);
      }
      const product = productResult.rows[0];

      if (Number(product.current_stock) < Number(item.quantity)) {
        throw new Error(`Insufficient stock for ${product.name_en}. Available: ${product.current_stock}`);
      }

      const item_subtotal = Number(product.selling_price) * Number(item.quantity);
      const item_gst = (item_subtotal * Number(product.gst_rate)) / 100;

      subtotal += item_subtotal;
      gst_total += item_gst;

      item.name_en = product.name_en;
      item.unit_price = product.selling_price;
      item.gst_rate = product.gst_rate;
      item.line_total = item_subtotal + item_gst;
      item.min_stock_alert = product.min_stock_alert;
    }

    const grand_total = subtotal + gst_total - Number(discount_total);

    // Credit Logic
    let credit_due = 0;
    let credit_status = 'paid';
    
    if (payment_mode === 'credit') {
      if (!customer_id) {
        throw new Error('Customer must be selected for credit bills');
      }

      // Check Customer Credit Limit
      const custRes = await client.query('SELECT credit_limit, credit_used FROM customers WHERE id = $1', [customer_id]);
      if (custRes.rows.length === 0) throw new Error('Customer not found');
      
      const { credit_limit: cLimit, credit_used: cUsed } = custRes.rows[0];
      if (Number(cUsed) + grand_total > Number(cLimit) && !override_credit) {
        return res.status(400).json({ message: 'Customer credit limit exceeded' });
      }

      // Check Cashier Credit Limit (if not owner)
      if (user_role === 'cashier') {
        const cashRes = await client.query('SELECT credit_limit, credit_used FROM users WHERE id = $1', [cashier_id]);
        if (cashRes.rows.length > 0) {
          const { credit_limit: uLimit, credit_used: uUsed } = cashRes.rows[0];
          if (Number(uUsed) + grand_total > Number(uLimit) && !override_credit) {
            return res.status(400).json({ message: 'Cashier credit limit exceeded' });
          }
          // Update cashier credit used
          await client.query('UPDATE users SET credit_used = credit_used + $1 WHERE id = $2', [grand_total, cashier_id]);
        }
      }

      credit_due = grand_total;
      credit_status = 'pending';
      
      // Update customer credit used
      await client.query('UPDATE customers SET credit_used = credit_used + $1 WHERE id = $2', [grand_total, customer_id]);
      
      // Notify
      await client.query(
        `INSERT INTO notifications (title, message, target_role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
        [`Credit Bill Created`, `Bill #${bill_number} for ₹${grand_total}`]
      );
    }

    const billResult = await client.query(
      'INSERT INTO bills (bill_number, customer_id, customer_name, customer_phone, subtotal, gst_total, discount_total, grand_total, payment_mode, cashier_id, cash_given, change_returned, credit_due, credit_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [bill_number, customer_id || null, customer_name, customer_phone, subtotal, gst_total, discount_total, grand_total, payment_mode, cashier_id, cash_given, change_returned, credit_due, credit_status]
    );

    const bill = billResult.rows[0];

    for (const item of items) {
      const isCustom = item.product_id === 'CUSTOM' || !item.product_id;
      const dbProductId = isCustom ? null : item.product_id;
      
      await client.query(
        'INSERT INTO bill_items (bill_id, product_id, product_name_en, quantity, unit_price, gst_rate, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [bill.id, dbProductId, item.name_en, item.quantity, item.unit_price, item.gst_rate, item.line_total]
      );

      if (dbProductId) {
        const stockUpdateResult = await client.query(
          'UPDATE products SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING current_stock',
          [item.quantity, dbProductId]
        );
        if (stockUpdateResult.rowCount && stockUpdateResult.rowCount > 0) {
          const new_stock = Number(stockUpdateResult.rows[0].current_stock);
          const previous_stock = new_stock + Number(item.quantity);

          await client.query(
            'INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, performed_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [dbProductId, 'sale', item.quantity, previous_stock, new_stock, `Sale - Bill #${bill_number}`, cashier_id]
          );

          if (new_stock <= Number(item.min_stock_alert)) {
            await client.query(
              `INSERT INTO notifications (title, message, target_role)
               VALUES ($1, $2, 'owner')
               ON CONFLICT DO NOTHING`,
              [
                `Low Stock: ${item.name_en}`,
                `Stock is ${new_stock} (threshold: ${item.min_stock_alert})`
              ]
            );
          }
        }
      }
    }

    await client.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [cashier_id, 'CREATE_BILL', 'bills', bill.id, JSON.stringify(bill)]
    );

    await client.query('COMMIT');
    res.status(201).json(bill);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getBillById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const billResult = await pool.query('SELECT * FROM bills WHERE id = $1', [id]);
    if (billResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    const bill = billResult.rows[0];

    const itemsResult = await pool.query('SELECT * FROM bill_items WHERE bill_id = $1', [id]);
    bill.items = itemsResult.rows;

    res.json(bill);
  } catch (error) {
    next(error);
  }
};

export const cancelBill = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const billResult = await client.query('SELECT * FROM bills WHERE id = $1', [id]);
    if (billResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    const bill = billResult.rows[0];

    if (bill.payment_status === 'cancelled') {
      return res.status(400).json({ message: 'Bill already cancelled' });
    }

    const cancelledResult = await client.query(
      "UPDATE bills SET payment_status = 'cancelled' WHERE id = $1 RETURNING *",
      [id]
    );

    const itemsResult = await client.query('SELECT * FROM bill_items WHERE bill_id = $1', [id]);
    for (const item of itemsResult.rows) {
      const stockUpdateResult = await client.query(
        'UPDATE products SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING current_stock',
        [item.quantity, item.product_id]
      );
      const new_stock = stockUpdateResult.rows[0].current_stock;
      const previous_stock = Number(new_stock) - Number(item.quantity);

      await client.query(
        'INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, performed_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [item.product_id, 'return', item.quantity, previous_stock, new_stock, `Bill Cancelled - Bill #${bill.bill_number}`, req.user?.id]
      );
    }

    await client.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
      [req.user?.id, 'CANCEL_BILL', 'bills', id]
    );

    await client.query('COMMIT');
    res.json(cancelledResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
