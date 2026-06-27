"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.logout = exports.refresh = exports.login = exports.setup = exports.setupRequired = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = __importDefault(require("../config/db.js"));
const env_js_1 = require("../config/env.js");
const setupRequired = async (req, res, next) => {
    try {
        const { rows } = await db_js_1.default.query('SELECT COUNT(*) FROM users');
        const count = parseInt(rows[0].count);
        res.json({ required: count === 0 });
    }
    catch (error) {
        next(error);
    }
};
exports.setupRequired = setupRequired;
const setup = async (req, res, next) => {
    const client = await db_js_1.default.connect();
    try {
        await client.query('BEGIN');
        const { rows: userCount } = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount[0].count) > 0) {
            return res.status(400).json({ message: 'Setup already completed' });
        }
        const { name, username, password, storeName, storeAddress, storePhone } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const { rows: userRows } = await client.query('INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, username, role', [name, username, hashedPassword, 'owner']);
        const settings = {
            store_name: storeName,
            store_address: storeAddress,
            store_phone: storePhone,
        };
        for (const [key, value] of Object.entries(settings)) {
            await client.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
        }
        await client.query('COMMIT');
        res.status(201).json({ user: userRows[0] });
    }
    catch (error) {
        await client.query('ROLLBACK');
        next(error);
    }
    finally {
        client.release();
    }
};
exports.setup = setup;
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const { rows } = await db_js_1.default.query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = rows[0];
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, env_js_1.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, env_js_1.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: env_js_1.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, accessToken });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token missing' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, env_js_1.env.JWT_REFRESH_SECRET);
        const { rows } = await db_js_1.default.query('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [decoded.id]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }
        const user = rows[0];
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, env_js_1.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        res.json({ accessToken });
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid refresh token' });
    }
};
exports.refresh = refresh;
const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
};
exports.logout = logout;
const getMe = async (req, res, next) => {
    try {
        const { rows } = await db_js_1.default.query('SELECT id, name, username, role, phone FROM users WHERE id = $1', [req.user?.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
