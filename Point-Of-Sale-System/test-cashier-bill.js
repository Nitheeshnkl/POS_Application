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

    const billRes = await axios.post('http://localhost:5000/api/v1/bills', {
      customer_name: 'Test Customer',
      customer_phone: '9999999999',
      payment_mode: 'cash',
      items: [{
        product_id: 7, // assuming product 1 exists
        quantity: 1
      }],
      discount_total: 0,
      cash_given: 100,
      change_returned: 0
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Bill created:', billRes.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
test();
