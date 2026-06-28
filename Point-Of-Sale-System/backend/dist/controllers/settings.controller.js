import pool from '../config/db.js';
export const getSettings = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT key, value FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    }
    catch (error) {
        next(error);
    }
};
export const updateSettings = async (req, res, next) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP', [key, String(value)]);
        }
        const result = await pool.query('SELECT key, value FROM settings');
        const updatedSettings = {};
        result.rows.forEach(row => {
            updatedSettings[row.key] = row.value;
        });
        res.json(updatedSettings);
    }
    catch (error) {
        next(error);
    }
};
