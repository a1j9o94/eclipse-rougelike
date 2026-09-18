import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175';
if(!['127.0.0.1','localhost'].includes(new URL(site).hostname))throw new Error('Local production-component fixture only.');
const directory='coding_agents/second_dawn_mobile_draft_browser';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__mobile-draft-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mobile draft fixture</title></head><body><div id="fixture"></div></body></html>'}));
 const mount=async()=>page.evaluate(async()=>{
  const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
  const[{default:React},{default:ReactDOM},{default:Board},{createGame},{getPlayerView},{legalCommands},{processGameCommand}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/SecondDawnBoard.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/shared/eclipse/legal.ts'),import('/shared/eclipse/engine.ts'),import('/src/index.css'),import('/src/second-dawn/second-dawn.css'),import('/src/second-dawn-game/game.css'),import('/src/second-dawn-game/itemDetails.css')]);
  window.__submissions=[];function Host(){
   const[state,setState]=React.useState(()=>{const value=createGame({seed:4,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});value.activeSeatId='a';value.seats[0].resources.materials=20;return value;}),[accepted,setAccepted]=React.useState();
   window.__bumpRevision=()=>setState(value=>({...value,revision:value.revision+1}));const view=getPlayerView(state,'a');
   return React.createElement(Board,{matchId:'mobile-draft-fixture',view,candidates:legalCommands(view),connected:true,busy:false,status:'Deterministic fixture',onMenu:()=>{},lastAcceptedCommand:accepted,onSubmit:command=>{const result=processGameCommand(state,'a',command);window.__submissions.push({type:command.type,accepted:result.ok});if(result.ok){const revision=state.revision+1;setState({...result.state,revision});setAccepted({revision,type:command.type});}}});
  }ReactDOM.createRoot(document.getElementById('fixture')).render(React.createElement(Host));
 });
 await page.goto(`${site}/__mobile-draft-fixture`);await mount();await page.getByRole('button',{name:'Zoom in'}).click();await page.getByRole('button',{name:'Zoom in'}).click();
 const readCamera=async()=>(await page.locator('[data-galaxy-camera]').getAttribute('transform')).match(/scale\(.+$/)[0];
 const camera=await readCamera();
 await page.getByRole('button',{name:'Empire',exact:true}).click();await page.getByRole('button',{name:'Research technologies'}).click();await page.getByRole('heading',{name:'Research',exact:true}).waitFor();
 await page.getByRole('button',{name:'Galaxy',exact:true}).click();assert.equal(await readCamera(),camera);
 await page.setViewportSize({width:844,height:390});await page.setViewportSize({width:390,height:844});assert.equal(await readCamera(),camera);
 await page.reload();await mount();await page.getByRole('button',{name:'Sectors',exact:true}).waitFor();assert.equal(await readCamera(),camera,'Camera survives actual reload via match/seat draft storage.');
 await page.getByRole('button',{name:'Choose action',exact:true}).click();await page.getByRole('button',{name:/^Build /}).click();
 await page.getByRole('button',{name:'Sectors',exact:true}).click();await page.getByRole('region',{name:'Galaxy sector list'}).getByRole('button',{name:/Terran Directorate/}).click();
 await page.getByRole('button',{name:'Add cruiser',exact:false}).click();
 await page.screenshot({path:`${directory}/390-build-draft.png`});
 assert.deepEqual(await page.evaluate(()=>window.__submissions),[]);
 await page.reload();await mount();await page.getByRole('dialog').waitFor();
 await page.evaluate(()=>window.__bumpRevision());await page.getByText('The board changed. Review your saved choices and current costs before confirming.').first().waitFor();
 const confirm=page.getByRole('button',{name:/^Confirm build/});assert.ok(await confirm.isDisabled());assert.deepEqual(await page.evaluate(()=>window.__submissions),[]);
 await page.screenshot({path:`${directory}/390-stale-build.png`});
 await page.getByRole('dialog').getByRole('button',{name:'I’ve reviewed my draft'}).click();assert.ok(await confirm.isEnabled());await confirm.click();
 assert.deepEqual(await page.evaluate(()=>window.__submissions),[{type:'build',accepted:true}]);
 assert.deepEqual(errors,[]);
 await writeFile(`${directory}/result.json`,JSON.stringify({checkedAt:new Date().toISOString(),cameraResearchGalaxy:true,cameraRotation:true,cameraReload:true,buildDraftReload:true,staleConfirmationBlocked:true,reviewedLegalSubmission:true,pageErrors:errors,evidence:'Actual production Board with deterministic pure-engine fixture and local match/seat draft storage. No cloud state mutated.'},null,2));
 console.log('Integrated mobile camera and build draft reload/review guard passed.');
}finally{await browser.close();}
