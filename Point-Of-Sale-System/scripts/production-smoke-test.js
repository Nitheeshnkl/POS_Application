const http = require('http');

const API = process.env.API_URL || 'http://localhost:3005/api/v1';

async function testEndpoint(name, url, method = 'GET', data = null, headers = {}) {
  console.log(`Testing ${name} (${method} ${url})...`);
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: data ? JSON.stringify(data) : undefined
    });
    console.log(`[${response.status}] ${name}`);
    return { status: response.status, ok: response.ok };
  } catch (err) {
    console.log(`[ERROR] ${name}: ${err.message}`);
    return { status: 500, ok: false, error: err.message };
  }
}

async function run() {
  console.log('--- PRODUCTION SMOKE TEST ---');
  let hasFailures = false;

  // Extract base URL for health check
  const baseUrlMatch = API.match(/^(https?:\/\/[^\/]+)/);
  const baseUrl = baseUrlMatch ? baseUrlMatch[1] : 'http://localhost:3005';

  const health = await testEndpoint('Health Check', `${baseUrl}/health`);
  if (health.status === 500) hasFailures = true;

  const loginRes = await testEndpoint('Login', `${API}/auth/login`, 'POST', { username: 'admin', password: 'password' });
  if (loginRes.status === 500) hasFailures = true;

  const endpoints = [
    { name: 'Products', path: '/products' },
    { name: 'Billing', path: '/bills' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Reports', path: '/reports/sales' },
    { name: 'Cash Drawer', path: '/cashout/status' },
    { name: 'Export', path: '/export/inventory' },
    { name: 'Customers', path: '/customers' }
  ];

  for (const ep of endpoints) {
    const res = await testEndpoint(ep.name, `${API}${ep.path}`);
    if (res.status === 500) hasFailures = true;
  }

  if (hasFailures) {
    console.error('Smoke test completed with failures (500 errors).');
    process.exit(1);
  } else {
    console.log('Smoke test completed successfully. No 500 server crashes detected.');
    process.exit(0);
  }
}

run();
