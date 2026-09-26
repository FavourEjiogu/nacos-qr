const http = require('http');

async function testCreate() {
  const loginRes = await fetch('http://localhost:3000/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'nacos-mello-2026-##$$R%R%U^12x4' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  
  const memoRes = await fetch('http://localhost:3000/api/admin/memos', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': setCookie
    },
    body: JSON.stringify({
      title: "Test Error Memo frontend",
      body: "This should throw an error in the backend.",
      issuer: "Admin",
      department: "Test Dept",
      issuedAt: "2026-09-26",
      effectiveFrom: "2026-09-26",
      expiresAt: null
    })
  });
  
  console.log('Create Status:', memoRes.status);
  const text = await memoRes.text();
  console.log('Create Response:', text);
}

testCreate().catch(console.error);
