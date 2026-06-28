CREATE TABLE IF NOT EXISTS cashouts (
  id SERIAL PRIMARY KEY,
  cashier_id INTEGER REFERENCES users(id),
  amount NUMERIC(10,2) NOT null,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bills
ADD COLUMN IF NOT EXISTS cash_given NUMERIC(10,2);

ALTER TABLE bills
ADD COLUMN IF NOT EXISTS change_returned NUMERIC(10,2);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  gstin VARCHAR(50),
  address TEXT,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS supplier_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'payment', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  reference_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE purchases ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
-- Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) UNIQUE,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  credit_used NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alter Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_used NUMERIC(12,2) DEFAULT 0;

-- Alter Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0;

-- Alter Bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS credit_due NUMERIC(12,2) DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS credit_status VARCHAR(20) DEFAULT 'paid' CHECK (credit_status IN ('paid', 'partial', 'pending'));

-- Alter Purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS supplier_credit_due NUMERIC(12,2) DEFAULT 0;
