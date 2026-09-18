import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const directory='coding_agents/second_dawn_ai_action_panel_review';
await mkdir(directory,{recursive:true});
const fixtures=JSON.parse(await readFile('src/second-dawn-game/reviewFixtures.json','utf8'));
const state=fixtures.midgame;
state.activeSeatId=state.seats[1].id;state.pendingDecision=null;state.waitingFor=null;state.actionProgress=null;
const actor=state.seats[1],sector=state.sectors.find(s=>s.owner===actor.id);
const entries=[
 {kind:'research',summary:'Researched Gluon Computer',presentation:{kind:'research',technologyId:'gluon-computer'}},
 {kind:'upgrade',summary:'Upgraded ship blueprints',presentation:{kind:'upgrade',shipTypes:['interceptor','cruiser']}},
 {kind:'build',summary:'Built 3 components',presentation:{kind:'build',sectorIds:[sector.id],components:[{type:'cruiser',count:2},{type:'orbital',count:1}]}},
 {kind:'move',summary:'Moved 1 ship',presentation:{kind:'move',sectorIds:[sector.id],shipIds:state.ships.filter(s=>s.owner===actor.id).map(s=>s.id)}}
];
const browser=await chromium.launch();const results=[];
for(const [width,height]of[[1366,768],[1440,900]]){
 for(const entry of entries){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto('http://127.0.0.1:5175/#second-dawn-preview');
  await page.getByLabel('Review position').waitFor();
  await page.evaluate(async({state,entry})=>{
   const main=await(await fetch('/src/main.tsx')).text();
   const reactPath=main.match(/from "([^"\n]*\/react\.js\?[^"\n]*)"/)[1],domPath=main.match(/from "([^"\n]*\/react-dom_client\.js\?[^"\n]*)"/)[1];
   const React=(await import(reactPath)).default,{createRoot}=(await import(domPath)).default;
   const{default:Board}=await import('/src/second-dawn-game/SecondDawnBoard.tsx');
   const{getPlayerView}=await import('/shared/eclipse/protocol.ts');
   document.getElementById('root').remove();const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
   const view=getPlayerView(state,state.seats[0].id);const revision=view.revision;
   const props={view,candidates:[],connected:true,busy:false,status:'Isolated public action presentation fixture',onSubmit:()=>{},history:{entries:[],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}};
   root.render(React.createElement(Board,props));
   await new Promise(resolve=>setTimeout(resolve,100));
   root.render(React.createElement(Board,{...props,view:{...view,revision:revision+1},history:{...props.history,entries:[{revision:revision+1,actorSeatId:state.seats[1].id,actorName:'Hydran Progress',round:state.round,summary:entry.summary,details:[],presentation:entry.presentation}]}}));
  },{state,entry});
  await page.getByRole('region',{name:'AI action details'}).waitFor();
  await page.screenshot({path:`${directory}/${width}x${height}-${entry.kind}.png`,animations:'disabled'});
  results.push({width,height,kind:entry.kind,...await page.getByRole('region',{name:'AI action details'}).evaluate(panel=>({panelWidth:panel.getBoundingClientRect().width,scrollWidth:panel.scrollWidth,scrollContainerHeight:panel.closest('.sd-inspector').clientHeight,scrollContainerContentHeight:panel.closest('.sd-inspector').scrollHeight,buttons:[...panel.querySelectorAll('button')].map(b=>b.getAttribute('aria-label'))}))});
  await page.close();
 }
}
await browser.close();await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
