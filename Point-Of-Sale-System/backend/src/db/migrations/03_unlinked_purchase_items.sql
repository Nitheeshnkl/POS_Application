ALTER TABLE purchase_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(200);

UPDATE purchase_items pi
SET product_name = p.name_en
FROM products p
WHERE pi.product_id = p.id
  AND (pi.product_name IS NULL OR pi.product_name = '');
