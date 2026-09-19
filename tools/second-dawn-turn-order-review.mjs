import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const output='coding_agents/second_dawn_turn_order_review';await mkdir(output,{recursive:true});
const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{for(const [width,height] of [[1440,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__turn-order',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));
  await page.goto('http://127.0.0.1:5173/__turn-order');
  await page.evaluate(async()=>{
   const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;
   const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView},{processGameCommand}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/shared/eclipse/engine.ts'),import('/src/index.css')]);
   window.__commands=[];
   function Host(){
    const [state,setState]=React.useState(()=>{const s=createGame({seed:13,warpPortals:false,seats:['hydran','eridani','planta','orion','mechanema','draco'].map((faction,i)=>({id:String(i),faction,controller:i?'ai':'human'}))});s.activeSeatId='2';s.firstPasser='0';s.startSeatId='0';s.seats[0].passed=true;return s;});
    window.__humanTurn=()=>setState(s=>({...s,activeSeatId:'0',revision:s.revision+1}));
    window.__nextTurn=()=>setState(s=>({...s,activeSeatId:'3',revision:s.revision+1}));
    return React.createElement(Board,{view:getPlayerView(state,'0'),initialSectorId:state.sectors.find(s=>s.owner==='0').id,candidates:[],connected:true,busy:false,status:'Saved',onMenu:()=>{},onSubmit:command=>{window.__commands.push(command);setState(s=>{const result=processGameCommand(s,'0',command);if(!result.ok)throw Error(result.error.message);return {...result.state,revision:s.revision+1};});}});
   }
   ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
  });
  if(width<800)await page.getByRole('button',{name:'Players',exact:true}).click();
  const roster=page.getByRole('region',{name:'Civilization roster'});await roster.waitFor();
  const names=()=>roster.locator('button strong').allTextContents();
  assert.deepEqual(await names(),['Planta','Orion Hegemony','Mechanema','Descendants of Draco','Hydran Progress','Eridani Empire']);
  await page.screenshot({path:`${output}/${engine}-${width}-order.png`});
  await page.evaluate(()=>window.__nextTurn());
  await page.waitForFunction(()=>document.querySelector('.sd-player-list button strong')?.textContent==='Orion Hegemony');
  const hydran=roster.getByRole('button',{name:/Hydran Progress/});await hydran.scrollIntoViewIfNeeded();
  assert.ok((await hydran.textContent()).includes('Next round first'));
  await hydran.click();await page.getByRole('heading',{name:'Hydran Progress',exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/${engine}-${width}-inspection.png`});
  if(width<800)await page.getByRole('button',{name:'Galaxy',exact:true}).click();
  else await page.getByRole('button',{name:'Watch AI',exact:true}).click();
  await page.evaluate(()=>window.__humanTurn());
  await page.waitForFunction(()=>document.querySelector('.sd-player-list button strong')?.textContent==='Hydran Progress');
  assert.equal(await page.getByRole('button',{name:'Inspect fleet in selected sector'}).count(),0);
  assert.equal(await page.locator('.sd-map-heading button').count(),0);
  if(width>=800){
   const details=page.getByRole('button',{name:/^(Show|Hide) sector details$/}),follow=page.getByRole('button',{name:'Follow AI',exact:true});
   const a=await details.boundingBox(),b=await follow.boundingBox();
   assert.ok(Math.abs(a.y-b.y)<2,'Sector details shares the AI toolbar row');
  }
  await page.screenshot({path:`${output}/${engine}-${width}-toolbar.png`});
  await page.getByRole('button',{name:/^Inspect sector .*Hydran Progress/}).press('Enter');
  if(width<800){const expand=page.getByRole('button',{name:/Expand .*details/});if(await expand.isVisible())await expand.click();}
  const fleet=page.getByRole('button',{name:'Inspect fleet',exact:true});await fleet.scrollIntoViewIfNeeded();
  assert.equal(await fleet.count(),1);assert.ok(await fleet.evaluate(el=>!!el.closest('#sector-details')));
  assert.equal(await page.getByRole('button',{name:'Inspect capabilities',exact:true}).count(),0);
  await page.screenshot({path:`${output}/${engine}-${width}-sector-fleet.png`});
  await fleet.click();await page.getByRole('button',{name:'Return to plan'}).waitFor();
  await page.getByRole('button',{name:'Return to plan'}).click();
  const autoPass=page.getByRole('checkbox',{name:'Auto-pass unless attacked'});await autoPass.check();
  await page.waitForFunction(()=>document.querySelector('.sd-player-list button strong')?.textContent==='Eridani Empire');
  assert.deepEqual(await page.evaluate(()=>window.__commands),[{type:'set-auto-pass',enabled:true}]);
  assert.ok(await autoPass.isChecked());
  await page.screenshot({path:`${output}/${engine}-${width}-auto-pass.png`});
  assert.deepEqual(errors,[]);results.push({engine,width,height,clockwiseRoster:true,updatesOnTurn:true,inspectionPreserved:true,firstPassMarker:true,autoPassHandsOff:true,singleFleetButton:true,toolbarControls:true,noDocumentOverflow:true,errors});await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
