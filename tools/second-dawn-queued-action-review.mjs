import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5183';
const results=[];
const browser=await chromium.launch();
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__queue-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));await page.goto(`${base}/__queue-review`);
 await page.evaluate(async()=>{
  const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;
  const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView},{legalCommands}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/shared/eclipse/legal.ts'),import('/src/index.css')]);
  window.__commands=[];window.__queued=[];
  function Host(){const [queuedAction,setQueuedAction]=React.useState(null);const state=React.useMemo(()=>{const s=createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});s.activeSeatId='b';s.seats[0].resources={money:20,science:20,materials:20};return s;},[]);const view=getPlayerView(state,'a');return React.createElement(Board,{view,candidates:legalCommands(view),connected:true,busy:false,status:'Saved',queuedAction,onMenu:()=>{},onSubmit:command=>window.__commands.push(command),onQueue:command=>{window.__queued.push(command);setQueuedAction(command?{command,status:'pending'}:null);}});}
  ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
 });
 await page.locator('.dg-app').waitFor();
 if(width===390){await page.getByRole('button',{name:'Actions',exact:true}).click();}
 await page.getByRole('button',{name:'Build',exact:true}).filter({visible:true}).first().click();
 await page.getByRole('button',{name:'Add interceptor'}).click();
 await page.getByRole('button',{name:/Place interceptor in sector/}).first().click();
 await page.getByRole('button',{name:/Build 1 ship/}).click();
 const dialog=page.getByRole('dialog',{name:'Queue Build'});await dialog.waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__commands),[]);assert.deepEqual(await page.evaluate(()=>window.__queued),[]);
 await dialog.getByRole('button',{name:'Confirm · will execute on your turn'}).click();
 const saved=page.getByRole('region',{name:'Queued next action'});await saved.waitFor();
 assert.equal(await page.evaluate(()=>window.__queued.length),1);assert.deepEqual(await page.evaluate(()=>window.__commands),[]);
 await saved.getByRole('button',{name:'Cancel queued action'}).click();await saved.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>window.__queued.at(-1)),null);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 results.push({width,buildChoices:true,explicitQueueConfirmation:true,noOffTurnActionSubmission:true,cancellation:true,pageErrors:errors,horizontalOverflow:false});await page.close();
}}finally{await browser.close();}
console.log(JSON.stringify(results));
