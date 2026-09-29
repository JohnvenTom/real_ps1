import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8137/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
await p.goto(`${base}?scene=window&t=5&fx=nolight`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const line = await p.evaluate(() => {
  const out = [];
  for (let x = 200; x <= 270; x += 2) out.push(window.__regionAvg(x, 114, x + 1, 116));
  return out;
});
console.log('scanline y=114..116, x=200..270 (nolight):');
console.log(line.map((c, i) => `${200 + i * 2}:${Math.round((c[0] + c[1] + c[2]) / 3)}`).join(' '));
await b.close();
