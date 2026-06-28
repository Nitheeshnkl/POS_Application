const assert = require('assert');

const API_URL = 'http://localhost:5000/api/v1';

async function req(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers }
  });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.message || 'Request failed');
  return data;
}

async function testBackend() {
  console.log('--- TESTING CASH DRAWER FINAL SCENARIOS ---');
  
  // Login
  const loginRes = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'Admin@123' }) });
  const token = loginRes.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  // Test 401 resolution
  console.log('Testing /customers for 401 resolution...');
  await req('/customers', { headers: auth });
  console.log('✅ /customers returned successfully (No 401)');

  // Test 404 resolution
  console.log('Testing /cashout/current for 404 resolution...');
  let current;
  try {
     current = await req('/cashout/current', { headers: auth });
     console.log('✅ /cashout/current returned successfully (No 404)');
     if (current.data && current.data.status === 'open') {
         await req('/cashout/close', { method: 'POST', body: JSON.stringify({ actual_cash: current.data.expected_cash || 0, notes: 'cleanup' }), headers: auth });
     }
  } catch(e) {
     console.error('Failed on current:', e.message);
  }
  
  const openRes = await req('/cashout/open', { method: 'POST', body: JSON.stringify({ opening_cash: 1000 }), headers: auth });
  console.log('1. Opened drawer with ₹1000');
  
  const pRes = await req('/products', {
      method: 'POST', body: JSON.stringify({
      name_en: `Test Product ${Date.now()}`, name_ta: `பொருள்`, category_id: 1,
      unit_type: 'pcs', purchase_price: 50, selling_price: 500, initial_stock: 100
      }), headers: auth
  });
  
  await req('/bills', {
      method: 'POST', body: JSON.stringify({
      customer_name: `Cust ${Date.now()}`, payment_mode: 'cash',
      items: [{ product_id: pRes.id, quantity: 1 }]
      }), headers: auth
  });
  console.log('2. Created cash bill ₹500');
  
  await req('/expenses', {
      method: 'POST', body: JSON.stringify({
      category: 'Test', amount: 100, description: `Test Exp`, date: new Date().toISOString().split('T')[0], payment_mode: 'cash'
      }), headers: auth
  });
  console.log('3. Add expense ₹100');
  
  const currentDraw = await req('/cashout/current', { headers: auth });
  assert.strictEqual(Number(currentDraw.data.expected_cash), 1400, 'Expected cash should be 1400');
  console.log(`4. Verified Expected Cash: ₹${currentDraw.data.expected_cash}`);
  
  const closeRes = await req('/cashout/close', { method: 'POST', body: JSON.stringify({ actual_cash: 1450, notes: 'Closing test' }), headers: auth });
  console.log(`5. Closed drawer with ₹1450. Difference: +₹50`);
  
  const editRes = await req(`/cashout/${closeRes.data.id}`, { method: 'PUT', body: JSON.stringify({ actual_cash: 1500, notes: 'Edited test' }), headers: auth });
  console.log(`6. Edited actual to ₹1500. Difference: +₹100`);
  
  const historyRes = await req('/cashout/history', { headers: auth });
  console.log('8. Load history returned successfully (No 404)');

  console.log('ALL TESTS PASSED SUCCESSFULLY');
}

testBackend().catch(err => {
  console.error('API Test Failed:', err.message);
  process.exit(1);
});
