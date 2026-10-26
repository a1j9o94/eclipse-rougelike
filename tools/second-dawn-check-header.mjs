import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';

// Exercise actual board markup/CSS: jsdom visibility cannot detect clipped popovers.
// The generated fixture is local and read-only; no backend or game save is needed.
const fixturePath = '.second-dawn/header-regression';
await mkdir(fixturePath, {recursive: true});
await writeFile(`${fixturePath}/index.html`, '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
await writeFile(`${fixturePath}/fixture.tsx`, `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import Board from '/src/second-dawn-game/SecondDawnBoard';
import GameMenuPanel from '/src/second-dawn-game/GameMenuPanel';
import fixtures from '/src/second-dawn-game/reviewFixtures.json';
import {getPlayerView} from '/shared/eclipse/protocol';
import {legalCommands} from '/shared/eclipse/legal';
import '/src/index.css';
function HeaderFixture() {
 const [menu, setMenu] = useState(false);
 const state = structuredClone(fixtures.opening);
 if (new URLSearchParams(location.search).has('shortfall')) {
  const own = state.seats.find(seat=>seat.id===state.activeSeatId)!;
  own.resources.money = 2;
  own.influenceOnTrack -= 4;
  own.actionDiscs.explore += 4;
 }
 const view = getPlayerView(state, state.activeSeatId);
 return <><Board view={view} candidates={legalCommands(view)} connected busy={false} status="Engine fixture review" onSubmit={()=>{}} onMenu={()=>setMenu(true)}/>{menu&&<GameMenuPanel disabled={false} onHome={()=>{}} onClose={()=>setMenu(false)}/>}</>;
}
createRoot(document.getElementById('root')!).render(<HeaderFixture/>);
`);

const server = await createServer({server: {host: '127.0.0.1', port: 0}});
await server.listen();
const address = server.httpServer.address();
assert(address && typeof address === 'object');
const url = `http://127.0.0.1:${address.port}/${fixturePath}/index.html`;
const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
const results = [];

async function assertUncovered(locator, label) {
 const geometry = await locator.evaluate(element => {
  const rect = element.getBoundingClientRect();
  const points = [[.1,.1],[.9,.1],[.5,.5],[.1,.9],[.9,.9]];
  return {
   rect: rect.toJSON(),
   viewport: {width: innerWidth, height: innerHeight},
   covered: points.some(([x,y]) => !element.contains(document.elementFromPoint(rect.x+rect.width*x,rect.y+rect.height*y))),
  };
 });
 assert(geometry.rect.width > 0 && geometry.rect.height > 0, `${label} has no area`);
 assert(geometry.rect.x >= 0 && geometry.rect.right <= geometry.viewport.width+1, `${label} exceeds viewport horizontally`);
 assert(geometry.rect.y >= 0 && geometry.rect.bottom <= geometry.viewport.height+1, `${label} exceeds viewport vertically`);
 assert(!geometry.covered, `${label} is clipped or covered: ${JSON.stringify(geometry.rect)}`);
 return geometry.rect;
}

async function assertHeader(page, width, active, shortfall=false) {
 const desktop = await page.locator('.sd-header').count() > 0;
 const header = page.locator(desktop ? '.sd-header' : '.dg-mobile-header');
 const closedHeaderHeight = await header.evaluate(element=>element.getBoundingClientRect().height);
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: horizontal overflow`);
 const metrics = await header.evaluate(element => {
  const selector = element.matches('.sd-header')
   ? ':scope > .dg-close-activity, :scope > .dg-upkeep-summary > summary, :scope > .dg-running-score, :scope > .dg-save > button, :scope > .dg-save > .dg-shell-menu > summary'
   : ':scope > .dg-activity-back, :scope > .dg-header-score, :scope > .dg-shell-menu > summary';
  return [...element.querySelectorAll(selector)].map(control => {
   const rect = control.getBoundingClientRect();
   return {name: control.getAttribute('aria-label') || control.textContent.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height, center: rect.y+rect.height/2, saveGroup: !!control.closest('.dg-save')};
  });
 });
 assert(metrics.every(control => control.height >= 44), `${width}: header control below 44px: ${JSON.stringify(metrics)}`);
 // The narrow desktop layout may wrap whole groups into a second row. Controls
 // whose vertical bounds overlap belong to one row and must share its center.
 for (const control of metrics) {
  const row = metrics.filter(other => other.y < control.y+control.height && other.y+other.height > control.y);
  const centers = row.map(item => item.center);
  assert(Math.max(...centers)-Math.min(...centers) <= 1, `${width}: header control centers differ: ${JSON.stringify(row)}`);
 }
 const saveCenters = metrics.filter(control => control.saveGroup).map(control => control.center);
 assert(saveCenters.length === 0 || Math.max(...saveCenters)-Math.min(...saveCenters) <= 1, `${width}: save controls wrap or misalign`);
 if (!desktop) {
  const centers = metrics.map(control=>control.center);
  assert(Math.max(...centers)-Math.min(...centers)<=1, `${width}: mobile controls do not share a row: ${JSON.stringify(metrics)}`);
 }
 const turnOrder = page.getByRole('navigation', {name: 'Turn order', exact: true});
 await assertUncovered(turnOrder, `${width}: always-visible turn order`);
 assert(await page.locator('.sd-players').isHidden(), `${width}: turn order requires Table details to open`);
 assert(await turnOrder.locator('[aria-current="step"]').count() === 1, `${width}: turn order has no unique current player`);
 const turnTargets = await turnOrder.locator('button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().height));
 assert(turnTargets.length>0 && turnTargets.every(height=>height>=44), `${width}: turn order targets below44px`);
 const tools = header.locator('.dg-shell-menu');
 await tools.locator('summary').click();
 assert.equal(await header.evaluate(element=>element.getBoundingClientRect().height),closedHeaderHeight,`${width}: tools menu changes header height`);
 await assertUncovered(tools.locator(':scope > div'), `${width}: Game tools panel`);
 if (!active) await page.screenshot({path:`${fixturePath}/menu-${width}${shortfall?'-shortfall':''}.png`});
 await assertUncovered(tools.getByRole('button', {name: 'Preferences', exact: true}), `${width}: Preferences`);
 await tools.getByRole('button', {name: 'Preferences', exact: true}).click();
 await page.getByRole('dialog', {name: 'Preferences', exact: true}).waitFor();
 await page.getByRole('button', {name: 'Close settings', exact: true}).click();
 if (!await tools.evaluate(element => element.open)) await tools.locator('summary').click();
 await assertUncovered(tools.getByRole('button', {name: 'Game menu', exact: true}), `${width}: Game menu`);
 await tools.getByRole('button', {name: 'Game menu', exact: true}).click();
 await page.getByRole('dialog', {name: 'Game menu', exact: true}).waitFor();
 await page.getByRole('button', {name: 'Close game menu', exact: true}).click();
 if (await tools.evaluate(element => element.open)) await tools.locator('summary').click();
 if (!active && !shortfall) {
  await tools.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert(await tools.evaluate(element=>element.open),`${width}: keyboard cannot open tools`);
  const preferences = tools.getByRole('button',{name:'Preferences',exact:true});
  for (let index=0;index<12&&!await preferences.evaluate(element=>document.activeElement===element);index++) await page.keyboard.press('Tab');
  assert(await preferences.evaluate(element=>document.activeElement===element),`${width}: Preferences is not reachable by Tab`);
  await page.keyboard.press('Enter');
  await page.getByRole('dialog',{name:'Preferences',exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog',{name:'Preferences',exact:true}).waitFor({state:'hidden'});
  if (await tools.evaluate(element=>element.open)) await tools.locator('summary').click();
 }
 if (desktop) {
  const upkeep = header.locator('.dg-upkeep-summary');
  const summary = upkeep.locator('summary');
  assert.match(await summary.innerText(),/\d+ actions? affordable/,`${width}: header does not prioritize affordable actions`);
  await summary.click();
  assert(await upkeep.evaluate(element=>element.open),`${width}: single click cannot open economy details`);
  assert.equal(await header.evaluate(element=>element.getBoundingClientRect().height),closedHeaderHeight,`${width}: upkeep menu changes header height`);
  await assertUncovered(upkeep.locator(':scope > div'), `${width}: Round-end panel`);
  const tracks = upkeep.getByRole('button', {name: 'Inspect economy tracks', exact: true});
  await assertUncovered(tracks, `${width}: Inspect economy tracks`);
  // Pointer actionability uses browser hit testing; leave the current activity in place.
  await tracks.click({trial: true});
  await summary.click();
  assert(!await upkeep.evaluate(element=>element.open),`${width}: single click cannot close economy details`);
  await page.evaluate(()=>getSelection()?.removeAllRanges());
  await summary.dblclick();
  assert(!await upkeep.evaluate(element=>element.open),`${width}: consecutive native clicks fail to toggle economy details twice`);
  assert.equal(await page.evaluate(()=>getSelection()?.toString()??''),'',`${width}: repeated clicks select header text`);
  await summary.focus();
  await page.keyboard.press('Enter');
  assert(await upkeep.evaluate(element=>element.open),`${width}: keyboard cannot open economy details`);
  await assertUncovered(upkeep.locator(':scope > div'), `${width}: keyboard-opened economy panel`);
  await page.keyboard.press('Enter');
  assert(!await upkeep.evaluate(element=>element.open),`${width}: keyboard cannot close economy details`);
  await page.keyboard.press('Space');
  assert(await upkeep.evaluate(element=>element.open),`${width}: Space cannot open economy details`);
  await page.keyboard.press('Escape');
  assert(!await upkeep.evaluate(element=>element.open),`${width}: Escape cannot close economy details`);
 }
 return {width, active, shortfall, controls: metrics};
}

try {
 for (const [width,height] of [[360,740],[390,844],[761,900],[1023,900],[1024,768],[1366,768],[1920,1080],[3320,1080]]) {
  const page = await browser.newPage({viewport: {width,height}, reducedMotion: 'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(6000);
  try {
   await page.goto(url);
   await page.locator('.dg-app').waitFor();
   results.push(await assertHeader(page,width,false));
   if (await page.locator('.dg-mobile-header').count()) await page.getByRole('button', {name: 'Choose action', exact: true}).click();
   await page.getByRole('group', {name: 'Ordinary actions', exact: true}).getByRole('button', {name: /^Research\b/}).click();
   await page.getByRole('button', {name: 'Close activity', exact: true}).waitFor();
   results.push(await assertHeader(page,width,true));
   await page.goto(`${url}?shortfall=1`);
   await page.locator('.dg-app').waitFor();
   if (await page.locator('.dg-mobile-header').count()) await page.locator('.dg-header-shortfall').waitFor();
   else await page.locator('.dg-upkeep-summary .dg-danger').waitFor();
   results.push(await assertHeader(page,width,false,true));
   assert.deepEqual(errors,[],`${width}: browser errors`);
  } catch (error) {
   await page.screenshot({path:`${fixturePath}/failure-${width}.png`});
   results.push({width, error: error.message, browserErrors: errors});
  } finally {
   await page.close();
  }
 }
 await writeFile(`${fixturePath}/results.json`,JSON.stringify(results,null,2));
 const failures = results.filter(result=>result.error);
 for (const failure of failures) console.error(`${failure.width}: ${failure.error}`);
 assert.equal(failures.length,0,`${failures.length} header viewport checks failed; see ${fixturePath}/results.json`);
 console.log(`Header controls, turn order, tools menus and upkeep popovers passed in ${results.length} cases across ${results.length/3} widths, including active activities and round-end shortfalls.`);
} finally {
 await browser.close();
 await server.close();
}
