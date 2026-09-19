import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
const directory=process.env.DICE_REVIEW_DIR??'coding_agents/second_dawn_dice_sound_review';
await mkdir(directory,{recursive:true});const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch(name==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
 try{
 for(const scenario of ['animated','sound-only','muted','zero','skip','minimize']){
  const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(({scenario})=>{
   localStorage.setItem('eclipse.second-dawn.motion.v1',scenario==='sound-only'?'off':'on');
   localStorage.setItem('eclipse.second-dawn.dice-sound.v1',scenario==='muted'?'off':'on');
   localStorage.setItem('eclipse.second-dawn.dice-volume.v1',scenario==='zero'?'0':'.6');
   window.audioReview={starts:[],stops:0,peak:0};
   const Original=window.AudioContext;
   if(!Original)return;
   window.AudioContext=class extends Original{
    constructor(...args){super(...args);const analyser=this.createAnalyser();analyser.fftSize=256;this.reviewAnalyser=analyser;const data=new Float32Array(256);setInterval(()=>{analyser.getFloatTimeDomainData(data);for(const value of data)window.audioReview.peak=Math.max(window.audioReview.peak,Math.abs(value));},10);}
    createDynamicsCompressor(){const node=super.createDynamicsCompressor();node.connect(this.reviewAnalyser);return node;}
    createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source);source.start=(...args)=>{window.audioReview.starts.push({time:performance.now(),state:this.state});return start(...args);};source.stop=(...args)=>{window.audioReview.stops++;return stop(...args);};return source;}
   };
  },{scenario});
  await page.goto(`${site}/?position=retreat#second-dawn-preview`);
  await page.getByRole('button',{name:'Roll dice',exact:true}).click();
  if(scenario==='skip'||scenario==='minimize'){
   const skip=page.getByRole('button',{name:scenario==='minimize'?'Minimize combat allocation':'Skip dice animation',exact:true});await skip.waitFor({state:'visible'});await page.waitForFunction(()=>window.audioReview.starts.length>0);await skip.click();
   const starts=await page.evaluate(()=>window.audioReview.starts.length);await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.audioReview.starts.length),starts,'Skip stops future impacts');
  }else if(scenario==='animated'){await page.locator('.dg-dice-overlay').waitFor({state:'visible'});await page.locator('.dg-dice-overlay').waitFor({state:'hidden'});await page.waitForTimeout(180);}else await page.waitForTimeout(1900);
  const audio=await page.evaluate(()=>window.audioReview);
  if(scenario==='muted'||scenario==='zero'){assert.equal(audio.starts.length,0);}else{assert.ok(audio.starts.length>0,`${name}/${scenario}: audio sources should start`);assert.ok(audio.starts.every(start=>start.state==='running'),'Gesture unlock runs audio');assert.ok(audio.peak>0,'Real Web Audio output should be nonzero');}
  if(scenario==='sound-only')assert.equal(await page.locator('.dg-dice-overlay').count(),0);
  assert.deepEqual(errors,[]);results.push({browser:name,scenario,...audio,pageErrors:errors});await page.close();
 }
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},hasTouch:width===390});
  await page.goto(`${site}/?position=opening#second-dawn-preview`);
  await page.getByRole('button',{name:width<600?'Game settings':'Settings',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Game settings'});
  await dialog.getByRole('checkbox',{name:/Auto-pass unless attacked/}).check();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.dg-presentation-settings input[type=checkbox]')).at(-1)?.checked===true);
  await dialog.getByRole('checkbox',{name:/Follow AI/}).uncheck();
  await dialog.getByRole('checkbox',{name:/Dice sounds/}).uncheck();assert.equal(await dialog.getByRole('slider',{name:'Dice volume'}).isDisabled(),true);
  await dialog.getByRole('checkbox',{name:/Dice sounds/}).check();await dialog.getByRole('slider',{name:'Dice volume'}).fill('25');
  await dialog.evaluate(element=>{element.scrollTop=0;});await page.screenshot({path:`${directory}/${name}-${width}-settings.png`});
  await dialog.getByRole('checkbox',{name:/Auto-pass unless attacked/}).scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/${name}-${width}-settings-pass.png`});
  await page.reload();await page.getByRole('button',{name:width<600?'Game settings':'Settings',exact:true}).click();assert.equal(await page.getByRole('slider',{name:'Dice volume'}).inputValue(),'25');assert.equal(await page.getByRole('checkbox',{name:/Follow AI/}).isChecked(),false);
  results.push({browser:name,width,settingsSaved:true});await page.close();
 }
 }finally{await browser.close();}
}
await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
