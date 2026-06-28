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
    })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
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

verifyConnection();

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
      logger.info(
        'No migrations directory found, skipping.'
      );
      return;
    }

    logger.info(
      `Using migrations directory: ${migrationsDir}`
    );

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      logger.info(
        `Running migration: ${file}`
      );

      const sql = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8'
      );

      await pool.query(sql);

      logger.info(
        `Migration applied: ${file}`
      );
    }

    logger.info(
      'Database migration completed successfully.'
    );
  } catch (err: any) {
    logger.error(
      `Migration failed: ${err.message}`
    );

    throw err;
  }
}