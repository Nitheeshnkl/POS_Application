/**
 * Seed script — creates/updates the two default application users.
 * Run after migrations:  npm run seed
 */
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const USERS = [
  { name: 'Admin Owner', username: 'admin',    password: 'Admin@123',    role: 'owner' },
  { name: 'Cashier',     username: 'cashier1', password: 'Cashier@123',  role: 'cashier' },
];

async function seed() {
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (name, username, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE
         SET name     = EXCLUDED.name,
             password = EXCLUDED.password,
             role     = EXCLUDED.role`,
      [u.name, u.username, hash, u.role]
    );
    console.log(`[seed] Upserted user: ${u.username} (${u.role})`);
  }
  await pool.end();
  console.log('[seed] Done.');
}

seed().catch((err) => { console.error('[seed] Error:', err); process.exit(1); });
