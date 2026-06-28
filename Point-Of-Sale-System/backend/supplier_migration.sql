ALTER TABLE suppliers ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'payment', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
