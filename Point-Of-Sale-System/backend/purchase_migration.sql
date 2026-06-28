ALTER TABLE purchases ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
