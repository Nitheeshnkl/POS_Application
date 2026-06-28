import fs from 'fs';

const API = 'http://localhost:3001/api/v1';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status} on ${options.method || 'GET'} ${url}: ${err}`);
  }
  return res.json();
}

async function run() {
  console.log('--- STARTING QA E2E TESTS ---');
  try {
    // 1. Owner Login
    console.log('1. Owner login...');
    let res = await fetchJSON('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });
    const ownerToken = res.accessToken;
    const ownerHeaders = { 'Authorization': `Bearer ${ownerToken}` };
    console.log('Owner login success.');

    // 2. Categories
    console.log('2. Categories CRUD...');
    const cat1 = await fetchJSON('/categories', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ name_en: 'Groceries', name_ta: 'மளிகை' }) });
    const cat2 = await fetchJSON('/categories', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ name_en: 'Beverages', name_ta: 'பானங்கள்' }) });
    console.log('Categories created:', cat1.id, cat2.id);

    // 3. Products
    console.log('3. Products CRUD...');
    const products = [
      { name_en: 'Rice', name_ta: 'அரிசி', barcode: '111', category_id: cat1.id, purchase_price: 40, selling_price: 50, initial_stock: 100, unit_type: 'kg' },
      { name_en: 'Milk', name_ta: 'பால்', barcode: '222', category_id: cat2.id, purchase_price: 25, selling_price: 30, initial_stock: 50, unit_type: 'liter' },
      { name_en: 'Soap', name_ta: 'சோப்பு', barcode: '333', category_id: cat1.id, purchase_price: 20, selling_price: 25, initial_stock: 200, unit_type: 'pcs' },
      { name_en: 'Shampoo', name_ta: 'ஷாம்பு', barcode: '444', category_id: cat1.id, purchase_price: 150, selling_price: 180, initial_stock: 20, unit_type: 'pcs' },
      { name_en: 'Biscuit', name_ta: 'பிஸ்கட்', barcode: '555', category_id: cat1.id, purchase_price: 10, selling_price: 15, initial_stock: 150, unit_type: 'packet' },
    ];
    let createdProducts = [];
    for (const p of products) {
      createdProducts.push(await fetchJSON('/products', { method: 'POST', headers: ownerHeaders, body: JSON.stringify(p) }));
    }
    console.log(`Created ${createdProducts.length} products.`);

    // 4. Update & Delete Product
    console.log('4. Product Update/Delete...');
    let rice = createdProducts[0];
    await fetchJSON(`/products/${rice.id}`, { method: 'PUT', headers: ownerHeaders, body: JSON.stringify({ ...rice, selling_price: 55 }) });
    await fetchJSON(`/products/${createdProducts[4].id}`, { method: 'DELETE', headers: ownerHeaders });
    console.log('Product update & delete success.');

    // 5. Create Cashier
    console.log('5. Cashier CRUD...');
    // If it fails with duplicate, handle it
    let cashier;
    try {
      cashier = await fetchJSON('/users', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ name: 'Cashier Test', username: 'cashier_test', password: 'Cash@123', role: 'cashier' }) });
    } catch(e) {
      console.log('Cashier might exist, ignoring error.');
    }

    // 6. Cashier Login
    console.log('6. Cashier login...');
    res = await fetchJSON('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'cashier1', password: 'Cashier@123' })
    });
    const cashierToken = res.accessToken;
    const cashierHeaders = { 'Authorization': `Bearer ${cashierToken}` };
    console.log('Cashier login success.');

    // 7. Get Active Products
    console.log('7. Billing GET products...');
    let activeProducts = await fetchJSON('/products?is_active=true', { headers: cashierHeaders });
    if (activeProducts.length < 4) throw new Error("Not all active products returned");
    console.log('Billing products fetched:', activeProducts.length);

    // 8. Checkout Tests
    console.log('8. Checkout operations...');
    const billItems = [
      { product_id: createdProducts[0].id, quantity: 2, unit_price: 55, total_price: 110, name_en: 'Rice' },
      { product_id: createdProducts[1].id, quantity: 1, unit_price: 30, total_price: 30, name_en: 'Milk' }
    ];
    
    // Cash Bill
    await fetchJSON('/bills', { method: 'POST', headers: cashierHeaders, body: JSON.stringify({
      payment_mode: 'cash', customer_name: 'Test', subtotal: 140, grand_total: 140, items: billItems, cash_given: 150, change_returned: 10
    }) });
    // UPI Bill
    await fetchJSON('/bills', { method: 'POST', headers: cashierHeaders, body: JSON.stringify({
      payment_mode: 'upi', customer_name: 'Test', subtotal: 140, grand_total: 140, items: billItems
    }) });
    console.log('Checkout tests success.');

    // 9. Failure Tests
    console.log('9. Failure / Edge cases...');
    try {
      await fetchJSON('/products', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ name_en: 'Rice', barcode: '111' }) });
      throw new Error("Should have failed duplicate barcode!");
    } catch(e) {
      if(!e.message.includes('400')) throw e; // Expected 400 Bad Request
    }
    
    try {
      await fetchJSON('/products', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ barcode: '999' }) });
      throw new Error("Should have failed empty name!");
    } catch(e) {
      if(!e.message.includes('400')) throw e;
    }
    console.log('Edge cases handled correctly.');

    console.log('--- ALL TESTS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('TEST FAILED:', err.message);
  }
}

run();
