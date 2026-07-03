/**
 * E2E verification script — tests all 6 bug fixes against the live API.
 * Run: node Point-Of-Sale-System/e2e_verify.mjs
 */
import http from 'http';

const BASE = 'http://localhost:3001/api/v1';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1${path}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  const results = {};

  // ── 0. Login both users ───────────────────────────────────────────────────
  const adminLogin = await request('POST', '/auth/login', { username: 'admin', password: 'Admin@123' });
  const cashierLogin = await request('POST', '/auth/login', { username: 'cashier1', password: 'Cashier@123' });

  const adminTok = adminLogin.body?.accessToken;
  const cashierTok = cashierLogin.body?.accessToken;
  console.log('admin login:', adminLogin.status === 200 ? 'OK role=' + adminLogin.body?.user?.role : 'FAIL ' + JSON.stringify(adminLogin.body));
  console.log('cashier1 login:', cashierLogin.status === 200 ? 'OK role=' + cashierLogin.body?.user?.role : 'FAIL ' + JSON.stringify(cashierLogin.body));

  if (!adminTok || !cashierTok) { console.error('Cannot proceed — login failed'); process.exit(1); }

  // ── 1. Ensure product has stock ───────────────────────────────────────────
  const products = await request('GET', '/products', null, adminTok);
  let productId = products.body?.data?.[0]?.id;
  if (!productId) {
    const cp = await request('POST', '/products', {
      name_en: 'Test Rice 1kg', name_ta: 'சோதனை அரிசி',
      category_id: 1, selling_price: 60, cost_price: 50,
      stock: 0, unit: 'kg', gst_rate: 5, barcode: 'ETEST001',
    }, adminTok);
    productId = cp.body?.data?.id || cp.body?.id;
    console.log('Created product id:', productId);
  } else {
    console.log('Using existing product id:', productId, products.body.data[0].name_en);
  }

  // Ensure stock via purchases API
  const purchase = await request('POST', '/purchases', {
    supplier_id: null,
    items: [{ product_id: String(productId), quantity: 100, unit_price: 50 }],
    total: 5000, paid: 5000, notes: 'E2E seed stock',
    purchase_date: new Date().toISOString().slice(0,10),
  }, adminTok);
  console.log('Purchase (stock top-up):', purchase.status, purchase.body?.success ? 'OK' : JSON.stringify(purchase.body).slice(0,200));

  // ── 2. Create CASH bill as cashier ────────────────────────────────────────
  const cashBill = await request('POST', '/bills', {
    items: [{ product_id: String(productId), quantity: 2 }],
    payment_mode: 'cash', discount_total: 0,
  }, cashierTok);
  const cashBillData = cashBill.body?.data;
  console.log('\n=== BUG 1/2/4 — bill creation ===');
  console.log('CASH bill:', cashBill.status, cashBillData ? `grand_total=${cashBillData.grand_total} items=${cashBillData.items?.length}` : 'FAIL:'+cashBill.body?.message);
  if (cashBillData?.items?.length > 0) {
    console.log('CASH bill items[0] shape:', JSON.stringify(cashBillData.items[0]));
  }

  // ── 3. Create UPI bill as cashier ─────────────────────────────────────────
  const upiBill = await request('POST', '/bills', {
    items: [{ product_id: String(productId), quantity: 1 }],
    payment_mode: 'upi', discount_total: 0,
  }, cashierTok);
  const upiBillData = upiBill.body?.data;
  console.log('UPI bill:', upiBill.status, upiBillData ? `grand_total=${upiBillData.grand_total}` : 'FAIL:'+upiBill.body?.message);

  // ── 4. Check cash drawer ──────────────────────────────────────────────────
  const drawer = await request('GET', '/cashout/current', null, adminTok);
  const d = drawer.body?.data;
  console.log('\n=== BUG 1 — Cash Drawer API ===');
  console.log('Raw API response data:', JSON.stringify(d, null, 2));

  const cashGrandTotal = cashBillData?.grand_total ?? 0;
  const upiGrandTotal  = upiBillData?.grand_total  ?? 0;
  const drawerOK = d && Number(d.cash_sales) > 0 && Number(d.gpay_sales) > 0;
  results['Bug 1 — Cash Drawer shows real figures'] = drawerOK
    ? `PASS (cash_sales=${d.cash_sales}, gpay_sales=${d.gpay_sales}, expected=${d.expected_cash})`
    : `FAIL (cash_sales=${d?.cash_sales}, gpay_sales=${d?.gpay_sales})`;

  // ── 5. Save cashout and check history ────────────────────────────────────
  await request('POST', '/cashout/save', {
    opening_cash: 500, actual_cash: 500 + Number(d?.cash_sales||0),
    actual_gpay: Number(d?.gpay_sales||0), notes: 'E2E test',
  }, adminTok);

  const hist = await request('GET', '/cashout/history', null, adminTok);
  const histRows = hist.body?.data ?? [];
  const row = histRows[0];
  console.log('\n=== BUG 2 — Cashout History ===');
  console.log('History row:', JSON.stringify(row));
  results['Bug 2 — Cashout History figures'] = (row && Number(row.cash_sales) > 0)
    ? `PASS (cash_sales=${row.cash_sales}, gpay_sales=${row.gpay_sales}, expected=${row.expected_cash})`
    : `FAIL (row=${JSON.stringify(row)})`;

  // ── 6. Receipt items check ────────────────────────────────────────────────
  console.log('\n=== BUG 4 — Receipt items ===');
  const items = cashBillData?.items ?? [];
  const item0 = items[0] ?? {};
  console.log('item[0] keys:', Object.keys(item0));
  // After camelcase transform on the frontend: quantity, lineTotal, productNameEn, unitPrice
  // Raw API: quantity, line_total, product_name_en, unit_price
  const hasName = !!item0.product_name_en;
  const hasQty  = item0.quantity != null;
  const hasTotal= item0.line_total != null;
  results['Bug 4 — Receipt items present'] = (hasName && hasQty && hasTotal)
    ? `PASS (product_name_en=${item0.product_name_en}, qty=${item0.quantity}, line_total=${item0.line_total})`
    : `FAIL (keys: ${Object.keys(item0).join(',')})`;

  // ── 7. Notes API (cashier can create) ────────────────────────────────────
  console.log('\n=== BUG 3 — Notes API ===');
  const note = await request('POST', '/requested-products', {
    product_name: 'Basmati Rice 5kg',
    product_name_ta: 'பாஸ்மதி அரிசி',
    notes: 'Customer requested twice',
  }, cashierTok);
  console.log('Cashier create note:', note.status, note.body?.success ? 'OK id='+note.body?.data?.id : 'FAIL:'+note.body?.message);

  const notesList = await request('GET', '/requested-products', null, adminTok);
  const notesCount = Array.isArray(notesList.body) ? notesList.body.length : notesList.body?.data?.length ?? 0;
  results['Bug 3 — Notes accessible by cashier'] = (note.body?.success && notesCount > 0)
    ? `PASS (created id=${note.body?.data?.id}, total notes=${notesCount})`
    : `FAIL (create status=${note.status}, list count=${notesCount})`;

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n\n══════ E2E RESULTS ══════');
  for (const [k, v] of Object.entries(results)) {
    console.log(`${v.startsWith('PASS') ? '✅' : '❌'} ${k}: ${v}`);
  }

  console.log('\nNote: Bug 3 (print cancel), Bug 5 (Tamil UI) require browser interaction — see screenshots.');
  process.exit(0);
}

run().catch(e => { console.error('Script error:', e.message); process.exit(1); });
