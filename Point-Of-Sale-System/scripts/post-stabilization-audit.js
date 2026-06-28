const fetch = require('node-fetch');
const { Pool } = require('pg');

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
  if (!cond) { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; throw new Error(msg); }
  else          console.log (`  ✅ PASS: ${msg}`);
}

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('   POST-STABILIZATION AUDIT');
  console.log('══════════════════════════════════════════════\n');

  console.log('--- Logging in ---');
  const loginRes = await post('/auth/login', { username: 'admin', password: 'Admin@123' });
  const token = loginRes.accessToken;

  // Clear today's data to ensure exact match (from DB directly)
  const pool = new Pool({
    host: process.env.PGHOST || 'helium',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'heliumdb',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'password',
  });

  const today = new Date().toISOString().split('T')[0];
  await pool.query('DELETE FROM bills WHERE DATE(created_at) = $1', [today]);
  await pool.query('DELETE FROM expenses WHERE DATE(date) = $1', [today]);
  await pool.query('DELETE FROM cashouts WHERE cashout_date = $1', [today]);

  const productsRes = await get('/products', token);
  const product = productsRes.data[0];

  console.log('\n=================================');
  console.log('TEST 1 — TODAY BILL RECONCILIATION');
  console.log('=================================');
  
  await post('/bills', { customer_name: 'Customer A', payment_mode: 'cash', items: [{ product_id: product.id, quantity: 1, price: 500 }] }, token);
  await post('/bills', { customer_name: 'Customer B', payment_mode: 'cash', items: [{ product_id: product.id, quantity: 1, price: 700 }] }, token);
  await post('/bills', { customer_name: 'Customer C', payment_mode: 'gpay', items: [{ product_id: product.id, quantity: 1, price: 2000 }] }, token);

  await post('/expenses', { category: 'Test1', description: 'Exp 1', amount: 100, date: today, payment_mode: 'cash' }, token);
  await post('/expenses', { category: 'Test2', description: 'Exp 2', amount: 300, date: today, payment_mode: 'cash' }, token);

  const currentRes = await get('/cashout/current', token);
  const d = currentRes.data;
  
  assert(Number(d.cash_sales) === 1200, `Cash Sales = ₹1200 (Got ₹${d.cash_sales})`);
  assert(Number(d.gpay_sales) === 2000, `GPay = ₹2000 (Got ₹${d.gpay_sales})`);
  assert(Number(d.expenses) === 400, `Expenses = ₹400 (Got ₹${d.expenses})`);
  assert(Number(d.expected_cash) === 800, `Expected Cash base (0+1200-400) = ₹800 (Got ₹${d.expected_cash})`);


  console.log('\n=================================');
  console.log('TEST 2 — SAVE + EDIT');
  console.log('=================================');
  
  const saveRes = await post('/cashout/save', {
    opening_cash: 1000, actual_cash: 1850, actual_gpay: 2000, notes: 'Audit Note', date: today
  }, token);
  
  let s = saveRes.data;
  assert(Number(s.expected_cash) === 1800, `Expected Cash = ₹1800 (Got ₹${s.expected_cash})`);
  assert(Number(s.difference) === 50, `Cash Difference = +₹50 (Got ₹${s.difference})`);
  assert(Number(s.gpay_difference) === 0, `GPay Difference = ₹0 (Got ₹${s.gpay_difference})`);

  const editRes = await put(`/cashout/${s.id}`, {
    opening_cash: 1000, actual_cash: 1900, actual_gpay: 2000, notes: 'Audit Edited'
  }, token);
  
  let e = editRes.data;
  assert(Number(e.difference) === 100, `Cash Difference edited = +₹100 (Got ₹${e.difference})`);


  console.log('\n=================================');
  console.log('TEST 3 — HISTORY');
  console.log('=================================');
  const histRes = await get('/cashout/history', token);
  const hist = histRes.data[0];
  assert(hist.id === s.id, `History contains the edited record`);
  assert(Number(hist.opening_cash) === 1000, `History Opening = 1000`);
  assert(Number(hist.cash_sales) === 1200, `History Cash Sales = 1200`);
  assert(Number(hist.gpay_sales) === 2000, `History GPay = 2000`);
  assert(Number(hist.expenses) === 400, `History Expenses = 400`);
  assert(Number(hist.expected_cash) === 1800, `History Expected = 1800`);
  assert(Number(hist.actual_cash) === 1900, `History Actual Cash = 1900`);
  assert(Number(hist.difference) === 100, `History Difference = 100`);
  assert(hist.notes === 'Audit Edited', `History Notes = Audit Edited`);


  console.log('\n=================================');
  console.log('TEST 4 — EXPENSES PAGE');
  console.log('=================================');
  const expsRes = await get('/expenses', token);
  const exps = Array.isArray(expsRes) ? expsRes : expsRes.data;
  const todayExps = exps.filter(ex => ex.date && ex.date.startsWith(today));
  const tableSum = todayExps.reduce((acc, ex) => acc + Number(ex.amount), 0);
  
  const monthlyRes = await get(`/expenses/monthly?start_date=${today}&end_date=${today}`, token);
  assert(Number(monthlyRes.totalThisMonth) === tableSum, `Total Expenses Card (${monthlyRes.totalThisMonth}) matches Visible Rows Total (${tableSum})`);


  console.log('\n=================================');
  console.log('TEST 6 — DATABASE COLUMNS');
  console.log('=================================');
  const dbCheck = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='cashouts' AND column_name IN ('difference', 'actual_gpay')
  `);
  const columns = dbCheck.rows.map(r => r.column_name);
  assert(columns.includes('difference'), 'cashouts.difference exists');
  assert(columns.includes('actual_gpay'), 'cashouts.actual_gpay exists');
  
  console.log('\nALL TESTS PASSED ✅');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Audit failed:', err.message);
  process.exit(1);
});
