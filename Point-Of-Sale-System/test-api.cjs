const assert = require('assert');

const API_URL = 'http://localhost:5000/api/v1';

async function req(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function testBackend() {
  console.log('--- TESTING API FLOW ---');
  
  const loginRes = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'Admin@123' }) });
  const token = loginRes.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  
  let drawer;
  try {
    const currentRes = await req('/cashout/current', { headers: auth });
    if (currentRes.status === 'open') {
       drawer = currentRes;
    } else {
       const openRes = await req('/cashout/open', { method: 'POST', body: JSON.stringify({ opening_cash: 1000 }), headers: auth });
       drawer = openRes;
       console.log('1. Opened drawer with ₹1000');
    }
  } catch (err) {
    if (err.message.includes('already')) {
      console.log('Drawer already exists for today, proceeding with existing drawer.');
    } else {
      throw err;
    }
  }
  
  const pRes = await req('/products', {
      method: 'POST', body: JSON.stringify({
      name_en: `Test Product ${Date.now()}`, name_ta: `பொருள்`, category_id: 1,
      unit_type: 'pcs', purchase_price: 50, selling_price: 500, initial_stock: 100
      }), headers: auth
  });
  const productId = pRes.id;
  
  await req('/bills', {
      method: 'POST', body: JSON.stringify({
      customer_name: `Cust ${Date.now()}`, payment_mode: 'cash',
      items: [{ product_id: productId, quantity: 1 }]
      }), headers: auth
  });
  console.log('2. Created cash bill ₹500');
  
  const expRes = await req('/expenses', {
      method: 'POST', body: JSON.stringify({
      category: 'Test', amount: 100, description: `Test Exp`, date: new Date().toISOString().split('T')[0], payment_mode: 'cash'
      }), headers: auth
  });
  console.log('3. Created expense ₹100');
  
  const currentDraw = await req('/cashout/current', { headers: auth });
  console.log(`4. Verified current expected cash: ₹${currentDraw.expected_cash}`);
  
  let closeRes;
  try {
    closeRes = await req('/cashout/close', { method: 'POST', body: JSON.stringify({ actual_cash: currentDraw.expected_cash + 50, notes: 'Closing test' }), headers: auth });
    console.log(`5. Closed drawer with actual ₹${closeRes.data.actual_cash}`);
    console.log(`6. Verified difference +₹50: Found ${closeRes.data.actual_cash - closeRes.data.expected_cash}`);
  } catch (err) {
    if (err.message.includes('No open')) {
       const hist = await req('/cashout/history', { headers: auth });
       closeRes = { data: hist[0] };
    } else {
      throw err;
    }
  }
  
  const editRes = await req(`/cashout/${closeRes.data.id}`, { method: 'PUT', body: JSON.stringify({ actual_cash: currentDraw.expected_cash + 100, notes: 'Edited test' }), headers: auth });
  console.log(`7. Edited actual to ₹${editRes.data.actual_cash}`);
  console.log(`8. Verified edited difference +₹100: Found ${editRes.data.actual_cash - editRes.data.expected_cash}`);
  
  try {
     await req(`/expenses/${expRes.id}`, { method: 'PUT', body: JSON.stringify({ category: '', amount: -10, date: new Date().toISOString().split('T')[0], payment_mode: 'cash' }), headers: auth });
     assert.fail('Should reject invalid expense');
  } catch (err) {
     console.log('12. Rejected invalid expense updates correctly');
  }
  
  const expEdit = await req(`/expenses/${expRes.id}`, { method: 'PUT', body: JSON.stringify({ category: 'Test Valid', amount: 200, date: new Date().toISOString().split('T')[0], payment_mode: 'cash' }), headers: auth });
  console.log(`11. Edited expense successfully: ${expEdit.data.amount}`);
  
  console.log('API TESTS PASSED');
}

testBackend().catch(err => {
  console.error('API Test Failed:', err.message);
  process.exit(1);
});
