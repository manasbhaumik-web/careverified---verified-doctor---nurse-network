const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Manas\\.gemini\\antigravity\\brain\\6ef0203d-b293-4b43-a5a6-e8bbc2d6fb49';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBrowserTest() {
  console.log('1. Authenticating admin session...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@careverified.local', password: 'DemoPass123' })
  });
  const setCookieHeader = loginRes.headers.get('set-cookie');
  let sessionVal = '';
  if (setCookieHeader) {
    const match = setCookieHeader.match(/cv_session=([^;]+)/);
    if (match) sessionVal = match[1];
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    if (sessionVal) {
      await page.setCookie({
        name: 'cv_session',
        value: sessionVal,
        domain: 'localhost',
        path: '/',
        httpOnly: true
      });
    }

    // Set initial role as super_admin
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('cv_admin_subrole', 'super_admin');
    });

    console.log('2. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // 1. Capture Admin Dashboard Overview (Registry & Licensing)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'admin_registry' }));
    });
    await delay(1200);

    const snap1 = path.join(ARTIFACT_DIR, 'admin_dashboard_registry.png');
    await page.screenshot({ path: snap1 });
    console.log('✓ Captured 1: admin_dashboard_registry.png');

    // 2. Open Hospital HR Webhooks modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const whBtn = btns.find(b => b.textContent && b.textContent.includes('Hospital HR Webhooks'));
      if (whBtn) whBtn.click();
    });
    await delay(1000);

    const snap2 = path.join(ARTIFACT_DIR, 'admin_hospital_webhooks_modal.png');
    await page.screenshot({ path: snap2 });
    console.log('✓ Captured 2: admin_hospital_webhooks_modal.png');

    // 3. Test Webhook Ping on Hospital Endpoint
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const testPingBtn = btns.find(b => b.textContent && b.textContent.includes('Test Ping'));
      if (testPingBtn) testPingBtn.click();
    });
    await delay(2000);

    const snap3 = path.join(ARTIFACT_DIR, 'admin_webhook_ping_result.png');
    await page.screenshot({ path: snap3 });
    console.log('✓ Captured 3: admin_webhook_ping_result.png');

    // Close Webhook modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const closeBtn = btns.find(b => b.textContent && b.textContent.includes('Close Monitor'));
      if (closeBtn) closeBtn.click();
    });
    await delay(1000);

    // 4. Open RBAC Persona Switcher Modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const roleBtn = btns.find(b => b.textContent && (b.textContent.includes('Switch Persona') || b.textContent.includes('Role:')));
      if (roleBtn) roleBtn.click();
    });
    await delay(1000);

    const snap4 = path.join(ARTIFACT_DIR, 'admin_rbac_persona_modal.png');
    await page.screenshot({ path: snap4 });
    console.log('✓ Captured 4: admin_rbac_persona_modal.png');

    // Close the RBAC modal first
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const closeBtn = btns.find(b => b.textContent && b.textContent.includes('Close Switcher'));
      if (closeBtn) closeBtn.click();
    });
    await delay(800);

    // 5. Switch to Council Medical Registrar & Navigate to restricted Operations Workspace
    console.log('Testing Statutory Segregation of Duties Guard screen...');
    await page.evaluate(() => {
      localStorage.setItem('cv_admin_subrole', 'registrar');
      window.dispatchEvent(new CustomEvent('medcred-admin-subrole-changed', { detail: { role: 'registrar' } }));
      window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'admin_ops' }));
    });
    await delay(1500);

    const snap5 = path.join(ARTIFACT_DIR, 'admin_rbac_guard_screen.png');
    await page.screenshot({ path: snap5 });
    console.log('✓ Captured 5: admin_rbac_guard_screen.png');

    // 6. Switch to Super-Admin and view Package Manager in Operations
    console.log('Testing Package Manager in Operations workspace...');
    await page.evaluate(() => {
      localStorage.setItem('cv_admin_subrole', 'super_admin');
      window.dispatchEvent(new CustomEvent('medcred-admin-subrole-changed', { detail: { role: 'super_admin' } }));
      window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'admin_ops' }));
    });
    await delay(1500);

    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'));
      const pkgTab = tabBtns.find(b => b.textContent && b.textContent.includes('Package Manager'));
      if (pkgTab) pkgTab.click();
    });
    await delay(1500);

    const snap6 = path.join(ARTIFACT_DIR, 'admin_ops_package_manager.png');
    await page.screenshot({ path: snap6 });
    console.log('✓ Captured 6: admin_ops_package_manager.png');

    console.log('SUCCESS: All 6 high-resolution UI screenshots captured!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
