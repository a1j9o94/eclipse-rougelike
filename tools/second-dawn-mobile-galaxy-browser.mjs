import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175';
if(!['127.0.0.1','localhost'].includes(new URL(site).hostname))throw new Error('Local deterministic fixture only.');
const directory='coding_agents/second_dawn_mobile_galaxy_browser';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__galaxy-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mobile galaxy review</title></head><body><main class="sd-app dg-app" style="display:block;padding:0;height:100dvh"><div id="fixture" style="height:100%"></div></main></body></html>'}));
 await page.goto(`${site}/__galaxy-fixture`);
 await page.evaluate(async()=>{
  const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
  const[{default:React},{default:ReactDOM},{default:GalaxyBoard},{default:fixtures},{getPlayerView}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/GalaxyBoard.tsx'),import('/src/second-dawn-game/reviewFixtures.json'),import('/shared/eclipse/protocol.ts'),import('/src/index.css'),import('/src/second-dawn/second-dawn.css'),import('/src/second-dawn-game/game.css'),import('/src/second-dawn-game/itemDetails.css')]);
  window.__mapEvents=[];window.__mapCamera=null;
  function Host(){
   const[camera,setCamera]=React.useState(),[fixture,setFixture]=React.useState('opening'),[key,setKey]=React.useState(0);
   window.__setFixture=name=>{setFixture(name);setCamera(undefined);setKey(value=>value+1);};window.__remount=()=>setKey(value=>value+1);
   const state=fixtures[fixture],view=getPlayerView(state,state.seats[0].id);
   return React.createElement(GalaxyBoard,{key,compact:true,initialFit:true,view,camera,onCameraChange:value=>{window.__mapCamera=value;setCamera(value);},candidates:[{command:{type:'explore',position:{q:3,r:0}},label:'Eastern frontier',description:'Deterministic exploration target'}],selected:null,onSelect:id=>window.__mapEvents.push({type:'sector',id}),onExplore:()=>window.__mapEvents.push({type:'frontier'})});
  }
  ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
 });
 const map=page.getByRole('group',{name:'Galaxy map'});await map.waitFor();
 const client=await context.newCDPSession(page);
 const touch=async(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id=1])=>({x,y,id,radiusX:2,radiusY:2}))});
 const centerOf=async locator=>{const b=await locator.boundingBox();assert.ok(b);return{x:b.x+b.width/2,y:b.y+b.height/2};};
 const firstTile=page.locator('.dg-tile').first();let p=await centerOf(firstTile);
 await touch('touchStart',[[p.x,p.y]]);await touch('touchMove',[[p.x+55,p.y+30]]);await touch('touchEnd',[]);
 await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>window.__mapEvents),[],'Dragging from a tile must not select it.');
 const panned=await page.evaluate(()=>window.__mapCamera);assert.ok(panned);
 const box=await map.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 await touch('touchStart',[[x-40,y,1],[x+40,y,2]]);await touch('touchMove',[[x-80,y,1],[x+80,y,2]]);await touch('touchEnd',[]);await page.waitForTimeout(100);
 const pinched=await page.evaluate(()=>window.__mapCamera);assert.ok(pinched.zoom>panned.zoom*1.9);assert.ok(Math.abs(pinched.center.x-panned.center.x)<.1);assert.ok(Math.abs(pinched.center.y-panned.center.y)<.1);
 assert.deepEqual(await page.evaluate(()=>window.__mapEvents),[],'Pinch release must not select.');
 const beforeRotate=await page.evaluate(()=>window.__mapCamera);await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.__remount());await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>window.__mapCamera),beforeRotate);
 await page.getByRole('button',{name:'Fit',exact:true}).tap();p=await centerOf(firstTile);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.__mapEvents)).length,1,'A real touch tap selects exactly once.');
 await page.getByRole('button',{name:'Sectors',exact:true}).tap();await page.getByRole('button',{name:'Explore Eastern frontier'}).tap();assert.equal((await page.evaluate(()=>window.__mapEvents)).at(-1).type,'frontier');
 // Cancellation cannot select; the next intentional tap still works.
 p=await centerOf(firstTile);const count=(await page.evaluate(()=>window.__mapEvents)).length;
 await touch('touchStart',[[p.x,p.y]]);await touch('touchCancel',[]);await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.__mapEvents)).length,count);
 await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.__mapEvents)).length,count+1);
 const captures=[];
 for(const[width,height]of[[360,800],[390,844],[430,932],[844,390]])for(const fixture of['opening','midgame','late']){
  await page.setViewportSize({width,height});await page.evaluate(name=>window.__setFixture(name),fixture);await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Map must not widen the document.');
  const controls=await page.locator('.sd-map-controls button:visible').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return{label:button.getAttribute('aria-label')??button.textContent,width:r.width,height:r.height,x:r.x,right:r.right};}));
  for(const control of controls){assert.ok(control.width>=44&&control.height>=44,`${control.label} touch target`);assert.ok(control.x>=0&&control.right<=width,`${control.label} in viewport`);}
  const path=`${directory}/${width}x${height}-${fixture}.png`;await page.screenshot({path});captures.push(path);
 }
 await page.getByRole('button',{name:'Sectors',exact:true}).tap();await page.screenshot({path:`${directory}/sector-list-landscape.png`});
 // Same pointer controller supports mouse dragging and keyboard sector activation.
 await page.getByRole('button',{name:'Close sector list'}).click();await page.setViewportSize({width:1366,height:768});await page.getByRole('button',{name:'Fit',exact:true}).click();p=await centerOf(firstTile);
 const mouseBefore=(await page.evaluate(()=>window.__mapEvents)).length;await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+70,p.y+20,{steps:5});await page.mouse.up();assert.equal((await page.evaluate(()=>window.__mapEvents)).length,mouseBefore);
 await firstTile.focus();await page.keyboard.press('Enter');assert.equal((await page.evaluate(()=>window.__mapEvents)).length,mouseBefore+1);
 assert.deepEqual(errors,[]);
 await writeFile(`${directory}/result.json`,JSON.stringify({checkedAt:new Date().toISOString(),evidence:'Actual Chromium touch events on the production GalaxyBoard with deterministic public fixtures; no cloud mutations. This is not a physical-device Safari test.',pan:true,anchoredPinch:true,noDragPinchCancelSelection:true,singleTapExactlyOnce:true,cameraSurvivesRotationRemount:true,frontierList:true,mouseDrag:true,keyboardSelection:true,touchTargets44:true,captures,pageErrors:errors},null,2));
 console.log('Mobile galaxy: real touch pan/pinch/tap/cancel, camera persistence, list, mouse and keyboard passed; 12 viewport/fixture captures.');
}finally{await browser.close();}
