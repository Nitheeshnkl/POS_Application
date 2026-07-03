import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const pool = env.DATABASE_URL
  ? new Pool({ connectionString: env.DATABASE_URL })
  : new Pool({
      host: env.PGHOST,
      port: env.PGPORT ? parseInt(env.PGPORT, 10) : undefined,
      database: env.PGDATABASE,
      user: env.PGUSER,
      password: env.PGPASSWORD,
    });

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err.message);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    logger.info(`Applying migration: ${file}`);
    await pool.query(sql);
  }
}

export default pool;
