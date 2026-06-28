import pool, { runMigrations } from '../config/db.js';
import { logger } from '../utils/logger.js';

async function migrate() {
  try {
    logger.info('Starting database migration...');
    await runMigrations();
    logger.info('Database migration completed successfully.');
    process.exit(0);
  } catch (error: any) {
    logger.error(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

migrate();
