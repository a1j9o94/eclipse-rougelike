import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5173';
const temporary='.second-dawn/recovery-review';
const dir='coding_agents/second_dawn_recovery_review';
await mkdir(temporary,{recursive:true});await mkdir(dir,{recursive:true});
await writeFile(`${temporary}/index.html`,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
await writeFile(`${temporary}/main.tsx`, `import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import HistoryPanel from '/src/second-dawn-game/HistoryPanel';
import GameMenuPanel from '/src/second-dawn-game/GameMenuPanel';
import RollbackDialog from '/src/second-dawn-game/RollbackDialog';
import '/src/index.css';
import '/src/second-dawn/second-dawn.css';
import '/src/second-dawn-game/game.css';
const entries=Array.from({length:14},(_,i)=>({revision:30-i,actorSeatId:i%2?'seat-2':'seat-1',actorName:i%2?'Hydran Progress':'Eridani Empire',round:3,summary:i%2?'Built 2 components':'Moved a cruiser',details:[],rollbackAvailable:i<12,...(i>=12?{rollbackUnavailableReason:'This older action has no saved checkpoint.'}:{})}));
function App(){const [menu,setMenu]=useState(false),[target,setTarget]=useState(null),[pending,setPending]=useState(null),[voter,setVoter]=useState(false),[open,setOpen]=useState(false),[result,setResult]=useState('');
const close=()=>{setTarget(null);setOpen(false);};
const status={isHost:!voter,revision:31,pending,lastResolution:null};
return <><main className="sd-app dg-app" style={{height:'100dvh',padding:'16px',boxSizing:'border-box',overflow:'hidden'}}><header style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14}}><button onClick={()=>setMenu(true)}>Game menu</button>{pending&&<button onClick={()=>{setVoter(true);setOpen(true);}}>Review as Hydran</button>}<span role="status">{result}</span></header><section style={{height:'calc(100% - 72px)',maxWidth:560,margin:'auto'}}><HistoryPanel feed={{entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}} rollback={{isHost:!voter,disabled:!!pending,onSelect:entry=>{setTarget(entry);setOpen(true);}}}/></section></main>{menu&&<GameMenuPanel outcome="abandoned" disabled={false} onClose={()=>setMenu(false)} onHome={()=>{setMenu(false);setResult('Home selected · game retained');}} onResign={()=>{setMenu(false);setResult('Quit selected');}}/>}{open&&<RollbackDialog status={status} target={target} viewerSeatId={voter?'seat-2':'seat-1'} seatNames={{'seat-1':'Eridani Empire · Adrian','seat-2':'Hydran Progress · Taylor'}} humanCount={2} disabled={false} onClose={close} onRequest={()=>{setPending({id:'review',targetRevision:target.revision,targetSummary:target.summary,requestedBySeatId:'seat-1',requiredSeatIds:['seat-2'],approvedSeatIds:[],createdAt:0});setTarget(null);}} onRespond={approve=>{setPending(null);setOpen(false);setResult(approve?'Undo approved':'Undo declined');}} onCancel={()=>{setPending(null);setOpen(false);setResult('Undo cancelled');}}/>}</>}
createRoot(document.getElementById('root')).render(<App/>);`);
const results=[];
for(const [engine,browserType] of Object.entries({chromium,webkit})){
 const browser=await browserType.launch();
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/${temporary}/index.html`);
  await page.getByRole('button',{name:'Game menu',exact:true}).click();
  await page.getByRole('button',{name:'Save & return home'}).click();
  await page.getByText('Home selected · game retained').waitFor();
  await page.getByRole('button',{name:'Game menu',exact:true}).click();
  await page.getByRole('button',{name:'Quit this game',exact:true}).click();
  await page.screenshot({path:`${dir}/${engine}-${width}-quit.png`});
  await page.getByRole('button',{name:'Keep playing',exact:true}).click();
  await page.getByRole('button',{name:'Close game menu'}).click();
  await page.getByRole('button',{name:'Undo to before this action'}).first().click();
  await page.screenshot({path:`${dir}/${engine}-${width}-request.png`});
  await page.getByRole('button',{name:'Request undo',exact:true}).focus();
  await page.keyboard.press('Tab');
  if(!await page.getByRole('button',{name:'Close undo game actions'}).evaluate(element=>element===document.activeElement))throw Error('Dialog focus escaped');
  await page.getByRole('button',{name:'Request undo',exact:true}).click();
  await page.screenshot({path:`${dir}/${engine}-${width}-waiting.png`});
  await page.getByRole('button',{name:'Close undo game actions'}).click();
  await page.getByRole('button',{name:'Review as Hydran'}).click();
  await page.getByRole('button',{name:'Approve undo'}).waitFor();
  await page.screenshot({path:`${dir}/${engine}-${width}-vote.png`});
  await page.getByRole('button',{name:'Keep current game',exact:true}).click();
  await page.getByText('Undo declined',{exact:true}).waitFor();
  const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  if(dimensions.width>width)throw Error('Horizontal overflow');if(errors.length)throw Error(errors.join('\n'));
  results.push({engine,width,savePreservesRun:true,quitCancelled:true,hostRequest:true,voteReopened:true,rejection:true,keyboardFocusTrapped:true,pageErrors:errors});await page.close();
 }
 await browser.close();
}
await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
