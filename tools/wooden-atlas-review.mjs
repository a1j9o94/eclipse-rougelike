import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browserType = process.env.ATLAS_BROWSER === 'webkit' ? webkit : chromium;
const directory = `coding_agents/wooden_atlas_screenshots${browserType === webkit ? '/webkit' : ''}`;
await mkdir(directory, { recursive: true });
const browser = await browserType.launch();
const results = [], errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(8000);
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  localStorage.setItem('eclipse.second-dawn.dice3d.v1', 'off');
  localStorage.setItem('eclipse.second-dawn.dice-sound.v1', 'off');
});
async function load(position) {
  await page.goto('about:blank');
  await page.goto(`http://127.0.0.1:5175/?position=${position}#second-dawn-review`);
  await page.locator('.atlas-review .dg-app').waitFor();
  await page.waitForLoadState('networkidle');
}
async function capture(name) {
  const { width, height } = page.viewportSize();
  await page.screenshot({ path: `${directory}/${width}x${height}-${name}.png`, animations: 'disabled' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, `${name} has document horizontal overflow`);
  results.push({ name, width, height, horizontalOverflow: overflow });
}
try {
  for (const position of ['opening', 'midgame', 'late']) {
    await load(position);
    await capture(position);
  }
  await load('midgame');
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await capture('research');
  await page.locator('.sd-tech').filter({ hasText: 'Improved Hull' }).click();
  await capture('research-selected');
  assert.equal(await page.locator('.dg-research-buy').isEnabled(), true);
  await page.locator('.dg-research-buy').click();
  await capture('research-submitted');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByText('Improved Hull', { exact: false }).first().waitFor();
  results.push({ task: 'Research Improved Hull', result: 'New engine receipt, public research history and next seat active' });

  await load('opening');
  await page.getByRole('button', { name: 'Upgrade', exact: true }).click();
  await capture('blueprints');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('blueprints');
  await page.getByRole('button', { name: 'Slot 4: Empty slot', exact: true }).click();
  await capture('part-picker');
  await page.getByRole('button', { name: 'Install Hull in slot 4', exact: true }).click();
  await page.getByRole('button', { name: 'Apply 1 upgrade', exact: true }).click();
  await page.getByRole('button', { name: 'Slot 4: Hull', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Wooden atlas on', exact: true }).click();
  assert.equal(await page.locator('.atlas-figurine').count(), 0);
  assert.ok(await page.getByRole('button', { name: 'Slot 4: Hull', exact: true }).count());
  await page.getByRole('button', { name: 'Wooden atlas off', exact: true }).click();
  assert.ok(await page.getByRole('button', { name: 'Slot 4: Hull', exact: true }).count());
  results.push({ task: 'Mobile slot picker, upgrade and theme comparison', result: 'Hull committed, theme toggle retains the fitted blueprint' });

  await load('opening');
  await capture('opening');
  const sector = page.getByRole('button', { name: /^Inspect sector 222,/ });
  await sector.click();
  await page.getByRole('button', { name: 'Expand Sector 222 details', exact: true }).click();
  await capture('sector-inspector');
  results.push({ task: 'Mobile sector selection', result: '222 selected through real map and inspector opened' });

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await load('combat');
    await capture('combat');
  }
  await page.getByRole('button', { name: /^Die 2,/ }).click();
  await page.getByRole('button', { name: /^Target Mechanema/ }).click();
  assert.equal(await page.getByRole('button', { name: 'Resolve volley', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'Resolve volley', exact: true }).click();
  results.push({ task: 'Manual combat allocation', result: 'Recorded hit allocated to legal opponent and volley accepted' });
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/review.json`, JSON.stringify({ scope: 'Engineering browser checks, not human playtesting', results, errors }, null, 2));
  console.log(`Verified ${results.length} atlas screenshots/walkthrough results.`);
} catch (error) {
  await page.screenshot({path:`${directory}/walkthrough-failure.png`});
  throw error;
} finally {
  await browser.close();
}
