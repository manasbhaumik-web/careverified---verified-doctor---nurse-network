const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Manas\\.gemini\\antigravity\\brain\\6ef0203d-b293-4b43-a5a6-e8bbc2d6fb49';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@careverified.local', password: 'DemoPass123' })
  });
  const setCookieHeader = loginRes.headers.get('set-cookie');
  const sessionVal = setCookieHeader ? setCookieHeader.match(/cv_session=([^;]+)/)[1] : '';

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.setCookie({
    name: 'cv_session',
    value: sessionVal,
    domain: 'localhost',
    path: '/',
    httpOnly: true
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await delay(1500);

  // 1. Open Switch Persona modal
  console.log('1. Clicking Switch Persona button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Switch Persona'));
    if (btn) btn.click();
  });
  await delay(1000);

  // 2. Click button with id #btn-switch-role-registrar
  console.log('2. Clicking #btn-switch-role-registrar...');
  await page.waitForSelector('#btn-switch-role-registrar', { timeout: 5000 });
  await page.click('#btn-switch-role-registrar');
  await delay(1500);

  // 3. Navigate to Operations & Governance workspace
  console.log('3. Navigating to Operations & Governance tab...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'admin_ops' }));
  });
  await delay(1500);

  // 4. Capture screenshot of the Access Guard Screen
  const snap = path.join(ARTIFACT_DIR, 'admin_rbac_guard_screen.png');
  await page.screenshot({ path: snap });
  console.log('Saved clean guard screen screenshot to:', snap);

  await browser.close();
}

runTest();
