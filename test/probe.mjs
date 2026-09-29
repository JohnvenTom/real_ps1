import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8137/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
p.on('pageerror', e => console.log('[pageerror]', e.message));

async function probe(url, regions) {
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const ready = await p.evaluate(() => window.__ready === true);
  const out = [];
  for (const [name, x0, y0, x1, y1] of regions) {
    const avg = await p.evaluate(([x0, y0, x1, y1]) => window.__regionAvg(x0, y0, x1, y1), [x0, y0, x1, y1]);
    const lum = Math.round((avg[0] + avg[1] + avg[2]) / 3);
    out.push(name + ': rgb(' + avg.join(',') + ') lum=' + lum);
  }
  console.log(url.replace(base, ''), 'ready=' + ready);
  out.forEach(o => console.log('  ', o));
}

// ORBIT: ship should sit upper-right ~ (200..300, 40..120); planet lower third; sky left
await probe(`${base}?scene=orbit&t=6`, [
  ['ship-region', 200, 40, 300, 120],
  ['planet-body', 100, 170, 220, 230],
  ['sky-left', 10, 30, 80, 100],
]);
await probe(`${base}?scene=orbit&t=6&fx=nolight`, [
  ['ship-region', 200, 40, 300, 120],
  ['planet-body', 100, 170, 220, 230],
]);
// WINDOW: cup found at rt ~(226..250, 105..125); background next to it
await probe(`${base}?scene=window&t=5`, [
  ['cup-exact', 222, 104, 252, 126],
  ['bg-next-cup', 180, 104, 210, 126],
  ['floor-bottom', 100, 210, 220, 235],
  ['window-center', 140, 90, 180, 130],
]);
await probe(`${base}?scene=window&t=5&fx=nolight`, [
  ['cup-exact', 222, 104, 252, 126],
  ['bg-next-cup', 180, 104, 210, 126],
  ['floor-bottom', 100, 210, 220, 235],
]);
await b.close();
