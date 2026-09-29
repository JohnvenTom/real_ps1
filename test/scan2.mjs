import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8137/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
await p.goto(`${base}?scene=window&t=5&fx=nolight`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

const scan = async label => {
  const line = await p.evaluate(() => {
    const out = [];
    for (let x = 180; x <= 280; x += 4) out.push([x, window.__regionAvg(x, 104, x + 2, 128)]);
    return out;
  });
  console.log(label);
  console.log('  ' + line.map(([x, c]) => `${x}:${Math.round((c[0] + c[1] + c[2]) / 3)}`).join(' '));
};

await scan('BEFORE:');

const cupInfo = await p.evaluate(() => {
  const THREE = window.__scene; // walk raw
  let cup = null;
  window.__scene.traverse(o => {
    if (o.isGroup && o.children.length === 2 && o.position.z < -2 && o.position.z > -3 && o.position.y > 2.5) cup = o;
  });
  if (!cup) return 'not found';
  const before = cup.position.clone();
  cup.position.set(0, 4.2, 0.5);   // dead center, closer to camera
  window.__render();
  return { before: before.toArray().map(v => +v.toFixed(2)), after: cup.position.toArray() };
});
console.log('cup:', JSON.stringify(cupInfo));
await scan('AFTER (cup moved to center):');

// also probe its new dead-center spot precisely
const c = await p.evaluate(() => window.__regionAvg(150, 100, 175, 140));
console.log('center region rgb:', c.join(','));
await b.close();
