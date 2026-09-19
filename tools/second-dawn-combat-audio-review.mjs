import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
const directory='coding_agents/second_dawn_combat_audio_review';await mkdir(directory,{recursive:true});
await mkdir('.second-dawn/combat-audio',{recursive:true});
await writeFile('.second-dawn/combat-audio/harness.tsx',"import React,{useState} from 'react';\nimport {createRoot} from 'react-dom/client';\nimport Board from '/src/second-dawn-game/SecondDawnBoard';\nimport fixtures from '/src/second-dawn-game/reviewFixtures.json';\nimport {getPlayerView} from '/shared/eclipse/protocol';\nimport {legalCommands} from '/shared/eclipse/legal';\nimport {processGameCommand} from '/shared/eclipse/engine';\nimport {projectHistoryEntry} from '/shared/eclipse/history';\nimport '/src/index.css';\nconst initial=fixtures[new URLSearchParams(location.search).get('position')??'retreat'];const actor=initial.pendingDecision.owner;\nfunction Harness(){const [state,setState]=useState(initial),[entries,setEntries]=useState([]),[receipt,setReceipt]=useState();const view=getPlayerView(state,actor);return <Board view={view} candidates={legalCommands(view)} connected busy={false} status=\"\" lastAcceptedCommand={receipt} history={{entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder(){}}} onMenu={()=>{}} onSubmit={command=>{const result=processGameCommand(state,actor,command);if(!result.ok)throw Error(result.error.message);const revision=state.revision+1;setReceipt({revision,type:command.type});setEntries(previous=>[projectHistoryEntry({actor,request:{commandId:`browser-${revision}`,expectedRevision:state.revision,command},receipt:{commandId:`browser-${revision}`,revision,eventCount:result.events.length},events:result.events},state.seats,state.round,state),...previous]);setState({...result.state,revision});}}/>;}\ncreateRoot(document.getElementById('root')).render(<Harness/>);\n");
const results=[];
for(const browserType of [chromium,webkit]){
 const browser=await browserType.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.route('**/combat-audio-harness?**',route=>route.fulfill({contentType:'text/html',body:'<html><head><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/.second-dawn/combat-audio/harness.tsx"></script></body></html>'}));const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   localStorage.setItem('eclipse.second-dawn.effects.v1','on');localStorage.setItem('eclipse.second-dawn.dice3d.v1',new URLSearchParams(location.search).get('dice')==='on'?'on':'off');localStorage.setItem('eclipse.second-dawn.dice-sound.v1','off');
   window.combatAudioStarts=[];
   const original=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){window.combatAudioStarts.push({seconds:this.buffer?.duration??0,at:performance.now()});return original.apply(this,args);};
  });
  await page.goto(`${site}/combat-audio-harness?position=retreat`);
  await page.getByRole('button',{name:'Animations',exact:true}).click();
  await page.getByRole('button',{name:'Roll dice',exact:true}).click();
  await page.getByRole('button',{name:'Resolve volley',exact:true}).click();
  await page.waitForFunction(()=>window.combatAudioStarts.some(start=>Math.abs(start.seconds-.18)<.002));
  await page.waitForTimeout(500);
  const misses=await page.evaluate(()=>window.combatAudioStarts);
  assert.equal(misses.filter(start=>Math.abs(start.seconds-.18)<.002).length,1,'One live cannon cue');
  assert.equal(misses.filter(start=>start.seconds>=.2).length,0,'Miss produces no impact/explosion');
  await page.reload();await page.getByRole('button',{name:'Roll dice',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.combatAudioStarts),[],'Reload does not sound old combat');
  await page.goto(`${site}/combat-audio-harness?position=combat`);
  await page.getByRole('group',{name:'Volley targets'}).getByRole('button',{name:/^Target/}).first().click();
  await page.getByRole('button',{name:'Resolve volley',exact:true}).click();
  await page.waitForFunction(()=>window.combatAudioStarts.some(start=>Math.abs(start.seconds-.5)<.002));
  const destroyed=await page.evaluate(()=>window.combatAudioStarts);
  assert.equal(destroyed.filter(start=>Math.abs(start.seconds-.5)<.002).length,1,'One recorded destruction explosion');
  await page.goto(`${site}/combat-audio-harness?position=retreat&dice=on`);
  await page.getByRole('button',{name:'Roll dice',exact:true}).click();
  await page.getByRole('button',{name:'Resolve volley',exact:true}).click();
  const scene=page.getByRole('group',{name:'Volley firing and impacts'});await scene.waitFor();
  await page.waitForFunction(()=>window.combatAudioStarts.some(start=>Math.abs(start.seconds-.18)<.002));
  assert.equal(await scene.evaluate(node=>node.classList.contains('is-awaiting-dice')),false,'Cannon fires after dice settle');
  assert.equal((await page.evaluate(()=>window.combatAudioStarts)).filter(start=>Math.abs(start.seconds-.18)<.002).length,1);
  const rendering=await page.evaluate(async()=>{
   const {synthesizeCue}=await import('/src/second-dawn-game/sound/synthesis.ts');const rendered=[];
   for(const cue of ['cannon-fire','missile-launch','impact','explosion']){
    const context=new OfflineAudioContext(1,48000,48000);synthesizeCue(context,context.destination,cue,.35);const output=await context.startRendering();const samples=Array.from(output.getChannelData(0));
    rendered.push({cue,peak:Math.max(...samples.map(Math.abs)),rms:Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length),finite:samples.every(Number.isFinite),samples});
   }
   return rendered;
  });
  for(const effect of rendering){assert.ok(effect.finite&&effect.peak>0&&effect.peak<.3);if(browserType.name()==='chromium'){
   const wav=Buffer.alloc(44+effect.samples.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(effect.samples.length*2,40);effect.samples.forEach((sample,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+i*2));await writeFile(`${directory}/${effect.cue}.wav`,wav);
  }}
  assert.deepEqual(errors,[]);results.push({browser:browserType.name(),liveCannonStarts:misses.length,missHasNoImpact:true,liveDestruction:true,reloadSilent:true,animationsOffAudible:true,diceSettlementAudible:true,errors,rendering:rendering.map(effect=>({cue:effect.cue,peak:effect.peak,rms:effect.rms,finite:effect.finite}))});
 }finally{await browser.close();}
}
await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
