import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'srimurugan',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if admin user exists, get id
    const adminRes = await client.query("SELECT id FROM users WHERE username='admin'");
    const adminId = adminRes.rows[0].id;

    // 1. Categories
    const categories = ['Snacks', 'Beverages', 'Spices', 'Grains'];
    const catIds = [];
    for (const cat of categories) {
      const res = await client.query('INSERT INTO categories (name_en, name_ta) VALUES ($1, $2) RETURNING id', [cat, cat]);
      catIds.push(res.rows[0].id);
    }

    // 2. 5 Suppliers
    const supIds = [];
    for (let i = 1; i <= 5; i++) {
      const res = await client.query("INSERT INTO suppliers (name, phone) VALUES ($1, '1234567890') RETURNING id", [`Supplier ${i}`]);
      supIds.push(res.rows[0].id);
    }

    // 3. 20 Products
    const prodIds = [];
    for (let i = 1; i <= 20; i++) {
      const p = await client.query(
        "INSERT INTO products (category_id, name_en, name_ta, barcode, selling_price, purchase_price, current_stock, unit_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        [catIds[i % 4], `Product ${i} EN`, `பொருள் ${i}`, `100000${i}`, 50 + i, 30 + i, 100, 'pcs']
      );
      prodIds.push(p.rows[0].id);
    }

    // 4. 10 Purchases (from random suppliers, random products)
    for (let i = 1; i <= 10; i++) {
      const sId = supIds[i % 5];
      const purcRes = await client.query(
        "INSERT INTO purchases (supplier_id, invoice_number, total_amount, payment_mode, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [sId, `INV-${1000 + i}`, 1500, 'cash', adminId]
      );
      const pId = purcRes.rows[0].id;
      
      // Add items
      await client.query("INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, 10, 150, 1500)", [pId, prodIds[i % 20]]);
      
      // Update supplier transaction
      await client.query("INSERT INTO supplier_transactions (supplier_id, type, amount, reference_id) VALUES ($1, 'purchase', 1500, $2)", [sId, pId]);
      await client.query("UPDATE suppliers SET balance = balance + 1500 WHERE id = $1", [sId]);
    }

    // 5. 20 Bills
    for (let i = 1; i <= 20; i++) {
      const bRes = await client.query(
        "INSERT INTO bills (bill_number, cashier_id, customer_name, subtotal, grand_total, payment_mode) VALUES ($1, $2, 'Walk-in', 500, 500, 'cash') RETURNING id",
        [`BILL-${2000 + i}`, adminId]
      );
      const bId = bRes.rows[0].id;
      // Add bill items
      await client.query("INSERT INTO bill_items (bill_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, 2, 250, 500)", [bId, prodIds[i % 20]]);
    }

    // 6. 5 Expenses
    for (let i = 1; i <= 5; i++) {
      await client.query("INSERT INTO expenses (category, amount, description, created_by) VALUES ('Utilities', 200, 'Electricity Bill', $1)", [adminId]);
    }

    await client.query('COMMIT');
    console.log("Seeding complete.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Seeding failed", err);
  } finally {
    client.release();
    pool.end();
  }
}
seed();
