const http = require('http');

const data = JSON.stringify({
  title: "Test Memo",
  summary: "Test summary",
  body: "This is a test memo body.",
  issuer: "Test Issuer",
  department: "Test Department",
  issuedAt: new Date().toISOString(),
  effectiveFrom: new Date().toISOString()
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/memos',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'admin_session=test'
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
