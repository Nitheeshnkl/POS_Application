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
