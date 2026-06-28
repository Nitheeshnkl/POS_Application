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
