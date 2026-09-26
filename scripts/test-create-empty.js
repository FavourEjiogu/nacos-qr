const http = require('http');

async function testCreate() {
  const loginRes = await fetch('http://localhost:3000/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'nacos-mello-2026-##$$R%R%U^12x4' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  
  // This simulates the frontend if effectiveFrom and expiresAt are left completely blank
  const memoRes = await fetch('http://localhost:3000/api/admin/memos', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': setCookie
    },
    body: JSON.stringify({
      title: "Test Empty Dates",
      body: "Testing empty dates.",
      issuer: "Admin",
      department: "Test Dept",
      issuedAt: "2026-09-26",
      effectiveFrom: "2026-09-26", // this is what effectiveDate computes to if effectiveFrom is empty
      expiresAt: null
    })
  });
  
  console.log('Create Status:', memoRes.status);
  const text = await memoRes.text();
  console.log('Create Response:', text);
}

testCreate().catch(console.error);
