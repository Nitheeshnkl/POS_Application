import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/heliumdb'
});

async function run() {
  const { rows } = await pool.query('SELECT current_database(), current_schema();');
  console.log(rows);
  const tables = await pool.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name='users';`);
  console.log('Tables:', tables.rows);
  process.exit(0);
}
run();
