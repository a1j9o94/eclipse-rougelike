import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';

const site = process.env.SECOND_DAWN_SITE_URL;
if (!site) throw new Error('Set SECOND_DAWN_SITE_URL to the game site.');
const label = (process.env.SECOND_DAWN_EVIDENCE_LABEL ?? (new URL(site).hostname === '127.0.0.1' ? 'local' : 'live')).replace(/[^a-z0-9_-]/gi, '-');
const directory = `coding_agents/second_dawn_ai_presentation_browser/${label}`;
const client = new ConvexHttpClient(process.env.SECOND_DAWN_CONVEX_URL ?? 'https://ideal-nightingale-55.convex.cloud');
const fn = name => makeFunctionReference(name);
await mkdir(directory, {recursive: true});
const browser = await chromium.launch();
const captures = [];
async function capture(page, name, waitForVisiblePulse = false) {
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({width, height});
    if (waitForVisiblePulse) await page.waitForFunction(() => [...document.querySelectorAll('.dg-tile-activity')].some(sector => {
      const rect = sector.getBoundingClientRect(), galaxy = sector.closest('svg')?.getBoundingClientRect();
      return galaxy && rect.width > 0 && rect.left >= Math.max(0, galaxy.left) && rect.right <= Math.min(innerWidth, galaxy.right) && rect.top >= Math.max(0, galaxy.top) && rect.bottom <= Math.min(innerHeight, galaxy.bottom);
    }), undefined, {timeout: 20000});
    await page.screenshot({path: `${directory}/${width}x${height}-${name}.png`});
    captures.push({name, width, height, horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)});
  }
  await page.setViewportSize({width: 1440, height: 900});
}
async function observe(page) {
  await page.evaluate(() => {
    window.__aiObservations = [];
    window.__aiObservationTimer = window.setInterval(() => {
      const bar = document.querySelector('.dg-ai-activity');
      const sample = {
        at: performance.now(),
        actor: bar?.querySelector('[role=status] strong')?.textContent ?? '',
        summary: bar?.querySelector('.dg-ai-summary')?.textContent ?? '',
        pulseCount: document.querySelectorAll('.dg-tile-activity').length,
        moveCount: document.querySelectorAll('.dg-activity-move').length,
        motion: document.querySelector('[aria-label=Animations]')?.getAttribute('aria-pressed'),
        panelHeading: document.querySelector('.dg-ai-action-panel h2')?.textContent ?? '',
        panelVisual: ['dg-ai-tech-card', 'dg-ai-loadout', 'dg-ai-sector-context', 'dg-ai-component-cards'].find(className => document.querySelector(`.dg-ai-action-panel .${className}`)) ?? '',
      };
      const previous = window.__aiObservations.at(-1);
      if (!previous || ['actor', 'summary', 'pulseCount', 'moveCount', 'motion', 'panelHeading', 'panelVisual'].some(key => sample[key] !== previous[key])) window.__aiObservations.push(sample);
    }, 50);
  });
}
async function samples(page) {
  return page.evaluate(() => {clearInterval(window.__aiObservationTimer);return window.__aiObservations;});
}
async function yieldAction(page) {
  await page.locator('.sd-frontier').first().click();
  await page.getByRole('button', {name: 'Confirm action', exact: true}).click();
  await page.getByRole('button', {name: 'Discard sector', exact: true}).click();
  await page.getByRole('button', {name: 'End action', exact: true}).click();
}

try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site);
  await page.getByRole('button', {name: 'New game', exact: true}).click();
  await page.getByRole('button', {name: 'Start game', exact: true}).click();
  await page.getByRole('button', {name: 'Game room', exact: true}).waitFor();
  const identity = await page.evaluate(() => ({credential: localStorage.getItem('eclipse.second-dawn.guest.v1'), matchId: localStorage.getItem('eclipse.second-dawn.match.v1')}));
  assert.ok(identity.credential && identity.matchId);
  assert.equal(await page.getByRole('button', {name: 'Animations', exact: true}).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('button', {name: 'Follow AI', exact: true}).getAttribute('aria-pressed'), 'true');
  await observe(page);
  await yieldAction(page);
  await page.locator('.dg-ai-activity [role=status] strong').filter({hasText: 'AI turn'}).waitFor();
  await page.getByRole('button', {name: 'Watch AI', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('.dg-ai-summary b') !== null);
  const aiPanel = page.getByRole('region', {name: 'AI action details', exact: true});
  await aiPanel.waitFor();
  await page.waitForFunction(() => Boolean(document.querySelector('.dg-ai-action-panel .dg-ai-tech-card, .dg-ai-action-panel .dg-ai-loadout, .dg-ai-action-panel .dg-ai-sector-context, .dg-ai-action-panel .dg-ai-component-cards')));
  await capture(page, 'ai-turn', true);
  await page.getByRole('button', {name: 'Follow AI', exact: true}).click();
  assert.equal(await aiPanel.count(), 0, 'Follow AI off must restore the normal inspector.');
  await page.getByRole('button', {name: 'Follow AI', exact: true}).click();
  await aiPanel.waitFor();
  await page.locator('.dg-ai-activity [role=status] strong').filter({hasText: 'Your turn'}).waitFor({timeout: 45000});
  const firstSamples = await samples(page);
  assert.equal(await aiPanel.count(), 0, 'The automatic AI inspector must yield when control returns to the human.');
  await capture(page, 'human-turn');
  await page.getByRole('button', {name: 'Watch AI', exact: true}).click();
  await aiPanel.waitFor();
  assert.ok(!(await aiPanel.getByRole('heading', {level: 2}).innerText()).includes('Ended the action'), 'Watch AI must retain the last meaningful action instead of an end-action marker.');
  await page.locator('.sd-sector').first().click();
  assert.equal(await aiPanel.count(), 0, 'Manual sector inspection must dismiss the AI panel.');
  const history = await client.query(fn('eclipseMatches:getMatchHistory'), {...identity, limit: 100});
  const view = await client.query(fn('eclipseMatches:getMatchView'), identity);
  const aiSeatIds = new Set(view.seats.filter(seat => seat.controller === 'ai').map(seat => seat.id));
  const aiEntries = history.entries.filter(entry => aiSeatIds.has(entry.actorSeatId));
  assert.ok(aiEntries.length >= 2, 'Observe multiple accepted AI decisions.');
  const summaries = firstSamples.filter((sample, index, all) => sample.summary && sample.summary !== all[index - 1]?.summary && aiEntries.some(entry => sample.summary.includes(entry.summary)));
  assert.ok(new Set(summaries.map(sample => sample.summary)).size >= 2, 'The visible activity bar must report multiple AI decisions.');
  const intervals = summaries.slice(1).map((sample, index) => Math.round(sample.at - summaries[index].at));
  assert.ok(intervals.length && intervals.every(interval => interval >= 950), `AI summaries need at least one second of reading time (50 ms sampling tolerance); observed ${intervals.join(', ')} ms.`);
  assert.ok(firstSamples.some(sample => sample.pulseCount > 0), 'At least one real AI sector change must highlight its location.');
  assert.ok(firstSamples.some(sample => sample.panelHeading && sample.panelVisual), 'The automatic AI inspector must show the public action using visual components.');
  assert.equal(view.activeSeatId, view.viewerSeatId);

  await page.getByRole('button', {name: 'Animations', exact: true}).click();
  assert.equal(await page.getByRole('button', {name: 'Animations', exact: true}).getAttribute('aria-pressed'), 'false');
  await observe(page);
  await yieldAction(page);
  await page.locator('.dg-ai-activity [role=status] strong').filter({hasText: 'AI turn'}).waitFor();
  await page.waitForFunction(() => window.__aiObservations.some(sample => sample.actor.includes('AI turn')));
  await capture(page, 'motion-off');
  await page.locator('.dg-ai-activity [role=status] strong').filter({hasText: 'Your turn'}).waitFor({timeout: 45000});
  const motionOffSamples = await samples(page);
  assert.ok(motionOffSamples.every(sample => sample.pulseCount === 0 && sample.moveCount === 0), 'Animations off must suppress map animation elements.');
  assert.ok(motionOffSamples.some(sample => sample.actor.includes('AI turn') && sample.summary), 'Turning motion off must retain AI status and summaries.');
  await page.reload();
  await page.getByRole('button', {name: 'Game room', exact: true}).waitFor();
  assert.equal(await page.getByRole('button', {name: 'Animations', exact: true}).getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('.dg-ai-summary b').count(), 0, 'Reload must not replay old history as fresh AI activity.');
  assert.equal(await page.locator('.dg-tile-activity, .dg-activity-move').count(), 0);

  const reduced = await browser.newContext({reducedMotion: 'reduce', viewport: {width: 1440, height: 900}});
  await reduced.addInitScript(credential => localStorage.setItem('eclipse.second-dawn.guest.v1', credential), identity.credential);
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(page.url());
  await reducedPage.getByRole('button', {name: 'Game room', exact: true}).waitFor();
  assert.equal(await reducedPage.getByRole('button', {name: 'Animations', exact: true}).getAttribute('aria-pressed'), 'false', 'Browser reduced-motion preference must disable animations by default.');
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/result.json`, JSON.stringify({
    site, checkedAt: new Date().toISOString(), aiDecisions: aiEntries.length,
    visibleSummaries: summaries.map(({summary, at}) => ({summary, at: Math.round(at)})),
    summaryIntervalsMs: intervals, affectedSectorHighlighted: true, watchAiRevealsAffectedSector: true,
    movementObserved: firstSamples.some(sample => sample.moveCount > 0),
    motionOffSuppressesMapEffects: true, motionOffRetainsSummaries: true,
    motionPreferenceSurvivesReload: true, reducedMotionDefaultRespected: true,
    humanTurnVisible: true, reloadDoesNotReplayHistoricalEffects: true,
    automaticVisualAiInspector: true, followAiToggleWorks: true,
    humanTurnRestoresInspector: true, watchAiReopensMeaningfulAction: true, manualSectorSelectionDismissesAiPanel: true,
    observedPanelVisuals: [...new Set(firstSamples.map(sample => sample.panelVisual).filter(Boolean))],
    captures, pageErrors: errors,
    evidence: 'Agent-operated real solo room and public journal checks. No credentials, room tokens, or private decisions recorded. Movement evidence is reported only if naturally observed.',
  }, null, 2));
  console.log('Paced AI summaries, affected-sector feedback, human turn, motion toggle, reduced-motion default, and reload passed.');
} finally {
  await browser.close();
}
