import pool from '../config/db.js';
async function getExpectedTotals() {
    const result = await pool.query(`
    SELECT
      COALESCE(SUM(grand_total) FILTER (WHERE payment_mode = 'cash'   AND payment_status = 'paid'), 0) AS expected_cash,
      COALESCE(SUM(grand_total) FILTER (WHERE payment_mode = 'upi'    AND payment_status = 'paid'), 0) AS expected_gpay,
      COALESCE(SUM(grand_total) FILTER (WHERE payment_mode = 'card'   AND payment_status = 'paid'), 0) AS expected_card,
      COALESCE(SUM(grand_total) FILTER (WHERE payment_mode = 'credit' AND payment_status = 'paid'), 0) AS expected_credit,
      COALESCE(SUM(grand_total) FILTER (WHERE payment_status = 'paid'), 0) AS expected_total,
      COUNT(*) FILTER (WHERE payment_status = 'paid') AS bill_count,
      COUNT(*) FILTER (WHERE payment_status = 'cancelled') AS cancelled_count
    FROM bills
    WHERE DATE(created_at) = CURRENT_DATE
  `);
    return result.rows[0];
}
export const getTodaySummary = async (_req, res, next) => {
    try {
        res.json(await getExpectedTotals());
    }
    catch (error) {
        next(error);
    }
};
export const listCashouts = async (req, res, next) => {
    try {
        const { start_date, end_date, date } = req.query;
        const params = [];
        const where = [];
        if (date === 'today') {
            where.push('c.cashout_date = CURRENT_DATE');
        }
        if (start_date) {
            params.push(start_date);
            where.push(`c.cashout_date >= $${params.length}`);
        }
        if (end_date) {
            params.push(end_date);
            where.push(`c.cashout_date <= $${params.length}`);
        }
        const result = await pool.query(`
      SELECT
        c.*,
        u.name AS submitted_by_name,
        u.name AS cashier_name,
        c.expected_gpay AS expected_upi,
        CASE
          WHEN c.actual_cash IS NULL THEN NULL
          ELSE c.actual_cash - c.expected_cash
        END AS cash_difference
      FROM cashouts c
      JOIN users u ON u.id = c.submitted_by
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.cashout_date DESC, c.created_at DESC
      LIMIT 90
    `, params);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
export const upsertCashout = async (req, res, next) => {
    try {
        const { actual_cash, actual_gpay, actual_card, notes } = req.body;
        const summary = await getExpectedTotals();
        const result = await pool.query(`
      INSERT INTO cashouts
        (submitted_by, cashout_date, expected_cash, expected_gpay, expected_card, expected_credit,
         expected_total, actual_cash, actual_gpay, actual_card, notes, closed_at)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (cashout_date) DO UPDATE SET
        submitted_by     = EXCLUDED.submitted_by,
        expected_cash    = EXCLUDED.expected_cash,
        expected_gpay    = EXCLUDED.expected_gpay,
        expected_card    = EXCLUDED.expected_card,
        expected_credit  = EXCLUDED.expected_credit,
        expected_total   = EXCLUDED.expected_total,
        actual_cash      = EXCLUDED.actual_cash,
        actual_gpay      = EXCLUDED.actual_gpay,
        actual_card      = EXCLUDED.actual_card,
        notes            = EXCLUDED.notes,
        closed_at        = NOW()
      RETURNING *
    `, [
            req.user?.id,
            summary.expected_cash,
            summary.expected_gpay,
            summary.expected_card,
            summary.expected_credit,
            summary.expected_total,
            actual_cash ?? null,
            actual_gpay ?? null,
            actual_card ?? null,
            notes ?? null,
        ]);
        await pool.query('INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES ($1, $2, $3, $4, $5)', [req.user?.id, 'CASHOUT', 'cashouts', result.rows[0].id, JSON.stringify(result.rows[0])]);
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
