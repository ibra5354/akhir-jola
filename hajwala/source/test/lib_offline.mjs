import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const THREE_DIR = '/home/claude/deps/node_modules/three';
export async function launch() {
  return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
}
export async function openGame(browser, opt = {}) {
  const ctx = opt.ctx || await browser.newContext({ viewport: opt.viewport || { width: 1280, height: 720 }, deviceScaleFactor: 1, hasTouch: !!opt.touch, isMobile: !!opt.mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.route('https://cdn.jsdelivr.net/**', r => { r.abort(); return;
    const p = r.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.170.0', THREE_DIR);
    r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(p) });
  });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  const file = opt.file || '/home/claude/hajwala/build/hajwala.html';
  await page.route('https://hajwala.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(file) }));
  if (opt.init) for (const s of opt.init) await page.addInitScript(s);
  await page.goto('https://hajwala.test/index.html');
  await page.waitForFunction(() => window.__H && window.__H.ready, null, { timeout: 120000, polling: 200 });
  return { page, errors, ctx };
}
