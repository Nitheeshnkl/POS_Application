const axios = require('axios');
const assert = require('assert');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      username: 'cashier1',
      password: 'Cashier@123'
    });
    const token = loginRes.data.accessToken;
    console.log('Login successful');

    const productRes = await axios.post('http://localhost:5000/api/v1/products', {
      name_en: 'Test Product ' + Date.now(),
      name_ta: 'Test',
      category_id: 1,
      unit_type: 'pcs',
      purchase_price: 10,
      selling_price: 20,
      initial_stock: 50
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Product created:', productRes.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
test();
