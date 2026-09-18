import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const url = process.env.SECOND_DAWN_SITE_URL;
if (!url) throw new Error('Set SECOND_DAWN_SITE_URL to the integrated game site.');
const directory = 'coding_agents/second_dawn_connection_recovery_browser';
await mkdir(directory, {recursive: true});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let blockConnection = false;
  const sockets = new Set();
  await page.routeWebSocket('**/api/**/sync', socket => {
    if (blockConnection) socket.close();
    else {socket.connectToServer();sockets.add(socket);}
  });
  await page.goto(url);
  const create = page.getByRole('button', {name: 'Create multiplayer room', exact: true});
  await create.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Create multiplayer room' && !button.disabled));
  const savedCredential = await page.evaluate(() => localStorage.getItem('eclipse.second-dawn.guest.v1'));
  assert.ok(savedCredential);

  blockConnection = true;
  await page.reload();
  await page.getByText('The game server connection is taking longer than expected.', {exact: true}).waitFor({timeout: 15000});
  assert.equal(await create.isDisabled(), true);
  await page.screenshot({path: `${directory}/blocked.png`});
  blockConnection = false;
  await page.getByRole('button', {name: 'Retry connection', exact: true}).click();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Create multiplayer room' && !button.disabled));
  assert.ok((await page.evaluate(() => localStorage.getItem('eclipse.second-dawn.guest.v1'))) === savedCredential, 'Retry must preserve the existing credential.');
  await page.screenshot({path: `${directory}/recovered.png`});

  // Routed websockets can survive Playwright offline emulation; close them explicitly.
  blockConnection = true;
  await page.context().setOffline(true);
  for (const socket of sockets) socket.close();
  await page.getByText('The game server is disconnected. Your browser reports that you are offline.', {exact: true}).waitFor();
  assert.equal(await create.isDisabled(), true);
  blockConnection = false;
  await page.context().setOffline(false);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Create multiplayer room' && !button.disabled));
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/result.json`, JSON.stringify({
    checkedAt: new Date().toISOString(), url,
    blockedSocketExplained: true, explicitRetryRestoredConnection: true,
    credentialPreservedAcrossRetry: true, socketLossExplainedWithOfflineHint: true,
    onlineAutomaticallyRecovered: true, pageErrors: errors,
    evidence: 'Agent-operated browser with deliberately blocked websocket followed by restoration. No credentials recorded.',
  }, null, 2));
  console.log('Blocked connection, explicit retry preserving identity, offline state, and automatic reconnection passed.');
} finally {
  await browser.close();
}
