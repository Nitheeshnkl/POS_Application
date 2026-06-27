import pool from '../config/db.js';

export const generateBillNumber = async (): Promise<string> => {
  const date = new Date();
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');

  const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'bill_prefix'");
  const prefix = settingsRes.rows[0]?.value || 'SMS';

  const countRes = await pool.query(
    `SELECT COUNT(*) as cnt FROM bills WHERE DATE(created_at) = CURRENT_DATE`
  );
  const sequence = parseInt(countRes.rows[0].cnt, 10) + 1;
  const sequenceString = sequence.toString().padStart(4, '0');

  return `${prefix}-${dateString}-${sequenceString}`;
};
