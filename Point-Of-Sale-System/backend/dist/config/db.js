import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
dotenv.config();
const pool = new Pool(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'helium',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'heliumdb',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'password',
    });
export const query = (text, params) => pool.query(text, params);
export default pool;
/**
 * Runs all SQL migration files in src/db/migrations/ on startup.
 * Every migration uses IF NOT EXISTS / DROP IF EXISTS — safe to re-run.
 */
export async function runMigrations() {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const migrationsDir = path.join(__dirname, '../db/migrations');
        if (!fs.existsSync(migrationsDir)) {
            logger.info('No migrations directory found, skipping.');
            return;
        }
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // run in alphabetical order
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await pool.query(sql);
            logger.info(`Migration applied: ${file}`);
        }
    }
    catch (err) {
        // Log but do not crash — let the server start; partial failures are visible in logs
        logger.info(`Migration warning: ${err.message}`);
    }
}
