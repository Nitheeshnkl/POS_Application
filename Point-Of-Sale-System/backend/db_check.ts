import pool from './src/config/db.js';

async function checkDb() {
  const client = await pool.connect();
  try {
    const orphanedBillItems = await client.query('SELECT COUNT(*) FROM bill_items WHERE bill_id NOT IN (SELECT id FROM bills)');
    console.log('Orphaned bill_items:', orphanedBillItems.rows[0].count);

    const negativeStock = await client.query('SELECT COUNT(*) FROM products WHERE current_stock < 0');
    console.log('Products with negative stock:', negativeStock.rows[0].count);

    const nullNames = await client.query('SELECT COUNT(*) FROM products WHERE name_en IS NULL');
    console.log('Products with NULL name_en:', nullNames.rows[0].count);

    const orphanedMovements = await client.query('SELECT COUNT(*) FROM stock_movements WHERE product_id NOT IN (SELECT id FROM products)');
    console.log('Orphaned stock_movements:', orphanedMovements.rows[0].count);
    
    // Check missing user emails
    const nullUsernames = await client.query('SELECT COUNT(*) FROM users WHERE username IS NULL');
    console.log('Users with NULL username:', nullUsernames.rows[0].count);

    // If there are negative stocks, fix them
    if (negativeStock.rows[0].count > 0) {
      await client.query('UPDATE products SET current_stock = 0 WHERE current_stock < 0');
      console.log('Fixed negative stock');
    }
  } finally {
    client.release();
    process.exit(0);
  }
}

checkDb().catch(console.error);
