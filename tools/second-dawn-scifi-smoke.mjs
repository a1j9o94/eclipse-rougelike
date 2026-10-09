import {createWriteStream} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';
import assert from 'node:assert/strict';

// Isolated real backend, browser, persisted saves, and frontend; no cloud keys.
const binary=process.env.SECOND_DAWN_BACKEND_BINARY;
const live=Boolean(process.env.SECOND_DAWN_SITE_URL);
if(!live&&!binary)throw Error('Set SECOND_DAWN_BACKEND_BINARY to a Convex local backend binary.');
const root=resolve('.second-dawn/scifi-browser-smoke');await mkdir(root,{recursive:true});
const secret=randomBytes(32).toString('hex'),name='scifi-smoke';
const key=live?'':spawnSync(binary,['keygen','admin-key','--instance-name',name,'--instance-secret',secret],{encoding:'utf8'}).stdout.trim();
if(!live)assert.ok(key);
const env={...process.env};delete env.TZ;delete env.CONVEX_DEPLOY_KEY;delete env.CONVEX_DEPLOYMENT;
const backendUrl=live?'https://ideal-nightingale-55.convex.cloud':'http://127.0.0.1:3314',site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5197';
const envFile=resolve(root,'backend.env');if(!live)await writeFile(envFile,`CONVEX_SELF_HOSTED_URL=${backendUrl}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${key}\n`,{mode:0o600});
const children=[];let browser;
function launch(file,args,environment=env){const child=spawn(file,args,{env:environment,stdio:['ignore','pipe','pipe']});children.push(child);child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});return child;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await wait(100);}throw Error(`Server did not start: ${url}`);}
try{
 if(!live){
 const backend=launch(binary,['--interface','127.0.0.1','--port','3314','--site-proxy-port','3315','--instance-name',name,'--instance-secret',secret,'--disable-beacon','--local-storage',resolve(root,'storage'),resolve(root,'db.sqlite3')]);
 const backendLog=createWriteStream(resolve(root,'backend.log'));backend.stdout.pipe(backendLog);backend.stderr.pipe(backendLog);
 await ready(backendUrl+'/version');console.log('Local backend ready.');
 const publish=launch(process.execPath,['node_modules/convex/bin/main.js','dev','--env-file',envFile,'--once','--typecheck','enable','--tail-logs','disable']);
 let log='';publish.stdout.on('data',d=>{log+=d;});publish.stderr.on('data',d=>{log+=d;});
 publish.stdout.on('data',d=>process.stdout.write(d));publish.stderr.on('data',d=>process.stdout.write(d));
 const deadline=setTimeout(()=>publish.kill('SIGTERM'),60_000);
 const code=await new Promise(r=>publish.once('exit',r));clearTimeout(deadline);if(code!==0)throw Error('Local backend publish failed: '+log.replaceAll(key,'[redacted]'));
 launch(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5197','--strictPort'],{...env,VITE_CONVEX_URL:backendUrl});await ready(site);
 }
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const client=new ConvexHttpClient(backendUrl),query=makeFunctionReference('eclipseMatches:getMatchView');
 async function until(identity,predicate){for(let i=0;i<80;i++){const current=await client.query(query,identity);if(predicate(current))return current;await wait(250);}throw Error('Saved state did not reach the expected result.');}
 async function resume(){await page.getByRole('button',{name:/Continue · round/}).first().click();}
 const factions=[['exfor','Merry Band of Pirates'],['bobiverse','Replicant Commonwealth'],['trisolarans','Trisolaran Civilization'],['portiids','Portiid Collective'],['spacing-guild','Spacing Guild'],['formics','Formic Hive'],['belters','Belt Confederation']];
 for(const [id,label] of factions){
  await page.goto(site);await page.getByRole('button',{name:'New game',exact:true}).click();await page.getByRole('button',{name:/^Science fiction/}).click();
  await page.getByRole('button',{name:new RegExp('^'+label+',')}).click();await page.getByLabel('AI opponents',{exact:true}).selectOption('1');
  await page.getByRole('button',{name:'Start game',exact:true}).click();await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();
  const identity=await page.evaluate(()=>({credential:localStorage.getItem('eclipse.second-dawn.guest.v1'),matchId:localStorage.getItem('eclipse.second-dawn.match.v1')}));
  let view=await client.query(query,identity);assert.equal(view.factionProfile,'scifi-v1');assert.equal(view.seats.find(s=>s.id===view.viewerSeatId).faction,id);
  if(id==='exfor'){
   await page.getByRole('heading',{name:'Choose 2 discoveries'}).waitFor();const draft=view.pendingDecision;assert.equal(draft.kind,'discovery-draft');
   await page.reload();await resume();await page.getByRole('heading',{name:'Choose 2 discoveries'}).waitFor();assert.deepEqual((await client.query(query,identity)).pendingDecision,draft);
   await page.locator('.dg-decision input[type=checkbox]').nth(0).check();await page.locator('.dg-decision input[type=checkbox]').nth(1).check();await page.getByRole('button',{name:'Keep 2 discoveries',exact:true}).click();
   for(let reward=0;reward<2;reward++){await page.getByRole('radio',{name:'Keep for 2 VP',exact:true}).check();await page.getByRole('button',{name:'Keep for 2 VP',exact:true}).click();await wait(350);}
  }
  if(id==='bobiverse'){
   await page.getByRole('button',{name:/^Load factory/}).click();
   view=await until(identity,v=>v.ships.some(s=>s.owner===v.viewerSeatId&&s.factoryPopulation));assert.ok(view.ships.some(s=>s.owner===view.viewerSeatId&&s.factoryPopulation));
   await page.reload();await resume();await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();assert.ok((await client.query(query,identity)).ships.some(s=>s.owner===view.viewerSeatId&&s.factoryPopulation));
  }
  if(id==='spacing-guild'){
   await page.getByRole('button',{name:'Trade',exact:true}).click();await page.getByRole('button',{name:'Post offer',exact:true}).click();
   view=await until(identity,v=>v.guildOffers.length===1);assert.equal(view.guildOffers.length,1);
   await page.getByRole('button',{name:/^Cancel offer/}).click();view=await until(identity,v=>v.guildOffers.length===0);assert.equal(view.guildOffers.length,0);
  }
  if(id==='formics'){view=await client.query(query,identity);assert.deepEqual(view.ships.filter(s=>s.owner===view.viewerSeatId).map(s=>s.type),['cruiser']);}
 }
 assert.deepEqual(errors,[]);console.log('PASS: seven real browser creations, private draft reload/resolution, factory persistence, Guild escrow post/cancel and Formic setup.');
}catch(error){if(browser){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0]){await pages[0].screenshot({path:resolve(root,'failure.png')});console.error((await pages[0].locator('body').innerText()).slice(-4000));}}throw error;}
finally{await browser?.close();for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');}
