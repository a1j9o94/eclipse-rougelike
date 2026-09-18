import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.SECOND_DAWN_PLAYWRIGHT_PATH || 'playwright',
);
const output = 'coding_agents/second_dawn_screenshots';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let enlargedText = null;
const url =
  process.env.SECOND_DAWN_PREVIEW_URL ||
  'http://127.0.0.1:5173/#second-dawn-design-archive';
for (const [width, height] of [
  [1366, 768],
  [1440, 900],
  [1920, 1080],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.goto(url);
  await page.getByText(/Visual prototype/).waitFor();
  for (const screen of [
    'opening',
    'midgame',
    'late',
    'research',
    'blueprints',
    'combat',
    'scoring',
  ]) {
    if (screen === 'opening')
      await page.getByRole('button', { name: 'Opening', exact: true }).click();
    else if (screen === 'midgame')
      await page.getByRole('button', { name: 'Midgame', exact: true }).click();
    else if (screen === 'late')
      await page
        .getByRole('button', { name: 'Late game', exact: true })
        .click();
    else
      await page
        .getByRole('button', {
          name:
            screen === 'blueprints'
              ? 'Blueprints'
              : screen[0].toUpperCase() + screen.slice(1),
          exact: true,
        })
        .first()
        .click();
    await page.screenshot({
      path: `${output}/${width}x${height}-${screen}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    results.push({
      width,
      height,
      screen,
      ...(await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        verticalOverflow: document.documentElement.scrollHeight > innerHeight,
      }))),
    });
  }
  if (width === 1366) {
    await page.getByRole('button', { name: 'Galaxy', exact: true }).click();
    await page.addStyleTag({
      content:
        '.sd-app { font-size: 18px } .sd-app p,.sd-app small,.sd-app button,.sd-app dt,.sd-app dd { font-size: 16px !important }',
    });
    await page.getByRole('region', { name: 'Civilization roster' }).focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(200);
    enlargedText = await page
      .getByRole('region', { name: 'Civilization roster' })
      .evaluate((el) => ({
        rosterKeyboardScrollTop: el.scrollTop,
        rosterScrollHeight: el.scrollHeight,
        rosterClientHeight: el.clientHeight,
      }));
    await page.getByRole('button', { name: /Inspect sector 101/ }).focus();
    await page.screenshot({
      path: `${output}/${width}x${height}-enlarged-text-keyboard.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url);
const tasks = [];
async function task(name, action, limitation) {
  const start = Date.now();
  await action();
  tasks.push({
    name,
    automationTimeMs: Date.now() - start,
    outcome: 'prototype interaction completed',
    limitation,
    humanSearchTime: null,
    humanWrongTurns: null,
    humanAssistance: null,
  });
}
await task(
  'Find exploration frontier',
  async () => {
    await page
      .getByRole('button', { name: 'Preview highlighted exploration frontier' })
      .click();
    if (
      !(await page.getByRole('status').innerText()).includes(
        'frontier selected',
      )
    )
      throw Error('Frontier selection failed');
  },
  'Frontier is illustrative; no verified legal target is calculated.',
);
await task(
  'Inspect movement constraints',
  async () => {
    await page
      .getByRole('button', { name: /Inspect sector/ })
      .first()
      .press('Enter');
    await page.getByRole('heading', { name: 'Movement preview' }).waitFor();
  },
  'Inspector explains general constraints; no fleet-specific legality is computed.',
);
await task(
  'Find projected upkeep',
  async () => {
    await page.getByText('Projected upkeep', { exact: true }).waitFor();
  },
  'Values are fixtures; no actionable shortfall simulation.',
);
await task(
  'Compare enemy blueprint and confirm draft',
  async () => {
    await page.getByRole('button', { name: 'Blueprints', exact: true }).click();
    await page.getByRole('heading', { name: 'Enemy comparison' }).waitFor();
    await page.getByRole('button', { name: 'Select Plasma cannon' }).click();
    await page
      .getByRole('button', { name: 'Confirm prototype upgrade' })
      .click();
    if (
      !(await page.getByRole('status').innerText()).includes(
        'blueprint updated',
      )
    )
      throw Error('Upgrade confirmation failed');
  },
  'Prototype draft only; no actual legality validation or match command.',
);
await task(
  'Allocate hits and choose retreat',
  async () => {
    await page.getByRole('button', { name: 'Combat', exact: true }).click();
    await page
      .getByRole('button', { name: 'Assign hit to enemy cruiser' })
      .click({ clickCount: 2 });
    await page.getByRole('button', { name: 'Confirm hit allocation' }).click();
    await page.getByText('Review retreat', { exact: true }).click();
    await page
      .getByRole('button', { name: 'Choose prototype retreat to sector 116' })
      .click();
  },
  'Two separate visual interactions; no combat rules or outcome is simulated.',
);
await task(
  'Find scoring breakdown',
  async () => {
    await page.getByRole('button', { name: 'Scoring', exact: true }).click();
    if ((await page.locator('tbody tr').count()) !== 6)
      throw Error('Six player score rows missing');
  },
  'Illustrative category table; no real final scoring calculation.',
);
await writeFile(
  `${output}/review-results.json`,
  JSON.stringify(
    {
      reviewType:
        'Agent browser inspection, not a human playtest or approved visual baseline',
      results,
      enlargedText,
      tasks,
    },
    null,
    2,
  ),
);
await browser.close();
if (
  results.some((result) => result.horizontalOverflow || result.verticalOverflow)
) {
  throw new Error(
    'A desktop fixture overflows the viewport. Inspect the saved screenshots and review results.',
  );
}
console.log(
  `Captured ${results.length + 1} screenshots and ${tasks.length} automated walkthroughs in ${output}`,
);
