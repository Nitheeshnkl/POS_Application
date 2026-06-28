import fs from 'fs';

const API = 'http://localhost:3001/api/v1';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status} on ${options.method || 'GET'} ${url}: ${err}`);
  }
  return res.json();
}

async function run() {
  try {
    let res = await fetchJSON('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });
    const headers = { 'Authorization': `Bearer ${res.accessToken}` };
    
    // Try to create supplier
    let supplier = await fetchJSON('/suppliers', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Test Supplier', phone: '', email: '', gstin: '', address: '', notes: '' })
    });
    console.log('Supplier created successfully', supplier);
  } catch(e) {
    console.error(e.message);
  }
}
run();
