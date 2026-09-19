import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const output='coding_agents/second_dawn_result_feedback_review';await mkdir(output,{recursive:true});const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){const browser=await type.launch();try{for(const [width,height]of [[1440,900],[390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__result-feedback',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));
 await page.goto('http://127.0.0.1:5173/__result-feedback');
 await page.evaluate(async()=>{
  const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;
  const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView},{processGameCommand}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/shared/eclipse/engine.ts'),import('/src/index.css')]);
  window.__commands=[];
  function Host(){
   const [state,setState]=React.useState(()=>createGame({seed:13,warpPortals:false,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]})),[entries,setEntries]=React.useState([]);
   window.__draw=()=>setState(s=>({...s,revision:s.revision+1,pendingDecision:{id:'legacy-reputation',kind:'reputation',owner:'a',drawn:[1,4,2],capacity:4}}));
   window.__volley=()=>{const revision=state.revision+1;setState(s=>({...s,revision}));setEntries([{revision,actorSeatId:'b',actorName:'Eridani Empire',round:state.round,summary:'Resolved volley',details:[],combatVolley:{battleId:'example',attacker:'b',dice:[],impacts:[],targets:[{id:'destroyed-example',shipType:'cruiser',owner:'a',hpBefore:2,hpAfter:0,excess:0,destroyed:true}]}}]);};
   window.__advance=()=>setState(s=>({...s,revision:s.revision+1}));
   return React.createElement(Board,{view:getPlayerView(state,'a'),candidates:[],connected:true,busy:false,status:'Saved',onMenu:()=>{},onSubmit:command=>{window.__commands.push(command);setState(s=>{const result=processGameCommand(s,'a',command);if(!result.ok)throw Error(result.error.message);return {...result.state,revision:s.revision+1};});},history:{entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}});
  }
  ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
 });
 await page.getByRole('group',{name:'Galaxy map'}).waitFor();await page.evaluate(()=>window.__draw());
 const reputation=page.getByRole('region',{name:'Your reputation result'});await reputation.waitFor();
 assert.equal(await page.getByRole('button',{name:'Confirm reputation'}).count(),0);
 assert.ok((await reputation.textContent()).includes('Selected 4 VP'));
 assert.deepEqual(await page.evaluate(()=>window.__commands),[{type:'resolve',decisionId:'legacy-reputation',choice:{kind:'reputation'}}]);
 await page.screenshot({path:`${output}/${engine}-${width}-reputation.png`});
 await page.getByRole('button',{name:'Dismiss reputation result'}).click();
 await page.evaluate(()=>window.__volley());await page.getByRole('button',{name:'Dismiss battle results'}).waitFor();
 await page.screenshot({path:`${output}/${engine}-${width}-casualty.png`});
 await page.evaluate(()=>window.__advance());assert.equal(await page.getByRole('button',{name:'Dismiss battle results'}).count(),0);
 await page.screenshot({path:`${output}/${engine}-${width}-advanced.png`});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 results.push({engine,width,height,automaticReputation:true,privateFixedViewer:true,noConfirmation:true,battleClearsOnAdvance:true,noOverflow:true,errors});await page.close();
 }}finally{await browser.close();}}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
