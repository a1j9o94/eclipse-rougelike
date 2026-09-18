import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const site = process.env.SECOND_DAWN_SITE_URL ?? 'http://127.0.0.1:5175';
if (!['127.0.0.1', 'localhost'].includes(new URL(site).hostname)) throw new Error('This isolated engine-fixture browser check requires local Vite module imports.');
const directory = 'coding_agents/second_dawn_movement_chain_browser';
await mkdir(directory, {recursive: true});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 1366, height: 768}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/__movement-fixture', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><title>Movement planner review</title></head><body><main class="sd-app dg-app dg-tabletop" style="display:block;padding:24px;height:100vh"><p>Movement planning · deterministic engine fixture</p><aside class="sd-inspector" style="width:340px;height:500px;margin-top:20px"><div id="movement-fixture"></div></aside></main></body></html>'}));
  await page.goto(`${site}/__movement-fixture`);
  const expected = await page.evaluate(async () => {
    const refresh = (await import('/@react-refresh')).default;
    refresh.injectIntoGlobalHook(window);window.$RefreshReg$ = () => {};window.$RefreshSig$ = () => type => type;window.__vite_plugin_react_preamble_installed__ = true;
    const [React, ReactDOM, {default: MovementPlanner}, {createGame}, {getPlayerView}, {processGameCommand}, {SECTORS}] = await Promise.all([
      import('/node_modules/.vite/deps/react.js'), import('/node_modules/.vite/deps/react-dom_client.js'),
      import('/src/second-dawn-game/MovementPlanner.tsx'), import('/shared/eclipse/setup.ts'),
      import('/shared/eclipse/protocol.ts'), import('/shared/eclipse/engine.ts'), import('/shared/eclipse/sectors.ts'),
      import('/src/index.css'), import('/src/second-dawn/second-dawn.css'), import('/src/second-dawn-game/game.css'), import('/src/second-dawn-game/itemDetails.css'),
    ]);
    const state = createGame({seed: 4, seats: [{id: 'a', faction: 'terran-directorate', controller: 'human'}, {id: 'b', faction: 'hydran', controller: 'ai'}]});
    const source = state.sectors.find(sector => sector.owner === 'a'), middle = state.sectors.find(sector => sector.owner === null), target = state.sectors.find(sector => sector.owner === 'b');
    const tiles = SECTORS.filter(tile => tile.wormholes.includes(0) && tile.wormholes.includes(3) && !tile.warpPortal).slice(0, 3);
    state.sectors = [source, middle, target];
    state.sectors.forEach((sector, index) => {sector.position = {q: index, r: 0};sector.rotation = 0;sector.tileId = String(tiles[index].id);sector.portalVp = undefined;});
    state.ships = state.ships.filter(ship => ship.owner === 'a');
    const ship = state.ships[0], before = state.seats[0].influenceOnTrack;
    window.__movementOutcome = null;
    let submissions = 0;
    ReactDOM.default.createRoot(document.getElementById('movement-fixture')).render(React.default.createElement(MovementPlanner, {
      view: getPlayerView(state, 'a'), sourceSectorId: source.id, selectedTargetId: target.id,
      disabled: false, onTargetsChange: () => {}, onClose: () => {},
      onSubmit: command => {
        submissions++;
        const result = processGameCommand(state, 'a', command);
        window.__movementOutcome = {
          accepted: result.ok, submissions, activations: command.moves.length,
          sameShipTwice: command.moves.every(move => move.shipId === ship.id),
          route: command.moves.flatMap(move => move.path),
          reachedTarget: result.ok && result.state.ships.find(candidate => candidate.id === ship.id).sectorId === target.id,
          influenceSpent: result.ok ? before - result.state.seats[0].influenceOnTrack : null,
          activationsRemaining: result.ok ? result.state.engine.action.remaining : null,
          inputStateUnchanged: state.seats[0].influenceOnTrack === before && ship.sectorId === source.id,
        };
      },
    }));
    return {routeLabel: [source.tileId, middle.tileId, target.tileId].join(' → '), route: [middle.id, target.id]};
  });
  await page.getByRole('checkbox', {name: 'Interceptor 1', exact: true}).check();
  await page.getByText('2 / 3 move activations selected', {exact: true}).waitFor();
  assert.equal(await page.locator('.dg-movement-route p').count(), 1);
  assert.equal(await page.locator('.dg-movement-route span').innerText(), expected.routeLabel);
  const confirm = page.getByRole('button', {name: 'Confirm move · 1 ship · 2 activations', exact: true});
  const bounds = await confirm.boundingBox();
  assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 768, 'The confirmation must remain completely visible at 1366×768.');
  assert.ok(await confirm.isEnabled());
  await page.screenshot({path: `${directory}/1366x768-two-activation-route.png`});
  await confirm.click();
  const result = await page.evaluate(() => window.__movementOutcome);
  assert.equal(result.accepted, true);assert.equal(result.submissions, 1);assert.equal(result.activations, 2);
  assert.equal(result.sameShipTwice, true);assert.deepEqual(result.route, expected.route);
  assert.equal(result.reachedTarget, true);assert.equal(result.influenceSpent, 1);
  assert.equal(result.activationsRemaining, 1);assert.equal(result.inputStateUnchanged, true);
  assert.deepEqual(errors, []);
  await writeFile(`${directory}/result.json`, JSON.stringify({checkedAt: new Date().toISOString(), ...result, routeLabel: expected.routeLabel, inspectorWidth: 340, confirmationFullyVisible: true, pageErrors: errors, evidence: 'Actual browser rendering of the production MovementPlanner with the deterministic chainFixture and pure authoritative engine. No cloud state injected; this is not a cloud persistence test.'}, null, 2));
  console.log('Speed-one ship travels two sectors via two activations in one confirmation and spends one influence disc; narrow inspector remains readable.');
} finally {
  await browser.close();
}
