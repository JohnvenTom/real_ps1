import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8137/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
await p.goto(`${base}?scene=window&t=5&fx=nolight`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

const res = await p.evaluate(() => {
  let cup = null;
  window.__scene.traverse(o => {
    if (o.isGroup && o.children.length === 2 && o.position.z < -2 && o.position.z > -3 && o.position.y > 2.5) cup = o;
  });
  if (!cup) return { err: 'cup not found' };
  cup.position.set(0, 3.2, 2.0);           // dead ahead, 3.6 units from camera, center height
  for (const child of cup.children) {
    child.material.uniforms.uTint.value.setRGB(5, 0.1, 0.1);  // screaming red
    child.material.uniforms.uOpacity.value = 1;
    child.material.uniforms.uAlphaTest.value = 0;
    child.material.uniforms.uUVScale.value.set(1, 1);
  }
  window.__camera.position.set(0, 2.8, 5.6);
  window.__camera.lookAt(0, 2.8, 0);
  window.__camera.updateProjectionMatrix?.();
  window.__render();
  // sample a wide center grid
  const grid = [];
  for (let y = 60; y < 200; y += 20) {
    const row = [];
    for (let x = 100; x < 220; x += 20) {
      const c = window.__regionAvg(x, y, x + 20, y + 20);
      row.push(Math.round((c[0] + c[1] + c[2]) / 3) + (c[0] > c[2] * 2 ? 'R' : ''));
    }
    grid.push(row.join('\t'));
  }
  return { grid: grid.join('\n') };
});
console.log(JSON.stringify(res, null, 1));
await b.close();
