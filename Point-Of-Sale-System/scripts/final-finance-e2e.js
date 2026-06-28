/**
 * Final Finance E2E Verification Script
 * Run: node scripts/final-finance-e2e.js
 *
 * Tests: Cashout save/edit, Expenses total, History editing
 */

const BASE = 'http://localhost:5000/api/v1';

async function post(path, body, token) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function get(path, token) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  return r.json();
}

async function put(path, body, token) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  return r.json();
}

function assert(cond, msg) {
  if (!cond) { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; }
  else          console.log (`  ✅ PASS: ${msg}`);
}

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('   FINAL FINANCE RECONCILIATION E2E TEST');
  console.log('══════════════════════════════════════════════\n');

  // ── 1. Login ──────────────────────────────────────────────────────────────
  console.log('STEP 1: Login as owner');
  const loginRes = await post('/auth/login', { username: 'admin', password: 'Admin@123' });
  assert(loginRes.accessToken, 'Login returned access token');
  const token = loginRes.accessToken;

  // ── 2. Get a product to bill ───────────────────────────────────────────────
  console.log('\nSTEP 2: Fetch a product for billing');
  const productsRes = await get('/products', token);
  const products = productsRes.data || productsRes;
  assert(Array.isArray(products) && products.length > 0, 'Products list not empty');
  const product = products[0];
  console.log(`  Using product: ${product.nameEn || product.name_en || product.id}`);

  // ── 3. Create bills ────────────────────────────────────────────────────────
  console.log('\nSTEP 3: Create 3 bills (₹500 cash, ₹1000 cash, ₹2000 gpay)');

  const bill1 = await post('/bills', {
    customer_name: 'Test Customer A',
    payment_mode: 'cash',
    items: [{ product_id: product.id, quantity: 1, price: 500 }]
  }, token);
  assert(bill1.id || bill1.data?.id || bill1.success !== false, 'Bill 1 (₹500 cash) created');

  const bill2 = await post('/bills', {
    customer_name: 'Test Customer B',
    payment_mode: 'cash',
    items: [{ product_id: product.id, quantity: 2, price: 500 }]
  }, token);
  assert(bill2.id || bill2.data?.id || bill2.success !== false, 'Bill 2 (₹1000 cash) created');

  const bill3 = await post('/bills', {
    customer_name: 'Test Customer C',
    payment_mode: 'upi',
    items: [{ product_id: product.id, quantity: 4, price: 500 }]
  }, token);
  assert(bill3.id || bill3.data?.id || bill3.success !== false, 'Bill 3 (₹2000 gpay/upi) created');

  // ── 4. Create expenses ─────────────────────────────────────────────────────
  console.log('\nSTEP 4: Create 2 expenses (₹100 + ₹300 = ₹400)');
  const today = new Date().toISOString().split('T')[0];

  const exp1 = await post('/expenses', {
    category: 'Test', description: 'E2E Test Exp 1', amount: 100,
    date: today, payment_mode: 'cash'
  }, token);
  assert(exp1.id || exp1.data?.id || !exp1.error, 'Expense ₹100 created');

  const exp2 = await post('/expenses', {
    category: 'Test', description: 'E2E Test Exp 2', amount: 300,
    date: today, payment_mode: 'cash'
  }, token);
  assert(exp2.id || exp2.data?.id || !exp2.error, 'Expense ₹300 created');

  // ── 5. Check current drawer figures ───────────────────────────────────────
  console.log('\nSTEP 5: Verify system figures');
  const currentRes = await get('/cashout/current', token);
  const d = currentRes.data;
  assert(d, 'getCurrentDrawer returned data');
  console.log(`  cash_sales:     ₹${d?.cash_sales}`);
  console.log(`  gpay_sales:     ₹${d?.gpay_sales}`);
  console.log(`  expenses:       ₹${d?.expenses}`);
  console.log(`  expected_cash:  ₹${d?.expected_cash}`);
  assert(Number(d?.cash_sales) === 1500, `Cash Sales = ₹1500 (got ₹${d?.cash_sales})`);
  assert(Number(d?.gpay_sales) === 2000, `GPay Sales = ₹2000 (got ₹${d?.gpay_sales})`);
  assert(Number(d?.expenses)   === 400,  `Expenses = ₹400 (got ₹${d?.expenses})`);

  // ── 6. Save cashout with Opening ₹1000, Actual ₹2200, GPay ₹2000 ──────────
  console.log('\nSTEP 6: Save cashout — Opening ₹1000, Actual ₹2200, GPay actual ₹2000');
  const saveRes = await post('/cashout/save', {
    opening_cash: 1000, actual_cash: 2200, actual_gpay: 2000, notes: 'E2E test', date: today
  }, token);
  const s = saveRes.data;
  assert(saveRes.success, 'saveCashout succeeded');
  // expected = 1000 + 1500 - 400 = 2100
  assert(Number(s?.expected_cash) === 2100, `Expected Cash = ₹2100 (got ₹${s?.expected_cash})`);
  assert(Number(s?.difference) === 100, `Cash Diff = +₹100 (got ₹${s?.difference})`);
  assert(s?.gpay_difference === 0, `GPay Diff = 0 (got ${s?.gpay_difference})`);
  console.log(`  Saved record id: ${s?.id}`);
  const savedId = s?.id;

  // ── 7. Reload and verify persistence ──────────────────────────────────────
  console.log('\nSTEP 7: Reload and verify persistence');
  const reloadRes = await get('/cashout/current', token);
  const r = reloadRes.data;
  assert(r?.id === savedId, `Record persisted with same id (${savedId})`);
  assert(Number(r?.actual_cash) === 2200, `Actual Cash persisted = ₹2200 (got ₹${r?.actual_cash})`);

  // ── 8. Edit: change actual to ₹2300 ───────────────────────────────────────
  console.log('\nSTEP 8: Edit actual cash to ₹2300');
  const editRes = await put(`/cashout/${savedId}`, { actual_cash: 2300, notes: 'Edited in E2E' }, token);
  const e = editRes.data;
  assert(editRes.success, 'editCashout succeeded');
  assert(Number(e?.actual_cash) === 2300, `Actual cash updated to ₹2300 (got ₹${e?.actual_cash})`);
  assert(Number(e?.difference) === 200, `Cash Diff = +₹200 (got ₹${e?.difference})`);

  // ── 9. Open history ────────────────────────────────────────────────────────
  console.log('\nSTEP 9: Cashout History');
  const histRes = await get('/cashout/history', token);
  const hist = histRes.data;
  assert(Array.isArray(hist), 'History returned an array');
  assert(hist.length > 0, 'History has records');
  const histRecord = hist.find((h) => h.id === savedId);
  assert(histRecord, 'Our record appears in history');
  assert(Number(histRecord?.actual_cash) === 2300, `History shows updated actual ₹2300`);

  // ── 10. Verify expenses total ─────────────────────────────────────────────
  console.log('\nSTEP 10: Expenses total');
  const expListRes = await get('/expenses', token);
  const expList = Array.isArray(expListRes) ? expListRes : (expListRes.data || []);
  const todayExps = expList.filter((ex) => {
    const d = ex.date || ex.created_at || '';
    return d.startsWith(today);
  });
  const tableSum = todayExps.reduce((s, ex) => s + Number(ex.amount || 0), 0);

  const monthlyRes = await get(`/expenses/monthly?start_date=${today}&end_date=${today}`, token);
  const apiTotal = Number(monthlyRes.totalThisMonth || 0);
  console.log(`  Table sum (today):  ₹${tableSum}`);
  console.log(`  API total (today):  ₹${apiTotal}`);
  assert(apiTotal >= 400, `Expenses API total >= ₹400 (got ₹${apiTotal})`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  if (process.exitCode === 1) {
    console.log('  RESULT: SOME TESTS FAILED — check logs above');
  } else {
    console.log('  RESULT: ALL TESTS PASSED ✅');
  }
  console.log('══════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ E2E script crashed:', err.message);
  process.exit(1);
});
