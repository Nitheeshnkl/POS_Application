"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getAllCategories = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const getAllCategories = async (req, res, next) => {
    try {
        const result = await db_js_1.default.query('SELECT * FROM categories ORDER BY name_en ASC');
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCategories = getAllCategories;
const createCategory = async (req, res, next) => {
    const { name_en, name_ta } = req.body;
    try {
        const result = await db_js_1.default.query('INSERT INTO categories (name_en, name_ta) VALUES ($1, $2) RETURNING *', [name_en, name_ta]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res, next) => {
    const { id } = req.params;
    const { name_en, name_ta } = req.body;
    try {
        const result = await db_js_1.default.query('UPDATE categories SET name_en = $1, name_ta = $2 WHERE id = $3 RETURNING *', [name_en, name_ta, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await db_js_1.default.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCategory = deleteCategory;
