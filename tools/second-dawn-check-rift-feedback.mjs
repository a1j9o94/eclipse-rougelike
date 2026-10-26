import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const directory='.second-dawn/rift-feedback-regression';
await mkdir(directory,{recursive:true});
await writeFile(`${directory}/index.html`,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
await writeFile(`${directory}/fixture.tsx`, `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Board from '/src/second-dawn-game/SecondDawnBoard';
import {riftCombatReviewFixture} from '/src/second-dawn-game/riftReviewFixture';
import {getPlayerView} from '/shared/eclipse/protocol';
import {legalCommands} from '/shared/eclipse/legal';
import {processGameCommand} from '/shared/eclipse/engine';
import {projectHistoryEntry} from '/shared/eclipse/history';
import '/src/index.css';
function Fixture(){
 const [state,setState]=useState(riftCombatReviewFixture),[entries,setEntries]=useState([]),[receipt,setReceipt]=useState(),[accepted,setAccepted]=useState([]);
 const actor='rift',view=getPlayerView(state,actor);
 return <><Board view={view} candidates={legalCommands(view)} connected busy={false} status="Engine fixture review" lastAcceptedCommand={receipt} history={{entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder(){}}} onMenu={()=>{}} onSubmit={command=>{
  const result=processGameCommand(state,actor,command);
  if(!result.ok)throw Error(result.error.message);
  const revision=state.revision+1,commandId='rift-browser-'+revision;
  setReceipt({revision,type:command.type});
  setEntries(previous=>[projectHistoryEntry({actor,request:{commandId,expectedRevision:state.revision,command},receipt:{commandId,revision,eventCount:result.events.length},events:result.events},state.seats,state.round,state),...previous]);
  setAccepted(previous=>[...previous,{command,events:result.events}]);
  setState({...result.state,revision});
 }}/><output hidden data-testid="engine-proof">{JSON.stringify({phase:state.phase,decision:state.pendingDecision,ships:state.ships,accepted})}</output></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
`);

const server=await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
const address=server.httpServer.address();
assert(address&&typeof address==='object');
const url=`http://127.0.0.1:${address.port}/${directory}/index.html`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];

async function uncovered(locator,label){
 await locator.waitFor({state:'visible'});
 const geometry=await locator.evaluate(element=>{
  const r=element.getBoundingClientRect();
  return {rect:r.toJSON(),viewport:{width:innerWidth,height:innerHeight},covered:[[.2,.2],[.8,.2],[.5,.5],[.2,.8],[.8,.8]].some(([x,y])=>!element.contains(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)))};
 });
 assert(geometry.rect.width>0&&geometry.rect.height>0,`${label}: empty`);
 assert(geometry.rect.left>=0&&geometry.rect.right<=geometry.viewport.width+1&&geometry.rect.top>=0&&geometry.rect.bottom<=geometry.viewport.height+1,`${label}: off-screen ${JSON.stringify(geometry.rect)}`);
 assert(!geometry.covered,`${label}: clipped or covered`);
 return geometry.rect;
}

try{
 for(const [width,height] of [[360,740],[390,844],[1366,768]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.addInitScript(()=>{
   localStorage.setItem('eclipse.second-dawn.effects.v1','off');
   localStorage.setItem('eclipse.second-dawn.dice3d.v1','off');
   localStorage.setItem('eclipse.second-dawn.dice-sound.v1','off');
  });
  try{
   await page.goto(url);
   const dice=page.getByRole('group',{name:'Rolled attack dice',exact:true});
   const die=dice.getByRole('button',{name:/Die 1, roll 5.*3 damage, 1 self-damage/});
   await uncovered(die,`${width}: Rift die`);
   await uncovered(die.locator('.dg-die-backfire'),`${width}: visible die self-damage`);
   const dieText=await die.evaluate(element=>{
    const bounds=element.getBoundingClientRect();
    return [...element.querySelectorAll('.dg-die-damage,.dg-die-backfire')].map(label=>{
     const rect=label.getBoundingClientRect();
     return {text:label.textContent,contained:rect.left>=bounds.left&&rect.right<=bounds.right&&rect.top>=bounds.top&&rect.bottom<=bounds.bottom,overflow:label.scrollWidth>label.clientWidth+1};
    });
   });
   assert(dieText.every(label=>label.contained&&!label.overflow),`${width}: compact die text does not fit: ${JSON.stringify(dieText)}`);
   assert.equal(await die.locator('.dg-die-state').textContent(),'!');
   assert(!await die.evaluate(element=>element.classList.contains('is-auto-miss')),`${width}: backfire marked as miss`);
   const ownShip=page.locator('[data-ship-id="rift-interceptor"]');
   const ownNode=await ownShip.elementHandle();
   assert(ownNode,`${width}: own ship missing`);
   await page.locator('[data-ship-id="shield-dreadnought"]').getByRole('button',{name:/^Target /}).click();
   const commit=page.getByRole('region',{name:'Commit action',exact:true});
   assert.match(await commit.innerText(),/1 self-damage/);
   const resolve=commit.getByRole('button',{name:'Resolve volley',exact:true});
   const resolveRect=await uncovered(resolve,`${width}: Resolve volley`);
   assert(await resolve.isEnabled(),`${width}: volley remains uncommittable`);
   await page.screenshot({path:`${directory}/${width}-before-resolve.png`});
   await resolve.click();
   const ownAfter=page.locator('[data-ship-id="rift-interceptor"]');
   await ownAfter.getByText('Rift backfire · 1 damage',{exact:true}).waitFor();
   assert(await ownNode.evaluate(element=>element.isConnected&&element===document.querySelector('[data-ship-id="rift-interceptor"]')),`${width}: own ship replaced rather than updated`);
   assert(await ownAfter.evaluate(element=>element.classList.contains('is-destroyed')),`${width}: own casualty not shown`);
   await uncovered(ownAfter.getByText('Rift backfire · 1 damage',{exact:true}),`${width}: own ship backfire receipt`);
   const lastVolley=page.locator('[aria-label="Last volley"]');
   await uncovered(lastVolley.getByText('1 self-damage',{exact:true}),`${width}: last-volley self-damage`);
   assert(await lastVolley.getByRole('img',{name:'Rift die: 3 damage, 1 self-damage',exact:true}).count()===1,`${width}: last volley loses accessible Rift face semantics`);
   const proof=JSON.parse(await page.getByTestId('engine-proof').textContent());
   assert.equal(proof.accepted.length,1,`${width}: more than one command submitted`);
   assert.equal(proof.accepted[0].command.choice.kind,'combat-allocation');
   assert(!proof.ships.some(ship=>ship.id==='rift-interceptor'),`${width}: engine did not remove self-destroyed ship`);
   const volley=proof.accepted[0].events.find(event=>event.combatVolley)?.combatVolley;
   assert(volley,`${width}: no authoritative volley receipt`);
   assert(volley.targets.some(target=>target.id==='rift-interceptor'&&target.hpBefore===1&&target.hpAfter===0&&target.destroyed),`${width}: no authoritative backfire casualty`);
   const continuation=page.getByRole('button',{name:/^Continue to |^Return to galaxy$|^View final scores$/});
   const continuationRect=await uncovered(continuation,`${width}: battle continuation`);
   const reputation=page.getByRole('region',{name:'Your reputation result',exact:true});
   const reputationDetails=reputation.locator('details').first();
   await reputationDetails.locator(':scope > summary').click();
   assert(await reputationDetails.evaluate(element=>element.open),`${width}: reputation details did not open`);
   await uncovered(continuation,`${width}: continuation with reputation expanded`);
   await page.screenshot({path:`${directory}/${width}-reputation-expanded.png`});
   await reputationDetails.locator(':scope > summary').click();
   assert(!await reputationDetails.evaluate(element=>element.open),`${width}: reputation details did not close`);
   await uncovered(ownAfter.getByText('Rift backfire · 1 damage',{exact:true}),`${width}: backfire receipt after reputation inspection`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: horizontal overflow`);
   await page.screenshot({path:`${directory}/${width}-after-resolve.png`});
   await continuation.click();
   assert.equal(JSON.parse(await page.getByTestId('engine-proof').textContent()).accepted.length,1,`${width}: navigation submitted a game command`);
   await page.locator('.dg-battlefield').waitFor({state:'hidden'});
   assert.deepEqual(errors,[],`${width}: browser errors`);
   results.push({width,height,resolveRect,continuationRect,phaseAfterResolve:proof.phase,persistedOwnCasualty:true,sameShipNode:true,lastVolleySelfDamage:true,errors});
  }catch(error){
   await page.screenshot({path:`${directory}/${width}-failure.png`});
   results.push({width,height,error:error.message,errors});
  }finally{await page.close();}
 }
 await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));
 const failures=results.filter(result=>result.error);
 for(const failure of failures)console.error(`${failure.width}: ${failure.error}`);
 assert.equal(failures.length,0,`${failures.length} Rift browser checks failed; see ${directory}/results.json`);
 console.log(`Rift self-damage feedback and real engine resolution passed at ${results.length} viewport sizes.`);
}finally{
 await browser.close();
 await server.close();
}
