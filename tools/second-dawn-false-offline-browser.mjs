import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const site = process.env.SECOND_DAWN_SITE_URL;
if (!site) throw new Error('Set SECOND_DAWN_SITE_URL to the game site.');
const label = (process.env.SECOND_DAWN_EVIDENCE_LABEL ?? (new URL(site).hostname === '127.0.0.1' ? 'local' : 'live')).replace(/[^a-z0-9_-]/gi, '-');
const directory = `coding_agents/second_dawn_false_offline_browser/${label}`;
await mkdir(directory, {recursive: true});
const browser = await chromium.launch();
const evidence = {site, checkedAt: new Date().toISOString(), navigatorReportsOffline: false, realSocketOpened: false};
let captureFailure = async () => {};
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}});
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'onLine', {configurable: true, get: () => false}));
  const page = await context.newPage();
  captureFailure = async () => {
    await page.screenshot({path: `${directory}/failure.png`});
    evidence.failureUi = await page.evaluate(() => ({
      disconnected: document.body.innerText.includes('Disconnected · waiting to reconnect'),
      confirmation: [...document.querySelectorAll('button')].filter(button => button.textContent?.includes('Confirm action')).map(button => ({label: button.textContent, disabled: button.disabled})),
    }));
  };
  const errors = [];
  const sockets = new Set();
  let blockConnection = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('websocket', () => {evidence.realSocketOpened = true;});
  await page.routeWebSocket('**/api/**/sync', socket => {
    if (blockConnection) socket.close();
    else {socket.connectToServer();sockets.add(socket);}
  });
  await page.goto(site);
  await page.getByRole('button', {name: 'Create multiplayer room', exact: true}).waitFor();
  await page.waitForFunction(() => Boolean(localStorage.getItem('eclipse.second-dawn.guest.v1')));
  // Wait for the profile query as well as the socket, without relying on the OS hint.
  await page.getByText('No saved Second Dawn games in this browser yet.', {exact: true}).waitFor();
  evidence.navigatorReportsOffline = await page.evaluate(() => !navigator.onLine);
  assert.ok(evidence.navigatorReportsOffline, 'This regression must preserve the false offline hint.');
  const createRoom = page.getByRole('button', {name: 'Create multiplayer room', exact: true});
  await page.screenshot({path: `${directory}/lobby.png`});
  assert.ok(await createRoom.isEnabled(), 'A working game server connection must enable room creation even when navigator.onLine is false.');
  assert.ok(await page.getByRole('button', {name: 'Save player profile', exact: true}).isEnabled());
  assert.ok(await page.getByRole('button', {name: 'Sign in', exact: true}).isEnabled());
  assert.equal(await page.getByRole('button', {name: 'Retry connection', exact: true}).count(), 0);
  await page.getByRole('button', {name: 'Sign in', exact: true}).click();
  await page.getByRole('heading', {name: 'Welcome back', exact: true}).waitFor();
  assert.ok(await page.getByLabel('PIN or recovery code', {exact: true}).isEnabled());
  await page.getByRole('button', {name: 'Cancel', exact: true}).click();
  await page.getByRole('button', {name: 'Save player profile', exact: true}).click();
  assert.ok(await page.getByLabel('Optional PIN', {exact: true}).isEnabled());
  await page.getByRole('button', {name: 'Cancel', exact: true}).click();

  const credential = await page.evaluate(() => localStorage.getItem('eclipse.second-dawn.guest.v1'));
  await page.getByRole('button', {name: 'New game', exact: true}).click();
  await page.getByRole('button', {name: 'Start game', exact: true}).click();
  await page.getByRole('button', {name: 'Game room', exact: true}).waitFor();
  await page.locator('.sd-frontier').first().click();
  const confirm = page.getByRole('button', {name: 'Confirm action', exact: true});
  assert.ok(await confirm.isEnabled());

  blockConnection = true;
  for (const socket of sockets) socket.close();
  await page.getByText('Disconnected · waiting to reconnect', {exact: true}).waitFor();
  assert.ok(await confirm.isDisabled(), 'Actual socket loss must disable command submission.');
  await page.screenshot({path: `${directory}/actual-socket-loss.png`});
  blockConnection = false;
  await confirm.click({trial: true});
  await confirm.click();
  await page.locator('.dg-exploration-decision').waitFor();
  assert.ok((await page.evaluate(() => localStorage.getItem('eclipse.second-dawn.guest.v1'))) === credential, 'Reconnection must preserve identity.');
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  assert.deepEqual(errors, []);
  await page.screenshot({path: `${directory}/recovered-command.png`});
  Object.assign(evidence, {
    lobbyEnabledDespiteFalseOfflineHint: true, profileAndSignInEnabled: true,
    soloRoomCreated: true, actualSocketLossDisabledSubmission: true,
    automaticReconnectRestoredSubmission: true, commandAcceptedAfterReconnect: true,
    identityPreserved: true, pageErrors: errors,
    evidence: 'Agent-operated real browser with navigator.onLine forced false and working network; actual websocket then closed and restored. No credentials or recovery secrets recorded.',
  });
  await writeFile(`${directory}/result.json`, JSON.stringify(evidence, null, 2));
  console.log('False offline hint no longer blocks profile, room creation, or gameplay; actual socket loss still guards commands and recovers.');
} catch (error) {
  await captureFailure();
  evidence.failure = error instanceof Error ? error.message : 'False offline browser regression failed.';
  await writeFile(`${directory}/result.json`, JSON.stringify(evidence, null, 2));
  console.error(evidence.failure);
  process.exitCode = 1;
} finally {
  await browser.close();
}
