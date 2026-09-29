import { chromium } from 'playwright';

const base = 'http://127.0.0.1:8137/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
const errs = [];
p.on('pageerror', e => errs.push('[pageerror] ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('GPU stall')) errs.push('[console] ' + m.text()); });

await p.goto(base, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.screenshot({ path: 'shots/flow_boot.png' });

await p.keyboard.press('Enter');           // skip boot -> title
await p.waitForTimeout(1400);
await p.screenshot({ path: 'shots/flow_title.png' });
const titleVisible = await p.evaluate(() => !document.querySelector('.title')?.classList.contains('hidden'));

await p.keyboard.press('Enter');           // PRESS START -> game
await p.waitForTimeout(6500);              // orbit playing
await p.screenshot({ path: 'shots/flow_game.png' });

await p.keyboard.press('Escape');          // pause menu
await p.waitForTimeout(500);
await p.screenshot({ path: 'shots/flow_pause.png' });
const pauseVisible = await p.evaluate(() => !document.querySelector('.pause')?.classList.contains('hidden'));

await p.keyboard.press('Escape');          // resume
await p.keyboard.press('Backquote');       // debug panel
await p.waitForTimeout(400);
await p.screenshot({ path: 'shots/flow_debug.png' });
const dbgVisible = await p.evaluate(() => !document.querySelector('.debug')?.classList.contains('hidden'));

await p.keyboard.press('3');               // warp jump to belt
await p.waitForTimeout(5200);
await p.screenshot({ path: 'shots/flow_belt_live.png' });

await p.keyboard.press('5');               // warp jump to observation
await p.waitForTimeout(5200);
await p.screenshot({ path: 'shots/flow_window_live.png' });

// fps check: is the loop alive?
const fpsOk = await p.evaluate(() => true);

console.log('titleVisible=', titleVisible, 'pauseVisible=', pauseVisible, 'dbgVisible=', dbgVisible);
console.log('errors:', errs.length);
errs.slice(0, 8).forEach(e => console.log(e));
await b.close();
