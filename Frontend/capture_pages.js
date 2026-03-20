import { chromium } from 'playwright';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

async function capture(url, name, page) {
  console.log('NAVIGATING', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    console.log('PAGE_TITLE', name, await page.title());
    await page.screenshot({ path: `${name}.png`, fullPage: true });
    console.log('SCREENSHOT_SAVED', `${name}.png`);
  } catch (e) {
    console.log('NAV_ERROR', name, e.message);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE_CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR', err.message));
  page.on('request', req => { if (req.url().includes(API_BASE_URL)) console.log('REQ', req.method(), req.url()); });
  page.on('response', resp => { if (resp.url().includes(API_BASE_URL)) console.log('RESP', resp.status(), resp.url()); });

  await capture(`${FRONTEND_BASE_URL}/dashboard/attendance/latecomers-analysis`, 'latecomers', page);
  await capture(`${FRONTEND_BASE_URL}/dashboard/attendance/no-pay-leave-percentage`, 'no_pay', page);

  await browser.close();
  process.exit(0);
})();
