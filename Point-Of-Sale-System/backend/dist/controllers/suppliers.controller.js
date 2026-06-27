"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierPurchases = exports.updateSupplier = exports.createSupplier = exports.getSupplierById = exports.getSuppliers = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getSuppliers = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query('SELECT * FROM suppliers ORDER BY name ASC');
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getSuppliers = getSuppliers;
const getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db_js_1.default.query('SELECT * FROM suppliers WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Supplier not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.getSupplierById = getSupplierById;
const createSupplier = async (req, res, next) => {
    try {
        const { name, phone, email, gstin, address, notes } = req.body;
        const result = await db_js_1.default.query('INSERT INTO suppliers (name, phone, email, gstin, address, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [name, phone, email, gstin, address, notes]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.createSupplier = createSupplier;
const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, email, gstin, address, notes } = req.body;
        const result = await db_js_1.default.query('UPDATE suppliers SET name=$1, phone=$2, email=$3, gstin=$4, address=$5, notes=$6 WHERE id=$7 RETURNING *', [name, phone, email, gstin, address, notes, id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Supplier not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSupplier = updateSupplier;
const getSupplierPurchases = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db_js_1.default.query('SELECT * FROM purchases WHERE supplier_id = $1 ORDER BY created_at DESC', [id]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getSupplierPurchases = getSupplierPurchases;
