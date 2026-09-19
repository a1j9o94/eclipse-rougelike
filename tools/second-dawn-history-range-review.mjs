import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5173',directory='coding_agents/second_dawn_history_range_review';await mkdir(directory,{recursive:true});const results=[];
for(const [engine,launcher] of Object.entries({chromium,webkit})){
 const browser=await launcher.launch();try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/__history-range',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));await page.goto(`${base}/__history-range`);
  await page.evaluate(async()=>{
   const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;
   const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/src/index.css')]);
   const entry=revision=>({revision,actorSeatId:'a',actorName:'Eridani Empire',round:Math.ceil(revision/30),summary:revision===1?'First action: explored the frontier':`Action ${revision}: prepared the fleet`,details:[],rollbackAvailable:true});
   const state=createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});
   function Host(){const [entries,setEntries]=React.useState(()=>Array.from({length:40},(_,i)=>entry(240-i)));return React.createElement(Board,{view:getPlayerView(state,'a'),candidates:[],connected:true,busy:false,status:'Saved',onMenu:()=>{},onSubmit:()=>{},historyRollback:{isHost:true,disabled:false,onSelect:selected=>{window.__selectedHistory=selected.revision;}},history:{entries,loading:false,hasOlder:true,loadingOlder:false,error:null,loadOlder:()=>{},loadBeginning:async()=>{setEntries(current=>[...current.filter(e=>e.revision>40),...Array.from({length:40},(_,i)=>entry(40-i))]);}}});}
   ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
  });await page.locator('.dg-app').waitFor();await page.getByRole('button',{name:'View turn',exact:true}).click();await page.getByRole('button',{name:width===390?'Activity':'History',exact:true}).click();
  await page.getByRole('button',{name:'Beginning of game',exact:true}).click();
  const first=page.getByRole('listitem').filter({hasText:'First action: explored the frontier'});await first.waitFor();
  const log=page.getByRole('log',{name:'Match actions'}).filter({visible:true});await page.waitForFunction(()=>{const el=[...document.querySelectorAll('.dg-history-scroll')].find(e=>e.clientHeight);return el&&el.scrollTop+el.clientHeight>=el.scrollHeight-2;});
  const button=first.getByRole('button',{name:'Undo to before this action'});assert.equal(await button.isEnabled(),true);await button.click();assert.equal(await page.evaluate(()=>window.__selectedHistory),1);
  await page.screenshot({path:`${directory}/${engine}-${width}.png`});assert.deepEqual(errors,[]);results.push({engine,width,firstActionSelected:true,scrolledToBeginning:true,errors,logHeight:await log.evaluate(e=>e.clientHeight)});await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
