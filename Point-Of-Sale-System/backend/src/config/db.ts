import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

dotenv.config();

/*
|--------------------------------------------------------------------------
| Database Configuration
|--------------------------------------------------------------------------
*/

// Production must use DATABASE_URL
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.DATABASE_URL
) {
  throw new Error(
    'DATABASE_URL is required in production'
  );
}

// Create pool
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_MAX_CLIENTS || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: false,
            }
          : false,
    })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      max: Number(process.env.PG_MAX_CLIENTS || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: false,
    });
export default pool;

export const query = (
  text: string,
  params?: any[]
) => pool.query(text, params);

/*
|--------------------------------------------------------------------------
| Startup Diagnostics
|--------------------------------------------------------------------------
*/

async function verifyConnection() {
  try {
    const result = await pool.query(`
      SELECT
        current_database(),
        current_schema()
    `);

    logger.info(
      `DB Connected → Database: ${result.rows[0].current_database}, Schema: ${result.rows[0].current_schema}`
    );

    // Force schema
    await pool.query(`
      SET search_path TO public
    `);

    logger.info(
      'PostgreSQL search_path set to public'
    );
  } catch (err: any) {
    logger.error(
      `Database startup verification failed: ${err.message}`
    );

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Ensure required core tables exist; if not, apply schema.sql as a fallback
async function ensureCoreTables() {
  try {
    const check = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users','bills','products','cashouts','expenses')
    `);

    const found = check.rows.map(r => r.table_name);
    const required = ['users','bills','products','cashouts','expenses'];
    const missing = required.filter(t => !found.includes(t));

    if (missing.length === 0) {
      logger.info('All core tables exist');
      return;
    }

    logger.info(`Missing core tables: ${missing.join(', ')}. Attempting to apply fallback schema.sql`);

    const schemaPath = path.join(process.cwd(), 'src', 'schema.sql');
    const altSchemaPath = path.join(process.cwd(), 'backend', 'schema.sql');
    let schemaFile = '';
    if (fs.existsSync(schemaPath)) schemaFile = schemaPath;
    else if (fs.existsSync(altSchemaPath)) schemaFile = altSchemaPath;

    if (!schemaFile) {
      logger.error('No schema.sql found to create missing tables');
      return;
    }

    const sql = fs.readFileSync(schemaFile, 'utf8');
    await pool.query(sql);
    logger.info('Fallback schema applied successfully');
  } catch (err: any) {
    logger.error(`Failed to ensure core tables: ${err.message}`);
    throw err;
  }
}

// Run verification and ensure core tables exist. Do not crash non-production dev environments.
verifyConnection().then(() => ensureCoreTables()).catch(err => {
  logger.error(`DB initialization error: ${err.message}`);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

/*
|--------------------------------------------------------------------------
| Migration Runner
|--------------------------------------------------------------------------
*/

export async function runMigrations(): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const possiblePaths = [
      path.join(__dirname, '../db/migrations'),
      path.join(process.cwd(), 'src/db/migrations'),
      path.join(
        process.cwd(),
        'backend/src/db/migrations'
      ),
      path.join(
        process.cwd(),
        'dist/db/migrations'
      ),
    ];

    let migrationsDir = '';

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        migrationsDir = p;
        break;
      }
    }

    if (!migrationsDir) {
      logger.info('No migrations directory found, skipping.');
      return;
    }

    logger.info(`Using migrations directory: ${migrationsDir}`);

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    // Ensure migrations_applied table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations_applied (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Acquire advisory lock so concurrent instances don't run migrations simultaneously
    const lockId = 123456789; // constant lock for this project
    const gotLock = (await pool.query('SELECT pg_try_advisory_lock($1) AS locked', [lockId])).rows[0].locked;
    if (!gotLock) {
      logger.info('Another instance is running migrations; skipping.');
      return;
    }

    try {
      for (const file of files) {
        const { rows } = await pool.query('SELECT 1 FROM migrations_applied WHERE filename = $1', [file]);
        if (rows.length > 0) {
          logger.info(`Skipping already-applied migration: ${file}`);
          continue;
        }

        logger.info(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
        await pool.query('INSERT INTO migrations_applied (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
        logger.info(`Migration applied: ${file}`);
      }
      logger.info('Database migration completed successfully.');
    } finally {
      // Release advisory lock
      await pool.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }
  } catch (err: any) {
    logger.error(
      `Migration failed: ${err.message}`
    );

    throw err;
  }
}