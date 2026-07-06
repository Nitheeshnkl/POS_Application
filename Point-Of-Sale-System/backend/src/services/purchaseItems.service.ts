import { PoolClient } from 'pg';

export interface NormalizedPurchaseItem {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_linked: boolean;
}

export const normalizePurchaseItem = async (client: PoolClient, item: any): Promise<NormalizedPurchaseItem> => {
  const rawProductId = item.product_id ?? item.productId ?? null;
  const product_id = rawProductId === '' || rawProductId === undefined ? null : rawProductId;
  const quantity = Number(item.quantity ?? item.qty);
  const unit_price = Number(item.unit_price ?? item.unitPrice ?? item.purchase_price ?? item.purchasePrice);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Purchase item quantity must be greater than zero');
  }

  if (!Number.isFinite(unit_price) || unit_price < 0) {
    throw new Error('Purchase item unit price is required');
  }

  if (product_id) {
    const productRes = await client.query(
      'SELECT id, name_en, current_stock FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );

    if (productRes.rowCount === 0) {
      throw new Error(`Product with id ${product_id} not found`);
    }

    return {
      product_id: Number(product_id),
      product_name: item.product_name?.trim() || item.productName?.trim() || productRes.rows[0].name_en,
      quantity,
      unit_price,
      total_price: quantity * unit_price,
      is_linked: true,
    };
  }

  const product_name = (item.product_name ?? item.productName ?? item.productNameEn ?? '').trim();
  if (!product_name) {
    throw new Error('Product name is required for unlinked purchase items');
  }

  return {
    product_id: null,
    product_name,
    quantity,
    unit_price,
    total_price: quantity * unit_price,
    is_linked: false,
  };
};

export const convertPurchaseItemToProduct = async (
  client: PoolClient,
  itemId: string,
  payload: any,
  performedBy?: number
) => {
  const itemRes = await client.query(
    `SELECT pi.*, p.invoice_number
     FROM purchase_items pi
     JOIN purchases p ON p.id = pi.purchase_id
     WHERE pi.id = $1
     FOR UPDATE`,
    [itemId]
  );

  if (itemRes.rowCount === 0) {
    const error: any = new Error('Purchase item not found');
    error.status = 404;
    throw error;
  }

  const item = itemRes.rows[0];
  if (item.product_id) {
    const error: any = new Error('Purchase item is already linked to a product');
    error.status = 400;
    throw error;
  }

  const name_en = (payload.name_en ?? payload.nameEn ?? item.product_name ?? '').trim();
  if (!name_en) {
    const error: any = new Error('Product name is required');
    error.status = 400;
    throw error;
  }

  const initialStock = Number(item.quantity);
  const purchasePrice = Number(item.unit_price);

  const productRes = await client.query(
    `INSERT INTO products
      (category_id, name_en, name_ta, barcode, unit_type, purchase_price, selling_price, current_stock, min_stock_alert, gst_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      payload.category_id ?? payload.categoryId ?? null,
      name_en,
      payload.name_ta ?? payload.nameTa ?? null,
      payload.barcode?.trim() || null,
      payload.unit_type ?? payload.unitType ?? 'pcs',
      purchasePrice,
      Number(payload.selling_price ?? payload.sellingPrice ?? purchasePrice),
      initialStock,
      Number(payload.min_stock_alert ?? payload.minStockAlert ?? 5),
      Number(payload.gst_rate ?? payload.gstRate ?? 0),
    ]
  );

  const product = productRes.rows[0];

  await client.query(
    'UPDATE purchase_items SET product_id = $1, product_name = $2 WHERE id = $3',
    [product.id, product.name_en, itemId]
  );

  await client.query(
    `INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      product.id,
      'purchase',
      initialStock,
      0,
      initialStock,
      `Convert Purchase Item${item.invoice_number ? ` - Invoice: ${item.invoice_number}` : ''}`,
      performedBy,
    ]
  );

  return product;
};
