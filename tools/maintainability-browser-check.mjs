import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { prepareFixture } from './maintainability-fixture.mjs';
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const base = arg('--base-url') || process.env.BROWSER_BASE_URL;
assert(base, '--base-url is required');
const output = path.resolve(arg('--output') || 'coding_agents/verification/browser'),
  label = arg('--label') || 'candidate',
  baseline = arg('--baseline');
if (baseline)
  assert.notEqual(path.resolve(baseline), output, 'Baseline and candidate output must differ');
await mkdir(output, { recursive: true });
const route = await prepareFixture(arg('--root') || process.cwd());
export const anchors = [
  [320, 568],
  [360, 640],
  [390, 844],
  [412, 915],
  [568, 320],
  [844, 390],
  [915, 412],
  [600, 960],
  [768, 1024],
  [820, 1180],
  [1023, 768],
  [1024, 768],
  [1025, 768],
  [1180, 820],
  [1024, 600],
  [1280, 600],
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
];
const smoke = arg('--smoke') === 'true';
const engines = (arg('--engines') || 'chromium,firefox,webkit').split(',');
const scenarios = [
  ['opening', 'opening'],
  ['research', 'workflow-research', 'Research'],
  ['build', 'workflow-build', 'Build'],
  ['move', 'workflow-move', 'Move'],
  ['influence', 'workflow-influence', 'Influence'],
  ['upgrade', 'midgame', 'Upgrade'],
  ['settings', 'opening', 'settings'],
  ['inspection', 'opening', 'inspection'],
  ['exploration', 'exploration'],
  ['combat', 'ancient-combat'],
  ['upkeep', 'workflow-finish-upkeep'],
  ['scoring', 'scoring'],
];
const results = [],
  versions = {};
async function uncovered(locator, name) {
  const g = await locator.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
      right: r.right,
      bottom: r.bottom,
      vw: innerWidth,
      vh: innerHeight,
      hidden: getComputedStyle(e).visibility === 'hidden',
      covered: [
        [0.2, 0.2],
        [0.8, 0.2],
        [0.5, 0.5],
        [0.2, 0.8],
        [0.8, 0.8],
      ].some(
        ([x, y]) => !e.contains(document.elementFromPoint(r.x + r.width * x, r.y + r.height * y)),
      ),
    };
  });
  assert(g.w > 0 && g.h > 0 && !g.hidden, `${name} has no visible area`);
  assert(
    g.x >= -1 && g.y >= -1 && g.right <= g.vw + 1 && g.bottom <= g.vh + 1,
    `${name} outside viewport ${JSON.stringify(g)}`,
  );
  assert(!g.covered, `${name} covered or clipped ${JSON.stringify(g)}`);
  return g;
}
for (const engine of engines) {
  let browser;
  try {
    browser = await { chromium, firefox, webkit }[engine].launch({
      headless: true,
      ...(engine === 'chromium' && process.env.CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
        : {}),
    });
    versions[engine] = browser.version();
  } catch (error) {
    results.push({ engine, error: error.message });
    continue;
  }
  const sizes = smoke
    ? [
        [390, 844],
        [1440, 900],
      ]
    : engine === 'chromium'
      ? anchors
      : [
          [390, 844],
          [844, 390],
          [1024, 768],
          [1440, 900],
        ];
  for (const [width, height] of sizes)
    for (const [scenario, fixture, action] of scenarios) {
      const key = `${engine}-${width}x${height}-${scenario}`,
        context = await browser.newContext({
          viewport: { width, height },
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
        });
      await context.addInitScript(() => {
        for (const name of ['ambient', 'effects', 'dice-sound', 'dice3d', 'motion'])
          localStorage.setItem(`eclipse.second-dawn.${name}.v1`, 'off');
      });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.setDefaultTimeout(8000);
      const result = { key, engine, width, height, scenario, fixture };
      try {
        await page.goto(`${base.replace(/\/$/, '')}${route}?fixture=${fixture}`);
        await page.locator('.dg-app').waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          JSON.parse(await page.locator('#fixture-proof').textContent()).fixture,
          fixture,
        );
        const mobile = (await page.locator('.dg-mobile-header').count()) > 0;
        if (action === 'settings') {
          await page.getByText('•••', { exact: true }).click();
          await page.getByRole('button', { name: 'Preferences', exact: true }).click();
          await page.getByRole('dialog', { name: 'Preferences', exact: true }).waitFor();
        } else if (action === 'inspection') {
          await page
            .getByRole('navigation', { name: 'Turn order', exact: true })
            .getByRole('button')
            .nth(1)
            .click();
        } else if (action) {
          if (mobile)
            await page.getByRole('button', { name: 'Choose action', exact: true }).click();
          await page
            .getByRole('group', { name: 'Ordinary actions', exact: true })
            .getByRole('button', { name: new RegExp('^' + action + '(?: |$)') })
            .click();
        }
        // Stable frame: fonts and real board present; screenshots disable finite animations.
        await page.screenshot({ path: path.join(output, key + '.png'), animations: 'disabled' });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          'Horizontal document overflow',
        );
        assert.deepEqual(errors, [], 'Browser runtime errors');
        if (scenario === 'opening') {
          result.fit = await uncovered(
            page.getByRole('button', { name: 'Fit', exact: true }),
            'Fit',
          );
          await page.getByRole('button', { name: 'Fit', exact: true }).click();
          result.turnOrder = await uncovered(
            page.getByRole('navigation', { name: 'Turn order', exact: true }),
            'Turn order',
          );
        }
        if (action === 'settings') {
          const dialog = page.getByRole('dialog', { name: 'Preferences', exact: true }),
            close = page.getByRole('button', { name: 'Close settings', exact: true });
          result.close = await uncovered(close, 'Settings close');
          await close.focus();
          for (let i = 0; i < 24; i++) {
            await page.keyboard.press(i < 12 ? 'Tab' : 'Shift+Tab');
            assert(
              await dialog.evaluate((e) => e.contains(document.activeElement)),
              'Modal focus escaped',
            );
          }
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          await page.getByText('•••', { exact: true }).click();
          await page.getByRole('button', { name: 'Preferences', exact: true }).click();
          await close.click();
          await dialog.waitFor({ state: 'hidden' });
        }
        if (scenario === 'build') {
          await page.getByRole('button', { name: 'Add interceptor', exact: true }).click();
          await page
            .getByRole('button', { name: /^Inspect sector 222,.*legal deployment sector$/ })
            .click();
          await page
            .getByRole('button', { name: 'Build 1 ship · 3 materials', exact: true })
            .click();
          await page.getByText('1 piece deployed to your galaxy.', { exact: true }).waitFor();
          const proof = JSON.parse(await page.locator('#fixture-proof').textContent());
          assert.equal(proof.trace.length, 1);
          assert.equal(proof.trace[0].ok, true);
          assert.deepEqual(proof.trace[0].command, {
            type: 'build',
            builds: [{ component: 'interceptor', sectorId: '222' }],
          });
          assert.equal(
            proof.trace[0].state.seats.find((s) => s.id === proof.actor).resources.materials,
            1,
          );
          await page.screenshot({
            path: path.join(output, key + '-accepted.png'),
            animations: 'disabled',
          });
        }
        result.semantic = await page.evaluate(() => ({
          fixture: JSON.parse(document.querySelector('#fixture-proof').textContent),
          text: document.querySelector('.dg-app').innerText,
          controls: [...document.querySelectorAll('.dg-app button')]
            .filter((e) => e.getBoundingClientRect().width > 0)
            .map((e) => ({
              name: e.getAttribute('aria-label') || e.textContent,
              disabled: e.disabled,
            })),
          drafts: Object.fromEntries(
            Object.entries(localStorage).filter(([k]) => k.includes('draft')),
          ),
        }));
        result.pass = true;
      } catch (error) {
        result.error = error.message;
        result.browserErrors = errors;
        await page
          .screenshot({ path: path.join(output, key + '-failure.png'), animations: 'disabled' })
          .catch(() => {});
      }
      results.push(result);
      await context.close();
    }
  await browser.close();
}
const report = { label, versions, results };
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
if (baseline) {
  const expected = JSON.parse(await readFile(path.join(baseline, 'report.json'), 'utf8'));
  assert(
    expected.results.length > 0 && expected.results.every((r) => r.pass === true && !r.error),
    'Baseline is incomplete or failed',
  );
  assert.deepEqual(versions, expected.versions, 'Browser versions differ from baseline');
  assert.deepEqual(
    results.map((r) => r.key),
    expected.results.map((r) => r.key),
    'Scenario inventory differs',
  );
  for (const r of results) {
    const before = expected.results.find((b) => b.key === r.key);
    if (!r.error && !before.error)
      assert.deepEqual(
        r.semantic,
        before.semantic,
        `${r.key}: gameplay/interface semantic trace changed`,
      );
  }
  const { compareReviewedScreenshots } = await import('./second-dawn-check-visual.mjs');
  const differences = await compareReviewedScreenshots(
    path.resolve(baseline),
    output,
    results.flatMap((r) => [
      r.key + '.png',
      ...(r.scenario === 'build' ? [r.key + '-accepted.png'] : []),
    ]),
    { artifacts: path.join(output, 'diffs') },
  );
  report.differences = differences;
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  assert.equal(
    differences.length,
    0,
    `${differences.length} screenshots changed or missing; inspect differences before accepting`,
  );
}
const failures = results.filter((r) => r.error);
console.log(
  JSON.stringify(
    {
      label,
      cases: results.length,
      versions,
      failures: failures.map(({ key, engine, error }) => ({ key, engine, error })),
    },
    null,
    2,
  ),
);
assert.equal(failures.length, 0, `${failures.length} browser checks failed`);
