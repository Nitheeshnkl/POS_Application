"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUser = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const getUsers = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query('SELECT id, name, username, role, phone, is_active, created_at FROM users WHERE role = \'cashier\'');
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res, next) => {
    try {
        const { name, username, password, phone } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const result = await db_js_1.default.query('INSERT INTO users (name, username, password, role, phone) VALUES ($1, $2, $3, \'cashier\', $4) RETURNING id, name, username, role, phone, is_active, created_at', [name, username, hashedPassword, phone]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, is_active, password } = req.body;
        let query = 'UPDATE users SET name = $1, phone = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP';
        const params = [name, phone, is_active];
        if (password) {
            const hashedPassword = await bcrypt_1.default.hash(password, 10);
            query += ', password = $' + (params.length + 1);
            params.push(hashedPassword);
        }
        query += ' WHERE id = $' + (params.length + 1) + ' RETURNING id, name, username, role, phone, is_active, created_at';
        params.push(id);
        const result = await db_js_1.default.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
const deactivateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db_js_1.default.query('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        res.json({ message: 'User deactivated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deactivateUser = deactivateUser;
