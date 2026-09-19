import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(site).hostname))throw new Error('Local deterministic fixture only.');
const directory='coding_agents/second_dawn_reputation_notice_review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const[width,height]of[[1440,900],[390,844],[360,800]]){
  for(const improved of[true,false]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/__reputation-notice',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#07111a"><div id="fixture"></div></body></html>'}));
   await page.goto(`${site}/__reputation-notice`);
   await page.evaluate(async improved=>{
    const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
    const[{default:React},{default:ReactDOM},{default:Notice},{createGame},{getPlayerView},{default:EmpireOverview}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/ReputationSummary.tsx'),import('/shared/eclipse/setup.ts'),import('/shared/eclipse/protocol.ts'),import('/src/second-dawn-game/EmpireOverview.tsx'),import('/src/index.css')]);
    const state=createGame({seed:4,seats:[{id:'a',faction:'eridani',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}),view=getPlayerView(state,'a');
    view.private.reputationSummary={id:'review',round:4,battleId:'battle1',sectorId:view.sectors[0].id,drawn:improved?[1,3,4,2,4]:[1,2],selected:improved?4:null,kept:[4,4,3],returned:improved?[1,3,2,4,2]:[1,2]};
    function Host(){const[visible,setVisible]=React.useState(true);return React.createElement('main',{style:{padding:'16px',maxWidth:'100%',boxSizing:'border-box',fontFamily:'system-ui,sans-serif'}},visible?React.createElement(Notice,{view,onDismiss:()=>setVisible(false)}):React.createElement('p',{style:{color:'white'}},'Result dismissed'));}
    const root=ReactDOM.createRoot(document.getElementById('fixture'));root.render(React.createElement(Host));
    window.__showEmpire=seatId=>root.render(React.createElement(EmpireOverview,{view,seatId,onSector:()=>{},onNavigate:()=>{},onBlueprints:()=>{}}));
   },improved);
   const notice=page.getByRole('region',{name:'Your reputation result'});await notice.waitFor();
   await page.screenshot({path:`${directory}/${width}-${improved?'selected':'unchanged'}.png`});
   const overflow=await notice.evaluate(e=>e.scrollWidth>e.clientWidth||document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
   await page.getByText('Your reputation · 11 VP').click();
   await page.screenshot({path:`${directory}/${width}-${improved?'selected':'unchanged'}-collection.png`});
   await page.getByRole('button',{name:'Dismiss reputation result'}).click();await page.getByText('Result dismissed').waitFor();assert.deepEqual(errors,[]);
   if(improved){await page.evaluate(()=>window.__showEmpire('a'));await page.getByRole('button',{name:'Latest reputation draw'}).click();await page.getByRole('region',{name:'Your reputation result'}).scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/${width}-empire.png`});await page.evaluate(()=>window.__showEmpire('b'));assert.equal(await page.getByRole('button',{name:'Latest reputation draw'}).count(),0);assert.equal(await page.getByRole('region',{name:'Your reputation result'}).count(),0);}
   results.push({width,height,improved,horizontalOverflow:overflow,dismissed:true,empireReview:improved,opponentPrivateResultHidden:true,pageErrors:errors});await page.close();
  }
 }
 await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{await browser.close();}
