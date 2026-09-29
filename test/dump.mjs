import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8137/';
const which = process.argv[2] || 'orbit';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`${base}?scene=${which}&t=6`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const rows = await p.evaluate(() => window.__dump());
console.log('scene', which, 'objects:', rows.length);
for (const r of rows) {
  console.log(
    r.type.padEnd(14),
    'dist', String(r.dist).padStart(4),
    'rt', String(r.rt[0]).padStart(3) + ',' + String(r.rt[1]).padStart(3),
    r.inFront ? 'front' : 'BEHIND',
    'pos', r.pos.join(',')
  );
}
await b.close();
