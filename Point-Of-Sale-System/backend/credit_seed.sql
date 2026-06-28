-- Seed Cashier Limit
UPDATE users SET credit_limit = 25000 WHERE username = 'cashier1';

-- Seed Customers
INSERT INTO customers (name, phone, credit_limit) VALUES ('Murugan', '9876543210', 5000) ON CONFLICT (phone) DO NOTHING;
INSERT INTO customers (name, phone, credit_limit) VALUES ('Kumar', '9876543211', 10000) ON CONFLICT (phone) DO NOTHING;

-- Seed Suppliers
INSERT INTO suppliers (name, phone, credit_limit) VALUES ('ABC Wholesale', '1111111111', 100000);
INSERT INTO suppliers (name, phone, credit_limit) VALUES ('Fresh Foods', '2222222222', 50000);
