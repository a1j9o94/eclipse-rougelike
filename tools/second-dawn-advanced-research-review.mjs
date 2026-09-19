import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const site = process.env.SECOND_DAWN_SITE_URL ?? 'http://127.0.0.1:5173';
const output = process.env.SECOND_DAWN_REVIEW_OUTPUT ?? 'coding_agents/second_dawn_advanced_planets_review';
const browser = await chromium.launch({ headless: true });
const results = [];
await mkdir(output, { recursive: true });
try {
  for (const [width, height] of [[1440, 900], [1366, 768], [1920, 1080], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${site}/?position=midgame#second-dawn-preview`);
    if (width < 700) await page.getByRole('button', { name: 'Choose action' }).click();
    await page.getByRole('button', width < 700 ? { name: /Research.*Technologies/ } : { name: 'Research', exact: true }).first().click();
    const card = page.getByRole('button', { name: /Advanced Labs ×/ });
    await card.scrollIntoViewIfNeeded();
    assert.equal(await card.locator('.dg-advanced-count').getAttribute('aria-label'), '2 eligible empty advanced planets for science');
    if (width === 1440) await page.screenshot({ path: `${output}/${width}x${height}-market.png` });
    await card.click();
    const detail = page.getByRole('region', { name: 'Research Advanced Labs' });
    assert.match(await detail.innerText(), /Up to 2 population with current supplies/);
    assert.match(await detail.innerText(), /3 colony ships · 9 science cubes available/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const count = await detail.locator('.dg-advanced-count').boundingBox();
    assert.ok(count && count.y > 0 && count.y + count.height < height, 'Planet count visible on selecting technology');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/${width}x${height}-advanced-labs.png` });
    results.push({ width, height, eligible: 2, capacity: 2, countVisible: true, horizontalOverflow: false, errors });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log('Advanced Labs market count, supply preview and visible detail passed at four viewports.');
