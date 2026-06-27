-- Default Settings
INSERT INTO settings (key, value) VALUES 
('store_name', 'Sri Murugan Store'),
('store_address', '123 Main St, Tamil Nadu'),
('store_phone', '9876543210'),
('store_gstin', ''),
('gst_enabled', 'false'),
('low_stock_alert', '5'),
('receipt_footer', 'Thank you for shopping!'),
('bill_prefix', 'SMS')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed Users (Passwords: Admin@123, Cashier@123)
INSERT INTO users (name, username, password, role) VALUES 
('Admin', 'admin', '$2b$10$F8HvM6sqnD4HbIHYgDbBcOYWQCltYsIjv4jxFLeyFTQE0Mc1aILo.', 'owner'),
('Cashier 1', 'cashier1', '$2b$10$bQMPdTsZVDkjFdiSwRDLTebCWSi7FWViDpbulelCTp4jNgdxwhsq.', 'cashier')
ON CONFLICT (username) DO NOTHING;
