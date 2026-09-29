import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8137/';
const prefix = process.argv[3] || '';
const scenes = process.argv[2] ? process.argv[2].split(',') : ['orbit', 'rings', 'belt', 'warp', 'window'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
p.on('pageerror', e => errs.push(`[pageerror] ${e.message}\n${e.stack?.split('\n')[1] || ''}`));

for (const s of scenes) {
  errs.length = 0;
  await p.goto(`${base}?scene=${s}&t=4`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const ready = await p.evaluate(() => window.__ready === true);
  await p.screenshot({ path: `shots/${prefix}${s}.png` });
  console.log(`\n=== ${s} ready=${ready} errors=${errs.length}`);
  for (const e of errs.slice(0, 6)) console.log(e);
}
await b.close();
