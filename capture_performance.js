import { chromium } from 'playwright';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE_CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR', err.message));
  page.on('request', req => {
    const url = req.url();
    if (url.includes(API_BASE_URL)) console.log('REQ', req.method(), url);
  });
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes(API_BASE_URL)) console.log('RESP', resp.status(), url);
  });

  const target = `${FRONTEND_BASE_URL}/dashboard/performance`;
  console.log('NAVIGATING', target);
  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('PAGE_TITLE', await page.title());
    await page.screenshot({ path: 'performance_page.png', fullPage: true });
    console.log('SCREENSHOT_SAVED');
  } catch (e) {
    console.log('NAV_ERROR', e.message);
  }

  await browser.close();
  process.exit(0);
})();
