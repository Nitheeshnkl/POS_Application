import pool from '../config/db.js';
const getTodayInAsiaKolkata = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
// ──────────────────────────────────────────────────────────────────────────────
// Helper: compute daily cash/gpay figures from bills & expenses for a given date
// ──────────────────────────────────────────────────────────────────────────────
async function getDailyFigures(date) {
    const salesResult = await pool.query(`
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN LOWER(payment_mode) = 'cash' THEN grand_total
            ELSE 0
          END
        ),
        0
      ) AS cash_sales,
      COALESCE(
        SUM(
          CASE
            WHEN LOWER(payment_mode) IN ('gpay', 'upi', 'online') THEN grand_total
            ELSE 0
          END
        ),
        0
      ) AS gpay_sales
    FROM bills
    WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = $1
      AND COALESCE(payment_status, 'paid') NOT IN ('draft', 'cancelled', 'deleted')
  `, [date]);
    const expensesResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS expenses
    FROM expenses
    WHERE DATE(COALESCE(date, created_at)) = $1
  `, [date]);
    const cashBills = Number(salesResult.rows[0].cash_sales ?? 0);
    const gpayBills = Number(salesResult.rows[0].gpay_sales ?? 0);
    const expenses = Number(expensesResult.rows[0].expenses ?? 0);
    console.log({ today: date, cashBills, gpayBills, expenses });
    return { cash_sales: cashBills, gpay_sales: gpayBills, expenses };
}
// ──────────────────────────────────────────────────────────────────────────────
// GET /cashout/current
// ──────────────────────────────────────────────────────────────────────────────
export const getCurrentDrawer = async (_req, res, next) => {
    try {
        const today = getTodayInAsiaKolkata();
        const { cash_sales, gpay_sales, expenses } = await getDailyFigures(today);
        const existing = await pool.query(`SELECT * FROM cashouts WHERE DATE(created_at) = $1 ORDER BY created_at DESC, id DESC LIMIT 1`, [today]);
        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            const opening_cash = Number(row.opening_cash) || 0;
            const expected_cash = opening_cash + cash_sales - expenses;
            const actual_cash = row.actual_cash != null ? Number(row.actual_cash) : null;
            const actual_gpay = row.actual_gpay != null ? Number(row.actual_gpay) : null;
            const cash_diff = actual_cash != null ? actual_cash - expected_cash : null;
            const gpay_diff = actual_gpay != null ? actual_gpay - gpay_sales : null;
            return res.json({
                success: true,
                data: {
                    id: row.id,
                    cashout_date: row.cashout_date,
                    opening_cash,
                    cash_sales,
                    gpay_sales,
                    expenses,
                    expected_cash,
                    actual_cash,
                    actual_gpay,
                    difference: cash_diff,
                    gpay_difference: gpay_diff,
                    notes: row.notes || ''
                }
            });
        }
        const opening_cash = 0;
        const expected_cash = opening_cash + cash_sales - expenses;
        return res.json({
            success: true,
            data: {
                id: null,
                cashout_date: today,
                opening_cash,
                cash_sales,
                gpay_sales,
                expenses,
                expected_cash,
                actual_cash: null,
                actual_gpay: null,
                difference: null,
                gpay_difference: null,
                notes: ''
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// ──────────────────────────────────────────────────────────────────────────────
// POST /cashout/save — upsert by date (no open/close lifecycle)
// ──────────────────────────────────────────────────────────────────────────────
export const saveCashout = async (req, res, next) => {
    try {
        const date = req.body.date || getTodayInAsiaKolkata();
        const opening_cash = Number(req.body.opening_cash ?? 0);
        const actual_cash = Number(req.body.actual_cash ?? 0);
        const actual_gpay = req.body.actual_gpay != null ? Number(req.body.actual_gpay) : null;
        const notes = req.body.notes || '';
        if (isNaN(opening_cash) || opening_cash < 0) {
            return res.status(400).json({ success: false, message: 'Invalid opening cash amount' });
        }
        if (isNaN(actual_cash) || actual_cash < 0) {
            return res.status(400).json({ success: false, message: 'Invalid actual cash amount' });
        }
        const { cash_sales, gpay_sales, expenses } = await getDailyFigures(date);
        const expected_cash = opening_cash + cash_sales - expenses;
        const cash_diff = actual_cash - expected_cash;
        const gpay_diff = actual_gpay != null ? actual_gpay - gpay_sales : null;
        const existing = await pool.query(`SELECT id FROM cashouts WHERE cashout_date = $1 ORDER BY id DESC LIMIT 1`, [date]);
        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(`
        UPDATE cashouts
        SET
          opening_cash = $1,
          actual_cash  = $2,
          actual_gpay  = $3,
          notes        = $4,
          difference   = $5,
          updated_at   = NOW()
        WHERE id = $6
        RETURNING *
      `, [opening_cash, actual_cash, actual_gpay, notes, cash_diff, existing.rows[0].id]);
        }
        else {
            result = await pool.query(`
        INSERT INTO cashouts
          (cashout_date, opened_by, opening_cash, actual_cash, actual_gpay, notes, difference, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [date, req.user?.id, opening_cash, actual_cash, actual_gpay, notes, cash_diff]);
        }
        return res.json({
            success: true,
            data: {
                ...result.rows[0],
                cash_sales,
                gpay_sales,
                expenses,
                expected_cash,
                difference: cash_diff,
                gpay_difference: gpay_diff,
                actual_gpay: actual_gpay
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// ──────────────────────────────────────────────────────────────────────────────
// PUT /cashout/:id — edit any historical record
// ──────────────────────────────────────────────────────────────────────────────
export const editCashout = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await pool.query(`SELECT * FROM cashouts WHERE id = $1`, [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        const row = existing.rows[0];
        const date = new Date(row.cashout_date).toISOString().split('T')[0];
        const opening_cash = req.body.opening_cash !== undefined
            ? Number(req.body.opening_cash)
            : Number(row.opening_cash) || 0;
        const actual_cash = req.body.actual_cash !== undefined
            ? Number(req.body.actual_cash)
            : Number(row.actual_cash) || 0;
        const actual_gpay = req.body.actual_gpay !== undefined
            ? (req.body.actual_gpay != null ? Number(req.body.actual_gpay) : null)
            : (row.actual_gpay != null ? Number(row.actual_gpay) : null);
        const notes = req.body.notes !== undefined ? req.body.notes : (row.notes || '');
        const { cash_sales, gpay_sales, expenses } = await getDailyFigures(date);
        const expected_cash = opening_cash + cash_sales - expenses;
        const cash_diff = actual_cash - expected_cash;
        const gpay_diff = actual_gpay != null ? actual_gpay - gpay_sales : null;
        const result = await pool.query(`
      UPDATE cashouts
      SET
        opening_cash = $1,
        actual_cash  = $2,
        actual_gpay  = $3,
        notes        = $4,
        difference   = $5,
        updated_at   = NOW()
      WHERE id = $6
      RETURNING *
    `, [opening_cash, actual_cash, actual_gpay, notes, cash_diff, id]);
        return res.json({
            success: true,
            message: 'Cashout updated',
            data: {
                ...result.rows[0],
                cash_sales,
                gpay_sales,
                expenses,
                expected_cash,
                difference: cash_diff,
                gpay_difference: gpay_diff,
                actual_gpay
            }
        });
    }
    catch (error) {
        next(error);
    }
};
// ──────────────────────────────────────────────────────────────────────────────
// GET /cashout/history
// ──────────────────────────────────────────────────────────────────────────────
export const getCashoutHistory = async (_req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT c.*, u.name AS opened_by_name
      FROM cashouts c
      LEFT JOIN users u ON u.id = c.opened_by
      ORDER BY c.cashout_date DESC
      LIMIT 90
    `);
        const rows = await Promise.all(result.rows.map(async (row) => {
            try {
                const date = new Date(row.cashout_date).toISOString().split('T')[0];
                const { cash_sales, gpay_sales, expenses } = await getDailyFigures(date);
                const opening_cash = Number(row.opening_cash) || 0;
                const expected_cash = opening_cash + cash_sales - expenses;
                const actual_cash = row.actual_cash != null ? Number(row.actual_cash) : null;
                const actual_gpay = row.actual_gpay != null ? Number(row.actual_gpay) : null;
                const cash_diff = actual_cash != null ? actual_cash - expected_cash : null;
                const gpay_diff = actual_gpay != null ? actual_gpay - gpay_sales : null;
                return {
                    ...row,
                    cash_sales,
                    gpay_sales,
                    expenses,
                    expected_cash,
                    actual_cash,
                    actual_gpay,
                    difference: cash_diff,
                    gpay_difference: gpay_diff,
                };
            }
            catch {
                return row;
            }
        }));
        return res.json({ success: true, data: rows });
    }
    catch (error) {
        next(error);
    }
};
// Legacy aliases
export const openDrawer = saveCashout;
export const closeDrawer = saveCashout;
