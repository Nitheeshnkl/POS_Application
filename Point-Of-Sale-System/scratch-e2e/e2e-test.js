const axios = require('axios');
const puppeteer = require('puppeteer');

const API_URL = 'http://localhost:5000/api/v1';
const FRONTEND_URL = 'http://localhost:5173';

async function seedData() {
  console.log('--- SEEDING DATA ---');
  const loginRes = await axios.post(`${API_URL}/auth/login`, { username: 'admin', password: 'Admin@123' });
  const token = loginRes.data.accessToken;
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const suppliers = [];
  for (let i=1; i<=10; i++) {
    const res = await axios.post(`${API_URL}/suppliers`, {
      name: `Supplier ${i}`, phone: `98765432${i.toString().padStart(2, '0')}`
    }, auth);
    suppliers.push(res.data);
  }
  console.log('10 Suppliers created');

  const products = [];
  for (let i=1; i<=30; i++) {
    const res = await axios.post(`${API_URL}/products`, {
      name_en: `E2E Product ${i}`, name_ta: `பொருள் ${i}`, category_id: 1,
      unit_type: 'pcs', purchase_price: 50, selling_price: 100, initial_stock: 100
    }, auth);
    products.push(res.data);
  }
  console.log('30 Products created');

  for (let i=1; i<=20; i++) {
    await axios.post(`${API_URL}/bills`, {
      customer_name: `Cust ${i}`, payment_mode: 'cash',
      items: [{ product_id: products[i%30].id, quantity: 2 }]
    }, auth);
  }
  console.log('20 Bills created');

  for (let i=1; i<=10; i++) {
    await axios.post(`${API_URL}/purchases`, {
      supplier_id: suppliers[i%10].id, payment_mode: 'cash',
      items: [{ product_id: products[i%30].id, quantity: 50, unit_price: 50 }]
    }, auth);
  }
  console.log('10 Purchases created');

  for (let i=1; i<=5; i++) {
    await axios.post(`${API_URL}/expenses`, {
      category: 'Other', amount: 500, description: `Exp ${i}`, date: new Date().toISOString().split('T')[0]
    }, auth);
  }
  console.log('5 Expenses created');
}

async function testUI() {
  console.log('\n--- TESTING UI & VIEWPORTS ---');
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  const viewports = [320, 375, 768, 1024, 1440];
  
  await page.goto(`${FRONTEND_URL}/login`);
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.type('input[type="text"]', 'admin');
  await page.type('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  console.log('Owner login successful');
  
  const ownerPages = ['/owner', '/owner/reports', '/owner/export-center'];
  for (const url of ownerPages) {
    await page.goto(`${FRONTEND_URL}${url}`);
    for (const width of viewports) {
      await page.setViewport({ width, height: 800 });
      await new Promise(r => setTimeout(r, 500));
      console.log(`Visited ${url} at ${width}px`);
    }
  }

  await page.evaluate(() => localStorage.clear());
  await page.goto(`${FRONTEND_URL}/login`);
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.type('input[type="text"]', 'cashier1');
  await page.type('input[type="password"]', 'Cashier@123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  console.log('Cashier login successful');

  const cashierPages = ['/cashier/billing', '/cashier/stock-view'];
  for (const url of cashierPages) {
    await page.goto(`${FRONTEND_URL}${url}`);
    for (const width of viewports) {
      await page.setViewport({ width, height: 800 });
      await new Promise(r => setTimeout(r, 500));
      console.log(`Visited ${url} at ${width}px`);
    }
  }

  await browser.close();

  if (errors.length > 0) {
    console.error('UI Errors encountered:', errors);
    process.exit(1);
  } else {
    console.log('All UI tests passed with no console errors!');
  }
}

async function runAll() {
  try {
    await seedData();
    await testUI();
  } catch (err) {
    console.error('E2E Test Failed:', err.message);
    process.exit(1);
  }
}

runAll();
