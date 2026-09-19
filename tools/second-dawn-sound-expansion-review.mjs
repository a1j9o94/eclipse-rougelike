import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5198';
const directory=process.env.SOUND_REVIEW_DIR??'.second-dawn/sound-review';
await mkdir(directory,{recursive:true});const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  const preview=await browser.newPage();
  await preview.addInitScript(()=>localStorage.setItem('eclipse.second-dawn.dice-sound.v1','off'));
  await preview.goto(`${site}/?position=opening#second-dawn-preview`);
  await preview.getByRole('button',{name:'Settings',exact:true}).click();
  await preview.getByRole('button',{name:'Preview ambient music',exact:true}).click();
  await preview.getByRole('button',{name:'Stop music preview',exact:true}).waitFor();
  assert.equal(await preview.getByRole('checkbox',{name:/Ambient music/}).isChecked(),false);
  await preview.getByRole('button',{name:'Preview ambient music',exact:true}).waitFor({timeout:10000});
  results.push({browser:name,previewFromAllMuted:true,previewAutoStops:true});await preview.close();
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.soundReview={contexts:0,starts:[],ended:0,peak:0};
    const Original=window.AudioContext??window.webkitAudioContext;
    if(!Original)return;
    window.AudioContext=class extends Original{
     constructor(...args){super(...args);window.soundReview.contexts++;this.reviewAnalyser=this.createAnalyser();this.reviewAnalyser.fftSize=512;const data=new Float32Array(512);setInterval(()=>{this.reviewAnalyser.getFloatTimeDomainData(data);for(const value of data)window.soundReview.peak=Math.max(window.soundReview.peak,Math.abs(value));},15);}
     createDynamicsCompressor(){const node=super.createDynamicsCompressor();node.connect(this.reviewAnalyser);return node;}
     createOscillator(){const node=super.createOscillator(),start=node.start.bind(node);node.start=(...args)=>{window.soundReview.starts.push({frequency:node.frequency.value,time:performance.now(),state:this.state});node.addEventListener('ended',()=>window.soundReview.ended++);return start(...args);};return node;}
    };
   });
   await page.goto(`${site}/?position=exploration#second-dawn-preview`);
   const settings=page.getByRole('button',{name:width===390?'Game settings':'Settings',exact:true});await settings.click();
   let dialog=page.getByRole('dialog',{name:'Game settings'});
   assert.equal(await dialog.getByRole('checkbox',{name:/Game effects/}).isChecked(),false);
   assert.equal(await dialog.getByRole('checkbox',{name:/Ambient music/}).isChecked(),false);
   assert.equal(await dialog.getByRole('slider',{name:'Game effects volume'}).inputValue(),'35');
   assert.equal(await dialog.getByRole('slider',{name:'Ambient music volume'}).inputValue(),'15');
   assert.equal((await page.evaluate(()=>window.soundReview)).starts.length,0);
   await dialog.getByRole('checkbox',{name:/Dice sounds/}).uncheck();
   await dialog.getByRole('checkbox',{name:/Game effects/}).check();
   await dialog.getByRole('button',{name:'Preview game effects'}).click();
   await page.waitForTimeout(200);
   assert.ok((await page.evaluate(()=>window.soundReview)).starts.length>0);
   await dialog.getByRole('checkbox',{name:/Ambient music/}).check();
   await page.waitForTimeout(3500);
   const playing=await page.evaluate(()=>window.soundReview);assert.equal(playing.contexts,1);assert.ok(playing.peak>0);assert.ok(playing.starts.every(item=>item.state==='running'));
   await dialog.getByRole('slider',{name:'Ambient music volume'}).fill('10');
   await dialog.getByRole('slider',{name:'Game effects volume'}).fill('25');
   await dialog.getByRole('checkbox',{name:/Ambient music/}).scrollIntoViewIfNeeded();
   await page.screenshot({path:`${directory}/${name}-${width}-sound-settings.png`});
   await dialog.getByRole('checkbox',{name:/Ambient music/}).uncheck();
   await dialog.getByRole('button',{name:'Close settings'}).click();
   const beforeRotate=(await page.evaluate(()=>window.soundReview)).starts.length;
   await page.getByRole('button',{name:'Rotate clockwise',exact:true}).click();await page.waitForTimeout(120);
   assert.equal((await page.evaluate(()=>window.soundReview)).starts.length,beforeRotate+1,'One detent, no generic click');
   await page.getByRole('button',{name:'Rotate counterclockwise',exact:true}).click();await page.waitForTimeout(120);
   const beforePlace=(await page.evaluate(()=>window.soundReview)).starts.length;
   await page.getByRole('button',{name:'Place sector',exact:true}).click();await page.waitForTimeout(200);
   assert.equal((await page.evaluate(()=>window.soundReview)).starts.length,beforePlace+1,'One accepted tile placement, no generic click');
   await settings.click();dialog=page.getByRole('dialog',{name:'Game settings'});
   await dialog.getByRole('button',{name:'Preview ambient music',exact:true}).click();await page.waitForTimeout(100);
   await dialog.getByRole('button',{name:'Close settings'}).click();await page.waitForTimeout(200);
   const afterClose=await page.evaluate(()=>window.soundReview);assert.equal(afterClose.starts.length,afterClose.ended,'Closing settings cancels its preview');
   await settings.click();dialog=page.getByRole('dialog',{name:'Game settings'});
   await dialog.getByRole('checkbox',{name:/Ambient music/}).check();await page.waitForTimeout(200);
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(200);
   const hidden=await page.evaluate(()=>window.soundReview);assert.equal(hidden.starts.length,hidden.ended,'Hidden document stops all voices');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(200);
   const resumed=await page.evaluate(()=>window.soundReview);assert.equal(resumed.starts.length-hidden.starts.length,4,'Visibility resumes only a fresh four-voice music bed');
   await page.evaluate(()=>{window.location.hash='';});await page.waitForTimeout(500);
   const left=await page.evaluate(()=>window.soundReview);assert.equal(left.starts.length,left.ended,'Leaving match cancels music');
   await page.goto(`${site}/?position=exploration#second-dawn-preview`);
   await settings.click();dialog=page.getByRole('dialog',{name:'Game settings'});await dialog.getByRole('checkbox',{name:/Ambient music/}).uncheck();
   await page.reload();await settings.click();dialog=page.getByRole('dialog',{name:'Game settings'});assert.equal(await dialog.getByRole('slider',{name:'Game effects volume'}).inputValue(),'25');assert.equal(await dialog.getByRole('slider',{name:'Ambient music volume'}).inputValue(),'10');
   assert.equal(await dialog.getByRole('checkbox',{name:/Ambient music/}).isChecked(),false);
   assert.deepEqual(errors,[]);results.push({browser:name,width,...playing,errors,preferencesPersist:true,rotationOneCue:true,acceptedPlacementOneCue:true,hiddenStops:true,leaveStops:true});await page.close();
  }
 }finally{await browser.close();}
}
await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
