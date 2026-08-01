import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const isProduction = env.NODE_ENV === 'production';
const isLocalHost = (value?: string) => {
  if (!value) {
    return true;
  }

  try {
    const { hostname } = new URL(value);
    return ['127.0.0.1', '::1', '0.0.0.0'].includes(hostname);
  } catch {
    return false;
  }
};

const shouldUseSsl = (() => {
  if (env.DATABASE_URL) {
    return !isLocalHost(env.DATABASE_URL);
  }

  if (env.PGHOST) {
    return !isLocalHost(`postgres://${env.PGHOST}`);
  }

  return false;
})();



const pool = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: env.PGHOST,
      port: env.PGPORT ? parseInt(env.PGPORT, 10) : undefined,
      database: env.PGDATABASE,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    });

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err.message);
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

  await pool.query('SET search_path TO public');

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
