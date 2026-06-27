"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getNotifications = async (req, res, next) => {
    try {
        const role = req.user?.role;
        const result = await db_js_1.default.query('SELECT * FROM notifications WHERE target_role = $1 OR target_role = \'all\' ORDER BY created_at DESC', [role]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getNotifications = getNotifications;
const markRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db_js_1.default.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        next(error);
    }
};
exports.markRead = markRead;
const markAllRead = async (req, res, next) => {
    try {
        const role = req.user?.role;
        await db_js_1.default.query('UPDATE notifications SET is_read = TRUE WHERE target_role = $1 OR target_role = \'all\'', [role]);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        next(error);
    }
};
exports.markAllRead = markAllRead;
