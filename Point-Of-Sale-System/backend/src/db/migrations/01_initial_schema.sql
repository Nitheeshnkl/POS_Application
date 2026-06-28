-- ==============================================================================
-- SRI MURUGAN STORE POS - PRODUCTION BOOTSTRAP SCRIPT
-- Contains all tables, indexes, relations, and initial seeds for production.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'cashier')),
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    credit_used NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    credit_used NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(50),
    address TEXT,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Supplier Transactions
CREATE TABLE IF NOT EXISTS supplier_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'payment', 'adjustment')),
    amount DECIMAL(10, 2) NOT NULL,
    reference_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_ta VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name_en VARCHAR(200) NOT NULL,
    name_ta VARCHAR(200),
    barcode VARCHAR(50) UNIQUE,
    unit_type VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    current_stock DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    min_stock_alert DECIMAL(10, 3) DEFAULT 5.000,
    gst_rate DECIMAL(5, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'purchase', 'damage', 'return')),
    quantity DECIMAL(10, 3) NOT NULL,
    previous_stock DECIMAL(10, 3) NOT NULL,
    new_stock DECIMAL(10, 3) NOT NULL,
    reason TEXT,
    performed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    supplier_phone VARCHAR(15),
    invoice_number VARCHAR(100),
    purchase_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('cash', 'upi', 'card', 'credit')),
    supplier_credit_due NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL
);

-- 10. Bills
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(15),
    subtotal DECIMAL(12, 2) NOT NULL,
    gst_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12, 2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'card', 'credit')),
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'cancelled')),
    credit_due NUMERIC(12,2) DEFAULT 0,
    credit_status VARCHAR(20) DEFAULT 'paid' CHECK (credit_status IN ('paid', 'partial', 'pending')),
    cash_given NUMERIC(10,2),
    change_returned NUMERIC(10,2),
    cashier_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bill Items
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name_en VARCHAR(200),
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) DEFAULT 0.00,
    line_total DECIMAL(12, 2) NOT NULL
);

-- 12. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('cash', 'upi', 'card')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    target_role VARCHAR(20) CHECK (target_role IN ('owner', 'cashier', 'all')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Cashouts
CREATE TABLE IF NOT EXISTS cashouts (
    id SERIAL PRIMARY KEY,
    opened_by INTEGER REFERENCES users(id),
    cashout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    opening_cash NUMERIC(10,2) DEFAULT 0,
    actual_cash NUMERIC(10,2),
    actual_gpay NUMERIC(10,2),
    difference NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cashouts_date_unique UNIQUE (cashout_date)
);

-- 17. Requested Products
CREATE TABLE IF NOT EXISTS requested_products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    product_name_ta VARCHAR(200),
    notes TEXT,
    requested_count INTEGER DEFAULT 1,
    requested_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested', 'ordered', 'stocked', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- 1. Create Default Admin User
INSERT INTO users (name, username, password, role) 
VALUES ('Admin Owner', 'admin', '$2b$10$R/Hv762KUryySubz8WaK2OQEXHRzwkGbheCD7DX5J6nt1QWnNO0JW', 'owner')
ON CONFLICT (username) DO NOTHING;

-- 2. Insert Default Settings
INSERT INTO settings (key, value) VALUES 
('store_name', 'Sri Murugan Store'),
('store_address', 'Chennai, Tamil Nadu'),
('store_phone', '9876543210')
ON CONFLICT (key) DO NOTHING;

-- 3. Default Categories
INSERT INTO categories (name_en, name_ta) VALUES 
('Groceries', 'மளிகை'),
('Beverages', 'பானங்கள்'),
('Snacks', 'தின்பண்டங்கள்'),
('Cleaning Supplies', 'சுத்தம் செய்யும் பொருட்கள்')
ON CONFLICT DO NOTHING;
