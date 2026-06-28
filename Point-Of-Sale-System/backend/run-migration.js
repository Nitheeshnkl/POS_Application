import pg from 'pg';
import fs from 'fs';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/srimurugan' });
async function run() {
  const sql = fs.readFileSync('src/db/migrations/02_cash_drawer_upgrade.sql', 'utf8');
  await pool.query(sql);
  console.log('Migration applied successfully');
  process.exit(0);
}
run();
