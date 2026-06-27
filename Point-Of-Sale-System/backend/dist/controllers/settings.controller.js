"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getSettings = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query('SELECT key, value FROM settings');
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
exports.getSettings = getSettings;
const updateSettings = async (req, res, next) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await db_js_1.default.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP', [key, String(value)]);
        }
        res.json({ message: 'Settings updated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSettings = updateSettings;
