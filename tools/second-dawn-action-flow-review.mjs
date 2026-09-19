import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(site).hostname))throw new Error('Local deterministic engine fixture only.');
const output='coding_agents/second_dawn_action_flow_review';await mkdir(output,{recursive:true});
const results=[];
for(const [browserName,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();
 try{
  for(const [width,height] of [[390,844],[1440,900]]){
   for(const action of ['upgrade','research','move']){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/__action-flow',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));
    await page.goto(`${site}/__action-flow`);
    await page.evaluate(async action=>{
     const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
     const [{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView},{legalCommands},{processGameCommand}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/shared/eclipse/legal.ts'),import('/shared/eclipse/engine.ts'),import('/src/index.css')]);
     window.__commands=[];
     function Host(){
      const[state,setState]=React.useState(()=>{const s=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'human'}]});s.activeSeatId='a';s.engine.action={owner:'a',action,remaining:1};s.seats[0].resources.science=50;s.technologyMarket=['improved-hull'];if(action==='move')s.sectors.forEach(sector=>{sector.portalVp=1;});return s;}),[receipt,setReceipt]=React.useState();
      const view=getPlayerView(state,'a');window.__actionFlowResult={active:view.activeSeatId,revision:view.revision,progress:view.actionProgress,pending:view.pendingDecision?.kind??null};window.__targetTile=view.sectors.find(s=>!s.owner).tileId;
      return React.createElement(Board,{view,candidates:legalCommands(view),connected:true,busy:false,status:'Saved',onMenu:()=>{},lastAcceptedCommand:receipt,onSubmit:command=>{const result=processGameCommand(state,'a',command);window.__commands.push({type:command.type,ok:result.ok});if(!result.ok)throw new Error(result.error.message);const revision=state.revision+1;setState({...result.state,revision});setReceipt({revision,type:command.type});}});
     }
     ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
    },action);
    const label=action[0].toUpperCase()+action.slice(1);
    if(width<600){await page.getByRole('button',{name:'Choose action',exact:true}).click();await page.getByRole('group',{name:'Choose your action'}).getByRole('button',{name:new RegExp(`^${label}`)}).click();}
    else await page.getByRole('button',{name:label,exact:true}).first().click();
    if(action==='upgrade'){
     await page.getByRole('heading',{name:/^Edit interceptor$/i}).waitFor();
     const slot=page.getByRole('button',{name:'Slot 4: Empty slot'});await slot.click();
     await page.getByRole('dialog',{name:'Interceptor · slot 4'}).waitFor();
     await page.getByRole('navigation',{name:'Component functions'}).getByRole('button',{name:'Defense',exact:true}).click();
     await page.getByRole('button',{name:'Install Hull in slot 4',exact:true}).click();
     assert.equal(await page.getByRole('dialog').count(),0);
     assert.deepEqual(await page.evaluate(()=>window.__commands),[]);
     const bounds=await page.getByRole('button',{name:'Slot 4: Hull'}).boundingBox();assert.ok(bounds.width>=100&&bounds.height>=90,'Hardpoint remains a usable card');
     await page.screenshot({path:`${output}/${browserName}-${width}-upgrade-draft.png`});
     await page.getByRole('button',{name:'Apply 1 upgrade',exact:true}).click();
    }else if(action==='research'){
     await page.getByRole('button',{name:/^Improved Hull/}).first().click();
     await page.screenshot({path:`${output}/${browserName}-${width}-research-preview.png`});
     await page.getByRole('button',{name:/^Research ·/ }).click();
    }else{
     if(width<600)await page.getByRole('button',{name:'Expand Move details'}).click();
     await page.getByRole('checkbox',{name:'Interceptor 1'}).check();
     if(width<600)await page.getByRole('button',{name:'Collapse Move details'}).click();
     const tile=await page.evaluate(()=>window.__targetTile);
     if(width<600){await page.getByRole('button',{name:'Sectors',exact:true}).click();await page.getByRole('region',{name:'Galaxy sector list'}).getByRole('button',{name:new RegExp(`^Sector ${tile}\\b`)}).click();}
     else await page.getByRole('button',{name:new RegExp(`^Inspect sector ${tile},`)}).first().click();
     if(width<600&&await page.getByRole('button',{name:'Expand Move details'}).isVisible())await page.getByRole('button',{name:'Expand Move details'}).click();
     await page.getByRole('button',{name:/^Execute 1 route/}).click();
    }
    await page.waitForFunction(()=>window.__actionFlowResult.active==='b');
    await page.getByRole('group',{name:'Galaxy map'}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.__commands),[{type:action,ok:true}]);
    assert.equal((await page.evaluate(()=>window.__actionFlowResult)).progress,null);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`${output}/${browserName}-${width}-${action}-complete.png`});
    results.push({browser:browserName,width,height,action,submissions:1,automaticHandoff:true,pageErrors:errors});
    await writeFile(`${output}/results.json`,JSON.stringify({evidence:'Actual production components with deterministic pure engine; browser touch emulation, not physical device testing. No cloud writes.',results},null,2));
    console.log(`${browserName} ${width}: ${action} accepted once and advanced automatically.`);await page.close();
   }
  }
 }finally{await browser.close();}
}
