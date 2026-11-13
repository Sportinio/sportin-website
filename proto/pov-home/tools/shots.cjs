const { chromium } = require(process.env.HOME + '/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const out = process.argv[2], url = process.argv[3], SHOT = JSON.parse(process.argv[4]), only = process.argv[5] || 'dm';
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [tag, vp, mob] of [['d', { width: 1440, height: 900 }, false], ['m', { width: 390, height: 844 }, true]]) {
    if (!only.includes(tag)) continue;
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob });
    const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('PAGEERR', tag, e.message));
    await pg.goto(url); await pg.waitForTimeout(4500);
    const go = v => pg.evaluate(v => { const s = document.getElementById('story'); scrollTo(0, s.getBoundingClientRect().top + scrollY + v * (s.offsetHeight - innerHeight)); }, v);
    let cur = 0;
    for (const v of SHOT) {
      while (cur < v - 1e-6) { cur = Math.min(v, cur + 0.004); await go(cur); await pg.waitForTimeout(45); }
      await pg.waitForTimeout(900);
      await pg.screenshot({ path: `${out}/${tag}-${String(Math.round(v * 1000)).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 70 });
    }
    await ctx.close();
  }
  await b.close();
})();
