import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site='http://127.0.0.1:5173',output='coding_agents/second_dawn_choice_workspace_review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const [width,height] of [[1366,768],[1440,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/__choice-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));
  await page.goto(`${site}/__choice-review`);
  await page.evaluate(async()=>{
   const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
   const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView},{legalCommands},{default:fixtures}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/shared/eclipse/legal.ts'),import('/src/second-dawn-game/reviewFixtures.json'),import('/src/index.css')]);
   window.__commands=[];
   function Host(){
    const[state,setState]=React.useState(()=>createGame({seed:19,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]}));
    window.__discovery=()=>setState(previous=>({...previous,revision:previous.revision+1,pendingDecision:{id:'discovery-1',owner:'a',kind:'discovery',tileId:'money',options:['keep','use'],sectorId:previous.sectors.find(s=>s.owner==='a').id}}));
    window.__exploration=()=>setState(fixtures.exploration);
    const view=getPlayerView(state,state.pendingDecision?.owner??'a');
    return React.createElement(Board,{view,candidates:legalCommands(view),connected:true,busy:false,status:'Saved',onMenu:()=>{},onSubmit:command=>window.__commands.push(command)});
   }
   ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
  });
  await page.getByRole('group',{name:'Galaxy map'}).waitFor();
  const closedWidth=(await page.locator('.sd-main').boundingBox()).width;
  await page.screenshot({path:`${output}/${width}-galaxy.png`});
  if(width>600){
   await page.getByRole('button',{name:/^Inspect sector 222,/}).press('Enter');
   await page.getByRole('complementary',{name:'Selection and action details'}).waitFor();
   const openWidth=(await page.locator('.sd-main').boundingBox()).width;
   assert.ok(closedWidth-openWidth>=300,'Closing inspector actually releases at least 300px');
   await page.screenshot({path:`${output}/${width}-sector-details.png`});
   await page.getByRole('button',{name:'Hide sector details'}).click();
  }
  await page.evaluate(()=>window.__discovery());
  await page.getByRole('radio',{name:'Keep for 2 VP'}).check();
  await page.screenshot({path:`${output}/${width}-discovery.png`});
  if(width<600){await page.getByRole('button',{name:'Keep for 2 VP',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${width}-discovery-commit.png`});}
  await page.getByRole('button',{name:'Minimize discovery'}).click();
  await page.getByRole('group',{name:'Galaxy map'}).waitFor();
  await page.getByRole('button',{name:'Return to discovery'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Return to discovery'}).evaluate(el=>document.activeElement===el),true,'Minimize restores keyboard focus to the return control');
  if(width<600){await page.getByRole('navigation',{name:'Mobile game navigation'}).getByRole('button',{name:'Players'}).click();}
  await page.getByRole('button',{name:/Hydran Progress Human/}).click();
  await page.getByRole('button',{name:'Inspect Interceptor blueprint'}).click();
  await page.getByRole('heading',{name:'Ship blueprints'}).waitFor();
  await page.screenshot({path:`${output}/${width}-opponent-blueprints-return.png`});
  await page.getByRole('button',{name:'Return to discovery'}).click();
  assert.equal(await page.getByRole('radio',{name:'Keep for 2 VP'}).isChecked(),true);
  assert.deepEqual(await page.evaluate(()=>window.__commands),[]);
  await page.evaluate(()=>window.__exploration());
  await page.getByRole('dialog',{name:'Sector placement choice'}).waitFor();
  await page.screenshot({path:`${output}/${width}-exploration.png`});
  const mapBounds=await page.getByRole('region',{name:'Exploration placement preview'}).locator('.dg-galaxy > svg').boundingBox();assert.ok(mapBounds&&mapBounds.height>100,'Placement map retains usable rendered height');
  const commitBounds=await page.getByRole('button',{name:'Place sector',exact:true}).boundingBox();assert.ok(commitBounds.y+commitBounds.height<height,'Placement commitment stays above navigation');
  const bounds=await page.getByRole('dialog',{name:'Sector placement choice'}).boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height,'Choice popup fits viewport');
  assert.deepEqual(errors,[]);
  results.push({width,height,closedGalaxyWidth:closedWidth,draftPreserved:true,minimizeFocusRestored:true,popupFitsViewport:true,errors});
  console.log(`${width}×${height}: map space, preserved discovery, named return and exploration passed.`);
  await page.close();
 }
}finally{await browser.close();}
await writeFile(`${output}/results.json`,JSON.stringify({evidence:'Production components with deterministic fixtures, Chromium desktop and mobile emulation; no cloud writes or physical device playtest.',results},null,2));
