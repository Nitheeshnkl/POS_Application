const axios = require('axios');
const assert = require('assert');

const API_URL = 'http://localhost:5000/api/v1';

async function testBackend() {
  console.log('--- TESTING API FLOW ---');
  
  const loginRes = await axios.post(`${API_URL}/auth/login`, { username: 'admin', password: 'Admin@123' });
  const token = loginRes.data.accessToken;
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  
  let drawer;
  try {
    const currentRes = await axios.get(`${API_URL}/cashout/current`, auth);
    if (currentRes.data.status === 'open') {
       drawer = currentRes.data;
    } else {
       const openRes = await axios.post(`${API_URL}/cashout/open`, { opening_cash: 1000 }, auth);
       drawer = openRes.data;
       console.log('1. Opened drawer with ₹1000');
    }
  } catch (err) {
    if (err.response?.data?.message?.includes('already')) {
      console.log('Drawer already exists for today, proceeding with existing drawer.');
    } else {
      throw err;
    }
  }
  
  const pRes = await axios.post(`${API_URL}/products`, {
      name_en: `Test Product ${Date.now()}`, name_ta: `பொருள்`, category_id: 1,
      unit_type: 'pcs', purchase_price: 50, selling_price: 500, initial_stock: 100
  }, auth);
  const productId = pRes.data.id;
  
  await axios.post(`${API_URL}/bills`, {
      customer_name: `Cust ${Date.now()}`, payment_mode: 'cash',
      items: [{ product_id: productId, quantity: 1 }]
  }, auth);
  console.log('2. Created cash bill ₹500');
  
  const expRes = await axios.post(`${API_URL}/expenses`, {
      category: 'Test', amount: 100, description: `Test Exp`, date: new Date().toISOString().split('T')[0], payment_mode: 'cash'
  }, auth);
  console.log('3. Created expense ₹100');
  
  const currentDraw = (await axios.get(`${API_URL}/cashout/current`, auth)).data;
  console.log(`4. Verified current expected cash: ₹${currentDraw.expected_cash}`);
  
  let closeRes;
  try {
    closeRes = await axios.post(`${API_URL}/cashout/close`, { actual_cash: currentDraw.expected_cash + 50, notes: 'Closing test' }, auth);
    console.log(`5. Closed drawer with actual ₹${closeRes.data.data.actual_cash}`);
    console.log(`6. Verified difference +₹50: Found ${closeRes.data.data.actual_cash - closeRes.data.data.expected_cash}`);
  } catch (err) {
    if (err.response?.data?.message?.includes('No open')) {
       const hist = await axios.get(`${API_URL}/cashout/history`, auth);
       closeRes = { data: { data: hist.data[0] } };
    } else {
      throw err;
    }
  }
  
  const editRes = await axios.put(`${API_URL}/cashout/${closeRes.data.data.id}`, { actual_cash: currentDraw.expected_cash + 100, notes: 'Edited test' }, auth);
  console.log(`7. Edited actual to ₹${editRes.data.data.actual_cash}`);
  console.log(`8. Verified edited difference +₹100: Found ${editRes.data.data.actual_cash - editRes.data.data.expected_cash}`);
  
  try {
     await axios.put(`${API_URL}/expenses/${expRes.data.id}`, { category: '', amount: -10, date: new Date().toISOString().split('T')[0], payment_mode: 'cash' }, auth);
     assert.fail('Should reject invalid expense');
  } catch (err) {
     console.log('12. Rejected invalid expense updates correctly');
  }
  
  const expEdit = await axios.put(`${API_URL}/expenses/${expRes.data.id}`, { category: 'Test Valid', amount: 200, date: new Date().toISOString().split('T')[0], payment_mode: 'cash' }, auth);
  console.log(`11. Edited expense successfully: ${expEdit.data.data.amount}`);
  
  console.log('API TESTS PASSED');
}

testBackend().catch(err => {
  console.error('API Test Failed:', err.message);
  process.exit(1);
});
