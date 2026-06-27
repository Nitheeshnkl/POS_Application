"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBillNumber = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const generateBillNumber = async () => {
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');
    const settingsRes = await db_js_1.default.query("SELECT value FROM settings WHERE key = 'bill_prefix'");
    const prefix = settingsRes.rows[0]?.value || 'SMS';
    const countRes = await db_js_1.default.query(`SELECT COUNT(*) as cnt FROM bills WHERE DATE(bill_date) = CURRENT_DATE`);
    const sequence = parseInt(countRes.rows[0].cnt, 10) + 1;
    const sequenceString = sequence.toString().padStart(4, '0');
    return `${prefix}-${dateString}-${sequenceString}`;
};
exports.generateBillNumber = generateBillNumber;
