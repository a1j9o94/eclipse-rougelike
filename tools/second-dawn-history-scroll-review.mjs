import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const site=process.env.SITE_URL??'http://127.0.0.1:5173',output='.second-dawn/history-scroll';
await mkdir(output,{recursive:true});const results=[];
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();try{for(const [width,height] of [[1366,768],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__history-scroll',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));await page.goto(`${site}/__history-scroll`);
  await page.evaluate(async()=>{
   const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;
   const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/src/index.css')]);
   const entry=revision=>({revision,actorSeatId:'b',actorName:'Hydran Progress',round:3,summary:`Action ${revision}: researched a technology and prepared the fleet.`,details:['Public action details retained.']});
   const state=createGame({seed:13,warpPortals:false,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
   function Host(){const [entries,setEntries]=React.useState(()=>Array.from({length:70},(_,i)=>entry(100-i))),[older,setOlder]=React.useState(true);window.__prepend=()=>setEntries(es=>[entry(es[0].revision+1),...es]);return React.createElement(Board,{view:getPlayerView(state,'a'),candidates:[],connected:true,busy:false,status:'Saved',onMenu:()=>{},onSubmit:()=>{},history:{entries,loading:false,hasOlder:older,loadingOlder:false,error:null,loadOlder:()=>{setEntries(es=>[...es,...Array.from({length:10},(_,i)=>entry(30-i))]);setOlder(false);}}});}
   ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
  });await page.locator('.dg-app').waitFor();
  await page.getByRole('button',{name:width<600?'Activity':'History',exact:true}).click();const log=page.getByRole('log',{name:'Match actions'}).filter({visible:true});await log.waitFor();
  const geometry=await log.evaluate(e=>({client:e.clientHeight,scroll:e.scrollHeight,bottom:e.getBoundingClientRect().bottom,viewport:innerHeight}));assert.ok(geometry.client>80&&geometry.client<height,`History not bounded: ${JSON.stringify(geometry)}`);assert.ok(geometry.scroll>geometry.client+500);
  if(width<600&&engine==='chromium'){const box=await log.boundingBox(),cdp=await page.context().newCDPSession(page);const x=box.x+box.width/2,y=box.y+box.height*.8;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*30}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else if(width<600){await log.focus();await page.keyboard.press('PageDown');}else{await log.hover();await page.mouse.wheel(0,420);}await page.waitForFunction(()=>[...document.querySelectorAll('.dg-history-scroll')].some(e=>e.scrollTop>100));
  await log.evaluate(e=>new Promise(resolve=>{let last=e.scrollTop,stable=0;const tick=()=>{stable=Math.abs(e.scrollTop-last)<.5?stable+1:0;last=e.scrollTop;if(stable>=12)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));
  const anchor=await log.evaluate(e=>{const row=[...e.querySelectorAll('li')].find(r=>r.getBoundingClientRect().top>=e.getBoundingClientRect().top);return {text:row.querySelector('small').textContent,y:row.getBoundingClientRect().top};});await page.evaluate(()=>window.__prepend());await page.waitForFunction(()=>document.querySelector('.dg-history-scroll li small')?.textContent?.includes('#101'));
  const after=await log.evaluate((e,text)=>[...e.querySelectorAll('li')].find(r=>r.querySelector('small').textContent===text).getBoundingClientRect().top,anchor.text);assert.ok(Math.abs(after-anchor.y)<2,`${engine}-${width}: New actions displaced reading position by ${after-anchor.y}`);
  await log.focus();await page.keyboard.press('End');await page.waitForFunction(()=>{const e=[...document.querySelectorAll('.dg-history-scroll')].find(e=>e.clientHeight>0);return e.scrollTop>e.scrollHeight-e.clientHeight-5;});const beforeOlder=await log.evaluate(e=>e.scrollTop);await page.getByRole('button',{name:'Load earlier actions'}).click();await page.waitForFunction(()=>document.querySelectorAll('.dg-history-scroll li').length===81);assert.ok(Math.abs(await log.evaluate(e=>e.scrollTop)-beforeOlder)<2);
  await page.screenshot({path:`${output}/${engine}-${width}.png`});assert.deepEqual(errors,[]);results.push({engine,width,geometry,anchorDelta:after-anchor.y,olderLoaded:true,errors});await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
