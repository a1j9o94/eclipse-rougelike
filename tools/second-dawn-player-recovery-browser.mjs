import assert from 'node:assert/strict';
import {randomBytes, randomInt} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';

const site = process.env.SECOND_DAWN_SITE_URL;
if (!site) throw new Error('Set SECOND_DAWN_SITE_URL to the integrated game site.');
const backend = process.env.SECOND_DAWN_CONVEX_URL ?? 'https://ideal-nightingale-55.convex.cloud';
const label = (process.env.SECOND_DAWN_EVIDENCE_LABEL ?? (new URL(site).hostname === '127.0.0.1' ? 'local' : 'live')).replace(/[^a-z0-9_-]/gi, '-');
const directory = `coding_agents/second_dawn_player_recovery_browser/${label}`;
const client = new ConvexHttpClient(backend);
const fn = name => makeFunctionReference(name);
const username = `Pilot-${randomBytes(6).toString('hex')}`;
const codeUsername = `Pilot-${randomBytes(6).toString('hex')}`;
const pin = String(randomInt(100000, 1000000));
const secrets = new Set([pin]);
const captures = [];
async function captureSizes(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({width, height});
    await page.screenshot({path: `${directory}/${width}x${height}-${name}.png`});
    captures.push({name, width, height, horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)});
  }
  await page.setViewportSize({width: 1440, height: 900});
}
async function credentialOf(page) {
  const credential = await page.evaluate(() => localStorage.getItem('eclipse.second-dawn.guest.v1'));
  if (credential) secrets.add(credential);
  return credential;
}
const matchIdOf = page => page.evaluate(() => localStorage.getItem('eclipse.second-dawn.match.v1'));
async function waitForPlayer(page, name) {
  await page.locator('.dg-player-access header strong').filter({hasText: name}).waitFor();
}
async function register(page, name, optionalPin) {
  await page.getByRole('button', {name: 'Save player profile', exact: true}).click();
  if (optionalPin) await captureSizes(page, 'registration-empty');
  await page.getByRole('textbox', {name: 'Player username', exact: true}).fill(name);
  if (optionalPin) await page.getByLabel('Optional PIN', {exact: true}).fill(optionalPin);
  await page.getByRole('button', {name: 'Create player profile', exact: true}).click();
  const code = page.getByRole('textbox', {name: 'Private recovery code', exact: true});
  await code.waitFor();
  const value = await code.inputValue();
  secrets.add(value);
  assert.ok(value.length > 30, 'Registration must show a recovery code.');
  // Never screenshot or record the form while the recovery code is visible.
  await page.getByRole('button', {name: 'I saved my code', exact: true}).click();
  await waitForPlayer(page, name);
  return value;
}
async function startLogin(page, name, secret) {
  await page.getByRole('button', {name: /^(Sign in|Switch player)$/}).click();
  await page.getByRole('textbox', {name: 'Player username', exact: true}).fill(name);
  await page.getByLabel('PIN or recovery code', {exact: true}).fill(secret);
  await page.getByRole('button', {name: 'Continue as player', exact: true}).click();
}

await mkdir(directory, {recursive: true});
const browser = await chromium.launch();
const errors = [];
try {
  const pages = [];
  for (let n = 0; n < 3; n++) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    pages.push(page);
  }
  const [first, second, third] = pages;
  await first.goto(site);
  await first.getByRole('button', {name: 'Save player profile', exact: true}).waitFor();
  await first.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Save player profile' && !b.disabled));
  const originalCredential = await credentialOf(first);
  assert.ok(originalCredential);
  // Exercise migration of an existing pre-room solo game without altering player data.
  const oldGame = await client.mutation(fn('eclipseMatches:createMatch'), {credential: originalCredential, aiCount: 1, faction: 'terran-directorate', warpPortals: true});
  await first.reload();
  await first.getByRole('button', {name: /Continue · round/}).first().waitFor();
  const recoveryCode = await register(first, username, pin);
  assert.ok((await credentialOf(first)) === originalCredential, 'Registration must retain the original browser identity.');
  const registeredGames = await client.query(fn('eclipseMatches:listMyMatches'), {credential: originalCredential});
  assert.ok(registeredGames.some(game => game.matchId === oldGame.matchId), 'Pre-existing solo must survive profile registration.');
  await captureSizes(first, 'registered-player');

  await first.getByRole('button', {name: 'New game', exact: true}).click();
  await first.getByRole('button', {name: 'Start game', exact: true}).click();
  await first.waitForURL(/\/room\//);
  await first.getByRole('button', {name: 'Game room', exact: true}).waitFor();
  const roomUrl = first.url();
  secrets.add(roomUrl);
  const matchId = await matchIdOf(first);
  assert.ok(matchId);
  await first.locator('.sd-frontier').first().click();
  await first.getByRole('button', {name: 'Confirm action', exact: true}).click();
  await first.locator('.dg-exploration-decision').waitFor();
  const originalView = await client.query(fn('eclipseMatches:getMatchView'), {credential: originalCredential, matchId});
  assert.equal(originalView.pendingDecision.kind, 'exploration');
  assert.ok(!originalView.multiplayer?.timer, 'Solo games must wait for the player without a turn deadline.');
  await captureSizes(first, 'solo-pending-choice');

  await second.goto(roomUrl);
  await second.getByRole('button', {name: 'Sign in', exact: true}).waitFor();
  await second.waitForFunction(() => Boolean(localStorage.getItem('eclipse.second-dawn.guest.v1')));
  const secondGuest = await credentialOf(second);
  const wrongPin = pin === '000000' ? '111111' : '000000';
  await startLogin(second, username, wrongPin);
  await second.getByRole('alert').filter({hasText: 'Unable to sign in'}).waitFor();
  assert.ok((await credentialOf(second)) === secondGuest, 'Wrong PIN must leave the browser identity unchanged.');
  await second.getByLabel('PIN or recovery code', {exact: true}).fill(pin);
  await second.getByRole('button', {name: 'Continue as player', exact: true}).click();
  await second.locator('.dg-exploration-decision').waitFor();
  const restoredCredential = await credentialOf(second);
  assert.ok(restoredCredential !== originalCredential, 'A recovered device must receive its own credential.');
  const restoredView = await client.query(fn('eclipseMatches:getMatchView'), {credential: restoredCredential, matchId});
  assert.equal(restoredView.viewerSeatId, originalView.viewerSeatId);
  assert.deepEqual(restoredView.pendingDecision, originalView.pendingDecision);
  assert.equal(restoredView.revision, originalView.revision);
  assert.ok((await client.query(fn('eclipseMatches:listMyMatches'), {credential: restoredCredential})).some(game => game.matchId === oldGame.matchId));
  await captureSizes(second, 'second-device-restored-choice');
  await second.reload();
  await second.locator('.dg-exploration-decision').waitFor();
  assert.ok((await credentialOf(second)) === restoredCredential, 'Reload must retain the recovered device identity.');

  await third.goto(site);
  await startLogin(third, username, recoveryCode);
  await waitForPlayer(third, username);
  const recoveredWithCode = await credentialOf(third);
  assert.ok((await client.query(fn('eclipseMatches:listMyMatches'), {credential: recoveredWithCode})).some(game => game.matchId === matchId), 'Recovery code must restore the same solo room game.');
  await third.getByRole('button', {name: 'Previous browser player', exact: true}).click();
  await third.getByRole('button', {name: 'Save player profile', exact: true}).waitFor();
  const optionalCode = await register(third, codeUsername);
  const noPinProfile = await client.query(fn('eclipsePlayerStore:getPlayerProfile'), {credential: await credentialOf(third)});
  assert.equal(noPinProfile.pinEnabled, false);
  await second.goto(site);
  await startLogin(second, codeUsername, optionalCode);
  await waitForPlayer(second, codeUsername);
  await second.getByRole('button', {name: 'Previous browser player', exact: true}).click();
  await second.getByRole('button', {name: 'Save player profile', exact: true}).waitFor();
  assert.ok((await credentialOf(second)) === secondGuest, 'Repeated player switches must retain access to the original browser guest.');

  assert.deepEqual(errors, []);
  await writeFile(`${directory}/result.json`, JSON.stringify({
    checkedAt: new Date().toISOString(), site, backend,
    preExistingSoloRetained: true, soloRoomHasNoTimer: true,
    pendingExplorationRestoredOnSecondDevice: true, privateSeatRestored: true,
    recoveredBrowserSurvivesReload: true, originalBrowserCredentialRetained: true,
    wrongPinDoesNotSwitchPlayer: true, recoveryCodeRestoresGames: true,
    pinIsOptional: true, codeOnlyProfileSignsIn: true, previousBrowserPlayerRestored: true,
    pageErrors: errors, captures,
    evidence: 'Agent-operated three isolated browser contexts. Credentials, PINs, recovery codes, room links, and match ids never recorded.',
  }, null, 2));
  console.log('Existing solo migration, solo room recovery, PIN/code sign-in, optional PIN, wrong-secret protection, and previous-player restoration passed.');
} catch (error) {
  let message = error instanceof Error ? error.message : 'Player recovery browser check failed.';
  for (const secret of secrets) if (secret) message = message.replaceAll(secret, '[redacted]');
  console.error(message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
