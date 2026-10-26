import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import fixtures from '../src/second-dawn-game/reviewFixtures.json' with {type:'json'};

// Real wheel input catches scroll traps that click({trial:true}) or scrollIntoView miss.
// Derive control from accepted engine commands rather than inventing a pending state.
const directory='.second-dawn/inspector-scroll-regression';
await mkdir(directory,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try {
 const {getPlayerView}=await server.ssrLoadModule('/shared/eclipse/protocol.ts');
 const {processGameCommand}=await server.ssrLoadModule('/shared/eclipse/engine.ts');
 const {legalCommands}=await server.ssrLoadModule('/shared/eclipse/legal.ts');
 const {automaticCombatCommand}=await server.ssrLoadModule('/shared/eclipse/combatAutomation.ts');
 let state=structuredClone(fixtures['ancient-combat']),steps=0;
 while(!(state.pendingDecision?.kind==='control'&&state.pendingDecision.owner==='p0')) {
  assert(steps++<50,'Could not derive a real postbattle control state');
  const decision=state.pendingDecision;assert(decision,'Combat fixture ended before control');
  const view=getPlayerView(state,decision.owner);
  const command=automaticCombatCommand(view)??legalCommands(view).find(candidate=>candidate.command.type==='resolve')?.command;
  assert(command,'No legal aftermath command');
  const result=processGameCommand(state,decision.owner,command);
  assert(result.ok,JSON.stringify(result));
  state={...result.state,revision:state.revision+1};
 }
 await writeFile(`${directory}/control.json`,JSON.stringify(state));
 await writeFile(`${directory}/index.html`,'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
 await writeFile(`${directory}/fixture.tsx`,`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import Board from '/src/second-dawn-game/SecondDawnBoard';
import fixtures from '/src/second-dawn-game/reviewFixtures.json';
import control from './control.json';
import {getPlayerView} from '/shared/eclipse/protocol';
import {legalCommands} from '/shared/eclipse/legal';
import {processGameCommand} from '/shared/eclipse/engine';
import '/src/index.css';
const mode=new URLSearchParams(location.search).get('mode');
function Harness(){
 const [state,setState]=useState(()=>structuredClone(mode==='control'?control:mode==='influence'?fixtures['workflow-influence']:fixtures.opening));
 const [submitted,setSubmitted]=useState(null);const view=getPlayerView(state,mode==='influence'?state.activeSeatId:'p0');
 const initialSectorId=mode!=='info'?undefined:state.sectors.find(sector=>sector.owner==='p0').id;
 const submit=command=>{const result=processGameCommand(state,view.viewerSeatId,command);setSubmitted({command,ok:result.ok,...(result.ok?{nextDecision:result.state.pendingDecision?.kind,owner:result.state.sectors.find(sector=>sector.id==='303')?.owner}:{error:result.error})});if(result.ok)setState({...result.state,revision:state.revision+1});};
 return <><Board view={view} candidates={legalCommands(view)} initialSectorId={initialSectorId} connected busy={false} status="Engine fixture review" onSubmit={submit} onMenu={()=>{}}/><output id="submitted" hidden>{JSON.stringify(submitted)}</output></>;
}
createRoot(document.getElementById('root')).render(<Harness/>);`);
 const address=server.httpServer.address();assert(address&&typeof address==='object');
 const base=`http://127.0.0.1:${address.port}/${directory}/index.html`;
 for(const[width,height]of[[1366,768],[1024,600],[761,900],[390,844],[360,740]])for(const mode of ['control','info','influence']) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(5000);
  try {
   await page.goto(`${base}?mode=${mode}`);await page.locator('.dg-app').waitFor();const inspector=page.getByRole('complementary',{name:'Selection and action details',exact:true});
   if(mode==='info'&&await page.locator('.dg-mobile-header').count())await page.getByRole('button',{name:/^Inspect sector 222,/}).press('Enter');
   if(mode==='influence'){
    if(await page.locator('.dg-mobile-header').count())await page.getByRole('button',{name:'Choose action',exact:true}).click();
    await page.getByRole('button',{name:/^Influence(?: Control territory)?$/}).first().click();
    await page.getByText('Choose from sector list',{exact:true}).click();
    await page.getByRole('button',{name:/^Select sector .* to control$/}).first().click();
    const transfer=page.getByText('Use a disc from an existing sector instead',{exact:true});
    if(await transfer.count())await transfer.click();
   }
   await inspector.waitFor();
   if(await page.locator('.dg-mobile-header').count()){
    const expand=page.getByRole('button',{name:/^Expand .* details$/});if(await expand.count())await expand.click();
   }
   if(mode==='control')await inspector.getByRole('radio',{name:'Place influence disc',exact:true}).click();
   const scroller=mode==='control'?inspector.locator('.dg-economy-decision-body'):mode==='influence'?inspector.locator('.dg-influence-body'):inspector.locator('.dg-inspector-body');
   const metrics=await scroller.evaluate(element=>({client:element.clientHeight,scroll:element.scrollHeight,top:element.scrollTop,rect:element.getBoundingClientRect().toJSON()}));
   assert(metrics.client>=100,`${mode}/${width}: scroll area collapsed below a usable height: ${JSON.stringify(metrics)}`);
   assert(metrics.scroll>metrics.client+5,`${mode}/${width}: long content has no bounded scroll owner: ${JSON.stringify(metrics)}`);
   const commit=mode==='control'?inspector.getByRole('button',{name:'Confirm control',exact:true}):mode==='influence'?inspector.locator('.dg-influence-confirm .dg-commit-actions button'):null;
   if(commit)await assertOnScreen(commit,`${width}: control commit before scrolling`);
   const rect=await scroller.boundingBox();assert(rect);
   await page.mouse.move(rect.x+rect.width/2,Math.min(rect.y+rect.height/2,height-80));
   await page.mouse.wheel(0,10000);
   await page.waitForFunction(selector=>{const element=document.querySelector(selector);return element&&element.scrollTop>0&&element.scrollTop>=element.scrollHeight-element.clientHeight-2;},mode==='control'?'.dg-economy-decision-body':mode==='influence'?'.dg-influence-body':'.dg-inspector-body',{timeout:3000});
   const after=await scroller.evaluate(element=>({top:element.scrollTop,max:element.scrollHeight-element.clientHeight}));
   assert(after.top>0&&after.top>=after.max-2,`${mode}/${width}: wheel cannot reach end: ${JSON.stringify(after)}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollTop),0,'Whole page scrolls instead of inspector');
   if(commit){
    await assertOnScreen(commit,`${width}: control commit after scrolling`);await commit.click();
    const receipt=JSON.parse(await page.locator('#submitted').textContent());assert.equal(receipt.ok,true);if(mode==='control'){assert.equal(receipt.owner,'p0');assert.equal(receipt.command.choice.accept,true);}else assert.equal(receipt.command.type,'influence');
   }
   assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   results.push({mode,width,height,scrollOwner:metrics,wheel:after,engineAccepted:!!commit});
  }catch(error){await page.screenshot({path:`${directory}/failure-${mode}-${width}.png`});results.push({mode,width,height,error:error.message,errors});}
  finally{await page.close();}
 }
 await writeFile(`${directory}/results.json`,JSON.stringify({derivedEngineSteps:steps,results},null,2));
 const failures=results.filter(result=>result.error);for(const failure of failures)console.error(`${failure.mode}/${failure.width}: ${failure.error}`);
 assert.equal(failures.length,0,`${failures.length} inspector scroll checks failed; see ${directory}/results.json`);
 console.log(`Inspector wheel scrolling, bounded control commits and engine confirmation passed ${results.length} viewport/workflow checks.`);
}finally{await browser.close();await server.close();}

async function assertOnScreen(locator,label){
 const geometry=await locator.evaluate(element=>{const rect=element.getBoundingClientRect();return{rect:rect.toJSON(),viewport:{width:innerWidth,height:innerHeight},hit:element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))};});
 assert(geometry.rect.top>=0&&geometry.rect.bottom<=geometry.viewport.height&&geometry.rect.left>=0&&geometry.rect.right<=geometry.viewport.width&&geometry.hit,`${label} is outside viewport or covered: ${JSON.stringify(geometry.rect)}`);
}
