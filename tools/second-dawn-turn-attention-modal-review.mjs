import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5173';
const output='coding_agents/second_dawn_turn_attention_modal_review';await mkdir(output,{recursive:true});const results=[];
for(const [engine,launcher] of Object.entries({chromium,webkit})){
 const browser=await launcher.launch();try{for(const width of [1440,390]){
  const height=width===390?844:900,page=await browser.newPage({viewport:{width,height},isMobile:width===390,hasTouch:width===390}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/__turn-modal',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));await page.goto(`${base}/__turn-modal`);
  await page.evaluate(async()=>{
   const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;
   const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView},{legalCommands}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/shared/eclipse/legal.ts'),import('/src/index.css')]);
   window.__commands=[];window.__backgroundClicks=0;
   function Host(){const [state,setState]=React.useState(()=>createGame({seed:13,warpPortals:false,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}));window.__upkeep=()=>setState(s=>({...s,phase:'upkeep',round:2}));const view=getPlayerView(state,'a');return React.createElement(React.Fragment,null,React.createElement(Board,{view,candidates:legalCommands(view),connected:true,busy:false,status:'Saved',onMenu:()=>{},onSubmit:command=>window.__commands.push(command)}),React.createElement('button',{id:'background-probe',style:{position:'fixed',bottom:'120px',left:'5px',zIndex:1100},onClick:()=>window.__backgroundClicks++},'Underlying control'));}
   ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
  });
  const turn=page.getByRole('dialog',{name:'Your turn',exact:true});await turn.waitFor();assert.equal(await page.getByRole('button',{name:'View turn',exact:true}).evaluate(el=>el===document.activeElement),true);
  const bounds=await turn.boundingBox();assert.ok(Math.abs(bounds.x+bounds.width/2-width/2)<3);assert.ok(Math.abs(bounds.y+bounds.height/2-height/2)<3);
  const probe=await page.locator('#background-probe').boundingBox();await page.mouse.click(probe.x+probe.width/2,probe.y+probe.height/2);assert.equal(await page.evaluate(()=>window.__backgroundClicks),0);assert.equal(await turn.count(),1);
  await page.mouse.click(5,5);assert.equal(await turn.count(),1);
  await page.getByRole('button',{name:'View turn',exact:true}).focus();for(let n=0;n<6;n++){await page.keyboard.press('Tab');assert.equal(await turn.evaluate(el=>el.contains(document.activeElement)),true);}
  await page.screenshot({path:`${output}/${engine}-${width}-turn.png`});
  await page.getByRole('button',{name:'View turn',exact:true}).click();assert.equal(await turn.count(),0);await page.locator('#background-probe').click();assert.equal(await page.evaluate(()=>window.__backgroundClicks),1);
  await page.locator('#background-probe').evaluate(el=>el.hidden=true);if(width===390)await page.getByRole('button',{name:'Dismiss details',exact:true}).click();await page.evaluate(()=>window.__upkeep());const upkeep=page.getByRole('dialog',{name:'Upkeep is ready',exact:true});await upkeep.waitFor();await page.screenshot({path:`${output}/${engine}-${width}-upkeep.png`});
  await page.getByRole('button',{name:'Review upkeep',exact:true}).click();assert.deepEqual(await page.evaluate(()=>window.__commands),[]);assert.equal(await upkeep.count(),0);
  const finish=page.getByRole('button',{name:'Finish upkeep',exact:true}).filter({visible:true}).first();await finish.waitFor();await finish.click();assert.deepEqual(await page.evaluate(()=>window.__commands),[{type:'finish-upkeep'}]);
  assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({engine,width,centered:true,focusTrapped:true,backdropBlocksClickThrough:true,backdropDoesNotDismiss:true,upkeepNavigationOnly:true,explicitUpkeepSubmission:true,errors});await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
