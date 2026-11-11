import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function prepareFixture(root = process.cwd()) {
  const dir = path.join(root, '.second-dawn/maintainability');
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'index.html'),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>',
  );
  await writeFile(
    path.join(dir, 'fixture.tsx'),
    `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import Board from '/src/second-dawn-game/SecondDawnBoard';
import GameMenuPanel from '/src/second-dawn-game/GameMenuPanel';
import fixtures from '/src/second-dawn-game/reviewFixtures.json';
import {getPlayerView} from '/shared/eclipse/protocol';import {legalCommands} from '/shared/eclipse/legal';
import {processGameCommand} from '/shared/eclipse/engine';import '/src/index.css';
for(const name of ['ambient','effects','dice-sound','dice3d','motion'])localStorage.setItem('eclipse.second-dawn.'+name+'.v1','off');
const params=new URLSearchParams(location.search),fixture=params.get('fixture')||'opening';
if(!fixtures[fixture])throw new Error('Unknown required fixture: '+fixture);
function Harness(){
 const [state,setState]=useState(()=>structuredClone(fixtures[fixture]));
 const [receipt,setReceipt]=useState(undefined),[trace,setTrace]=useState([]),[menu,setMenu]=useState(false);
 const [actor]=useState(()=>params.get('actor')||state.pendingDecision?.owner||state.activeSeatId||state.seats[0].id);
 const view=getPlayerView(state,actor);
 const submit=command=>{const result=processGameCommand(state,actor,command);setTrace(t=>[...t,{command,ok:result.ok,...(result.ok?{state:result.state}:{error:result.error})}]);if(result.ok){const revision=state.revision+1;setState({...result.state,revision});setReceipt({revision,type:command.type});}};
 return <><Board view={view} candidates={legalCommands(view)} matchId={'maintainability-'+fixture+'-'+(params.get('session')||'default')} lastAcceptedCommand={receipt} connected busy={false} status="Engine fixture review" onSubmit={submit} onMenu={()=>setMenu(true)}/>{menu&&<GameMenuPanel disabled={false} onHome={()=>{}} onClose={()=>setMenu(false)}/>}<output id="fixture-proof" hidden>{JSON.stringify({fixture,revision:state.revision,actor,legal:legalCommands(view).map(c=>c.command),trace})}</output></>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Harness/></React.StrictMode>);
`,
  );
  await writeFile(
    path.join(dir, 'frame.html'),
    `<!doctype html><html><head><style>html,body{margin:0;padding:0}iframe{display:block;border:0}</style></head><body><script>const p=new URLSearchParams(location.search),f=document.createElement('iframe');f.width=p.get('width')||390;f.height=p.get('height')||844;f.title='Game viewport';f.src='./index.html?'+p.toString();f.style.transformOrigin='top left';f.style.transform='scale('+Math.min(1,1300/Number(f.width),900/Number(f.height))+')';document.body.append(f);</script></body></html>`,
  );
  return '/.second-dawn/maintainability/index.html';
}
if (process.argv[1] === new URL(import.meta.url).pathname) await prepareFixture(process.argv[2]);
