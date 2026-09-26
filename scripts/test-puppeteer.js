const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/admin/memos') && response.request().method() === 'POST') {
      console.log('Status:', response.status());
      try {
        const body = await response.text();
        console.log('Response Body:', body);
      } catch (e) {
        console.error('Error reading response body:', e);
      }
    }
  });

  await page.goto('http://localhost:3000/admin/admin_secret_local');
  await page.type('input[type="password"]', 'nacos-mello-2026-##$$R%R%U^12x4');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  await page.goto('http://localhost:3000/admin/admin_secret_local/create');
  
  await page.type('input[placeholder="e.g. Official Directive on Hackathon"]', 'Browser Test Memo');
  await page.type('textarea', 'This is a test from puppeteer.');
  await page.type('input[placeholder="e.g. Office of the President"]', 'Admin');
  await page.type('input[placeholder="e.g. NACOS Bingham University"]', 'Test Dept');
  
  // Wait for the form to be ready
  await page.waitForSelector('input[type="date"]');
  await page.$eval('input[type="date"]', el => el.value = '2026-09-26');
  
  await page.click('button[type="submit"]');
  
  // Wait for response
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})().catch(console.error);
