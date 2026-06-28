const BASE = 'http://localhost:5000/api/v1';

async function req(method, path, body, token) {
  const options = {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; throw new Error(msg); }
  else          console.log (`  ✅ PASS: ${msg}`);
}

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('   FINAL POS SMOKE TEST');
  console.log('══════════════════════════════════════════════\n');

  // 1 Login owner
  console.log('--- 1. Login ---');
  let r = await req('POST', '/auth/login', { username: 'admin', password: 'Admin@123' });
  assert(r.status === 200, 'Login success');
  const token = r.data.accessToken;

  // Ensure products available
  r = await req('GET', '/products', null, token);
  const product = r.data[0];

  // 2 Open Cash Drawer (Check /cashout/current doesn't 500)
  console.log('\n--- 2. Open Cash Drawer ---');
  r = await req('GET', '/cashout/current', null, token);
  assert(r.status === 200, `GET /cashout/current returned ${r.status}`);
  
  // 3 Create CASH bill
  console.log('\n--- 3. Create CASH Bill ---');
  r = await req('POST', '/bills', { customer_name: 'Cash Cust', payment_mode: 'cash', items: [{ product_id: product.id, quantity: 1, price: 500 }] }, token);
  assert(r.status === 201, 'CASH Bill created');

  // 4 Create GPAY bill
  console.log('\n--- 4. Create GPAY Bill ---');
  r = await req('POST', '/bills', { customer_name: 'Gpay Cust', payment_mode: 'gpay', items: [{ product_id: product.id, quantity: 1, price: 300 }] }, token);
  assert(r.status === 201, 'GPAY Bill created');

  // 5 Add expense
  console.log('\n--- 5. Add Expense ---');
  r = await req('POST', '/expenses', { category: 'Test', description: 'Test', amount: 100, payment_mode: 'cash' }, token);
  assert(r.status === 201, 'Expense created');

  // 6 Save cashout
  console.log('\n--- 6. Save Cashout ---');
  r = await req('POST', '/cashout/save', { opening_cash: 1000, actual_cash: 1400, actual_gpay: 300 }, token);
  assert(r.status === 200, 'Cashout saved');
  const cashoutId = r.data.data.id;

  // 7 Reload
  console.log('\n--- 7. Reload Cashout ---');
  r = await req('GET', '/cashout/current', null, token);
  assert(r.status === 200 && r.data.data.id === cashoutId, 'Reloaded current cashout matches saved');

  // 8 Edit cashout
  console.log('\n--- 8. Edit Cashout ---');
  r = await req('PUT', `/cashout/${cashoutId}`, { actual_cash: 1500, notes: 'Edited' }, token);
  assert(r.status === 200, 'Cashout edited');

  // 9 Verify persistence
  console.log('\n--- 9. Verify Persistence ---');
  r = await req('GET', '/cashout/history', null, token);
  assert(r.status === 200, 'History loaded');
  assert(r.data.data[0].actual_cash === '1500.00' || r.data.data[0].actual_cash === 1500, 'Persistence verified');

  // 10 Create product (legacy payload check)
  console.log('\n--- 10. Create Product ---');
  r = await req('POST', '/products', { 
    name_en: 'Smoke Test Product',
    category: 1,
    unit: 'pcs',
    opening_stock: 50,
    purchase_price: 10,
    selling_price: 20
  }, token);
  assert(r.status === 201, `Product created successfully, got ${r.status}`);

  // 11 Open audit logs
  console.log('\n--- 11. Open Audit Logs ---');
  r = await req('GET', '/audit-logs', null, token);
  assert(r.status === 200, `Audit logs returned ${r.status}`);

  // 12 Export report
  console.log('\n--- 12. Export Report ---');
  r = await req('GET', '/export/daily-summary', null, token);
  assert(r.status === 200, `Export summary returned ${r.status}`);

  console.log('\nALL SMOKE TESTS PASSED ✅');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Smoke test failed:', err.message);
  process.exit(1);
});
