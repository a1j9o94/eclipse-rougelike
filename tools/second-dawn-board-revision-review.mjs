import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = 'coding_agents/second_dawn_board_revision';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const checks = [];
for (const [width, height] of [[1366, 768], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto('http://127.0.0.1:5175/#second-dawn-review');
  for (const position of ['opening', 'opening-three', 'late']) {
    await page.getByLabel('Review position').selectOption(position);
    await page.screenshot({ path: `${directory}/${width}x${height}-${position}.png`, animations: 'disabled' });
    checks.push({ width, height, position, ...await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth > innerWidth, tiles: document.querySelectorAll('.dg-tile').length })) });
  }
  await page.close();
}
await writeFile(`${directory}/screens.json`, JSON.stringify(checks, null, 2));
await browser.close();
console.log('Captured six board revision review images; established baselines are untouched.');
