"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_js_1 = require("./config/env.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const categories_routes_js_1 = __importDefault(require("./routes/categories.routes.js"));
const products_routes_js_1 = __importDefault(require("./routes/products.routes.js"));
const stock_routes_js_1 = __importDefault(require("./routes/stock.routes.js"));
const purchases_routes_js_1 = __importDefault(require("./routes/purchases.routes.js"));
const bills_routes_js_1 = __importDefault(require("./routes/bills.routes.js"));
const expenses_routes_js_1 = __importDefault(require("./routes/expenses.routes.js"));
const notifications_routes_js_1 = __importDefault(require("./routes/notifications.routes.js"));
const settings_routes_js_1 = __importDefault(require("./routes/settings.routes.js"));
const users_routes_js_1 = __importDefault(require("./routes/users.routes.js"));
const reports_routes_js_1 = __importDefault(require("./routes/reports.routes.js"));
const cashout_routes_js_1 = __importDefault(require("./routes/cashout.routes.js"));
const suppliers_routes_js_1 = __importDefault(require("./routes/suppliers.routes.js"));
const logger_js_1 = require("./utils/logger.js");
(0, env_js_1.validateEnv)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: env_js_1.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/api/v1/auth', auth_routes_js_1.default);
app.use('/api/v1/categories', categories_routes_js_1.default);
app.use('/api/v1/products', products_routes_js_1.default);
app.use('/api/v1/stock', stock_routes_js_1.default);
app.use('/api/v1/purchases', purchases_routes_js_1.default);
app.use('/api/v1/bills', bills_routes_js_1.default);
app.use('/api/v1/expenses', expenses_routes_js_1.default);
app.use('/api/v1/notifications', notifications_routes_js_1.default);
app.use('/api/v1/settings', settings_routes_js_1.default);
app.use('/api/v1/users', users_routes_js_1.default);
app.use('/api/v1/reports', reports_routes_js_1.default);
app.use('/api/v1/cashouts', cashout_routes_js_1.default);
app.use('/api/v1/suppliers', suppliers_routes_js_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.use(errorHandler_js_1.errorHandler);
const PORT = env_js_1.env.PORT;
app.listen(PORT, () => {
    logger_js_1.logger.info(`Server running on port ${PORT} in ${env_js_1.env.NODE_ENV} mode`);
});
