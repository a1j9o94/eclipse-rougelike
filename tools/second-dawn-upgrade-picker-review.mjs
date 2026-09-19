import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Use isolated local fixtures for this review.');
const output='coding_agents/second_dawn_upgrade_picker_review';await mkdir(output,{recursive:true});const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{for(const [width,height] of (engine==='chromium'?[[1440,900],[390,844],[360,800],[844,390],[422,195]]:[[390,844],[360,800],[844,390],[422,195]])){
  const page=await browser.newPage({viewport:{width,height:height<300?844:height},reducedMotion:'reduce',hasTouch:width<900});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${origin}/?position=opening#second-dawn-preview`);await page.locator('.dg-app').waitFor();
  if(await page.getByRole('button',{name:'Choose action',exact:true}).count()){await page.getByRole('button',{name:'Choose action',exact:true}).click();await page.getByRole('button',{name:/^Upgrade/}).click();}else await page.getByRole('button',{name:'Upgrade',exact:true}).click();
  await page.getByRole('navigation',{name:'Ship classes'}).getByRole('button',{name:'Interceptor',exact:true}).click();
  const slot=page.getByRole('button',{name:/^Slot 4:/});await slot.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${engine}-${width}-ship.png`});await slot.click();
  const dialog=page.getByRole('dialog',{name:'Interceptor · slot 4'});await dialog.waitFor();if(height<300)await page.setViewportSize({width,height});const box=await dialog.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1);
  const scroll=dialog.locator('.dg-part-picker-scroll');assert.ok(await scroll.evaluate(element=>element.scrollHeight>element.clientHeight));await page.screenshot({path:`${output}/${engine}-${width}-parts.png`});
  if(width===390){
   await dialog.evaluate(panel=>{const sizes=Array.from(panel.querySelectorAll('*')).filter(e=>e instanceof HTMLElement).map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize)}));for(const {e,size}of sizes){e.dataset.oldFontSize=e.style.fontSize;e.style.fontSize=`${size*2}px`;}});
   await page.screenshot({path:`${output}/${engine}-${width}-text-200.png`});assert.ok(await scroll.evaluate(e=>e.clientHeight>80));assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth),false);
   await dialog.evaluate(panel=>{for(const e of panel.querySelectorAll('[data-old-font-size]'))if(e instanceof HTMLElement){e.style.fontSize=e.dataset.oldFontSize??'';delete e.dataset.oldFontSize;}});
  }
  await dialog.getByRole('button',{name:'Defense',exact:true}).click();await dialog.getByRole('button',{name:'Install Hull in slot 4',exact:true}).click();await page.getByRole('button',{name:'Slot 4: Hull'}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('button',{name:'Slot 4: Hull'}).evaluate(element=>element===document.activeElement),true);
  if(height>=300)await page.getByRole('button',{name:'Apply 1 upgrade'}).scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${engine}-${width}-draft.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);results.push({engine,width,height,pickerWithinViewport:true,catalogScrolls:true,focusRestored:true,errors});await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
