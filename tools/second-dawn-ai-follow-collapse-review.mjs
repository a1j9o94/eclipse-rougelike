import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site='http://127.0.0.1:5173',output='coding_agents/second_dawn_ai_follow_collapse_review';await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const [width,height] of [[1366,768],[1440,900]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__ai-follow-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));
 await page.goto(`${site}/__ai-follow-review`);
 await page.evaluate(async()=>{
  const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
  const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/src/index.css')]);
  function Host(){
   const [state,setState]=React.useState(()=>createGame({seed:13,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]})),[entries,setEntries]=React.useState([]);
   window.__aiAction=()=>{const revision=state.revision+1;setState({...state,activeSeatId:'b',revision});setEntries(previous=>[{revision,actorSeatId:'b',actorName:'Hydran Progress',round:1,summary:'Researched Improved Hull',details:[],presentation:{kind:'research',technologyId:'improved-hull'}},...previous]);};
   return React.createElement(Board,{view:getPlayerView(state,'a'),candidates:[],connected:true,busy:false,status:'Saved',onMenu:()=>{},onSubmit:()=>{throw new Error('Unexpected submission');},history:{entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}});
  }
  ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
 });
 await page.getByRole('button',{name:'Show sector details'}).waitFor();
 await page.evaluate(()=>window.__aiAction());
 await page.getByRole('region',{name:'AI action details'}).waitFor();
 await page.screenshot({path:`${output}/${width}-ai-automatically-visible.png`});
 await page.getByRole('button',{name:'Close details'}).click();
 await page.evaluate(()=>window.__aiAction());
 assert.equal(await page.getByRole('region',{name:'AI action details'}).isVisible(),false);
 assert.equal(await page.getByRole('button',{name:'Show sector details'}).getAttribute('aria-expanded'),'false');
 await page.screenshot({path:`${output}/${width}-manual-close-preserved.png`});
 await page.getByRole('button',{name:'Follow AI',exact:true}).click();await page.getByRole('button',{name:'Follow AI',exact:true}).click();
 await page.getByRole('region',{name:'AI action details'}).waitFor();
 await page.getByRole('button',{name:/Hydran Progress Normal AI/}).click();
 await page.getByRole('button',{name:'Inspect Interceptor blueprint'}).click();
 await page.evaluate(()=>window.__aiAction());
 await page.getByRole('heading',{name:'Ship blueprints'}).waitFor();
 assert.equal(await page.getByRole('region',{name:'AI action details'}).isVisible(),false);
 assert.deepEqual(errors,[]);results.push({width,height,automaticPublicAction:true,manualCloseRetained:true,followCanResume:true,manualInspectionPreserved:true,errors});await page.close();
}}finally{await browser.close();}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
