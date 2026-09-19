import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5198';
const directory=process.env.SOUND_REVIEW_DIR??'.second-dawn/sound-review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto(site);
 const result=await page.evaluate(async()=>{
  const {synthesizeAmbient,synthesizeCue}=await import('/src/second-dawn-game/sound/synthesis.ts');
  const render=async(kind)=>{
   const sampleRate=22050,length=kind==='ambient'?90:7,context=new OfflineAudioContext(1,sampleRate*length,sampleRate),gain=context.createGain();gain.gain.value=kind==='ambient'?.15:1;gain.connect(context.destination);
   if(kind==='ambient')synthesizeAmbient(context,gain);
   else{
    const cues=['selection','detent','confirm','tile','move','install','reject'];
    // Suspend offline time at each cue to render the same synthesis used in the game.
    for(let i=1;i<cues.length;i++)context.suspend(i).then(()=>{synthesizeCue(context,gain,cues[i],.35);void context.resume();});
    synthesizeCue(context,gain,cues[0],.35);
   }
   const buffer=await context.startRendering(),samples=buffer.getChannelData(0),bytes=new ArrayBuffer(44+samples.length*2),view=new DataView(bytes);
   const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};text(0,'RIFF');view.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
   let peak=0,squares=0,maxDelta=0;for(let i=0;i<samples.length;i++){const value=samples[i];peak=Math.max(peak,Math.abs(value));squares+=value*value;if(i)maxDelta=Math.max(maxDelta,Math.abs(value-samples[i-1]));view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,value))*32767),true);}
   const array=new Uint8Array(bytes),chunks=[];for(let offset=0;offset<array.length;offset+=32768)chunks.push(String.fromCharCode(...array.subarray(offset,offset+32768)));
   return {kind,sampleRate,seconds:length,peak,rms:Math.sqrt(squares/samples.length),maxDelta,firstSample:samples[0],lastSample:samples.at(-1),base64:btoa(chunks.join(''))};
  };
  return [await render('ambient'),await render('effects')];
 });
 const metrics=[];for(const {base64,...item} of result){assert.ok(item.peak>0&&item.peak<.2);assert.ok(item.maxDelta<.02);await writeFile(`${directory}/${item.kind}.wav`,Buffer.from(base64,'base64'));metrics.push(item);}
 await writeFile(`${directory}/render-metrics.json`,JSON.stringify(metrics,null,2));console.log(metrics);
}finally{await browser.close();}
