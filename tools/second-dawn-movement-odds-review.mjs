import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5173',dir='coding_agents/second_dawn_movement_odds_review';await mkdir(dir,{recursive:true});const results=[];
for(const [engine,launcher] of Object.entries({chromium,webkit})){
 const browser=await launcher.launch();
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/__odds-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));await page.goto(`${base}/__odds-review`);
  await page.evaluate(async()=>{
   const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
   const [{default:React},{default:ReactDOM},{default:Planner},{createGame},{getPlayerView}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/MovementPlanner.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/src/index.css'),import('/src/second-dawn-game/game.css')]);
   const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});const source=state.sectors.find(sector=>sector.owner==='a'),target=state.sectors.find(sector=>sector.owner==='b');source.portalVp=1;target.portalVp=1;const view=getPlayerView(state,'a');window.__probe={view,source:source.id,target:target.id};
   function Host(){const[enabled,setEnabled]=React.useState(true);return React.createElement('main',{className:'dg-app',style:{minHeight:'100vh',padding:12,background:'#0d1720',color:'#dce2e5'}},React.createElement('label',null,React.createElement('input',{type:'checkbox',checked:enabled,onChange:event=>setEnabled(event.target.checked)}),'Game setting: combat win estimates'),React.createElement('div',{className:'sd-inspector',style:{maxWidth:460,margin:'10px auto',height:'auto',overflow:'visible'}},React.createElement(Planner,{view,sourceSectorId:source.id,selectedTargetId:target.id,showCombatOdds:enabled,disabled:false,onTargetsChange:()=>{},onClose:()=>{},onSubmit:()=>{}})));}
   ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
  });
  await page.getByRole('region',{name:'Move fleet'}).getByRole('checkbox').click();await page.getByText('estimated fleet win',{exact:true}).waitFor();await page.getByText('Estimate assumptions').click();await page.screenshot({path:`${dir}/${engine}-${width}.png`,fullPage:true});
  const estimate=await page.getByRole('region',{name:'Estimated combat outcome'}).innerText();await page.getByRole('checkbox',{name:'Game setting: combat win estimates'}).uncheck();assert.equal(await page.getByRole('region',{name:'Estimated combat outcome'}).count(),0);
  const benchmark=await page.evaluate(async()=>{const {movementBattleEstimate}=await import('/shared/eclipse/movementBattleEstimate.ts');const {view,source,target}=window.__probe;const stress=structuredClone(view),a=stress.ships.find(ship=>ship.owner==='a'),b=stress.ships.find(ship=>ship.owner==='b');stress.ships=[];for(let i=0;i<10;i++)stress.ships.push({...a,id:`a-${i}`,sectorId:source},{...b,id:`b-${i}`,sectorId:target});let heartbeats=0,maxInputGapMs=0,lastBeat=performance.now();const timer=setInterval(()=>{const now=performance.now();maxInputGapMs=Math.max(maxInputGapMs,now-lastBeat);lastBeat=now;heartbeats++;},5),start=performance.now();const result=await movementBattleEstimate(stress,stress.ships.filter(ship=>ship.owner==='a').map(ship=>ship.id),target);clearInterval(timer);return {elapsedMs:Math.round(performance.now()-start),heartbeats,maxInputGapMs:Math.round(maxInputGapMs),status:result.status,trials:result.trials??0};});
  assert.equal(errors.length,0);assert.ok(benchmark.elapsedMs<2000);assert.ok(benchmark.heartbeats>0);assert.ok(benchmark.maxInputGapMs<100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({engine,width,estimate,benchmark,noPageErrors:true});await page.close();
 }
 await browser.close();
}
await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
