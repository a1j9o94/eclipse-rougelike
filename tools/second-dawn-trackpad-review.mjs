import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(site).hostname))throw new Error('Use local fixtures only.');
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${site}/?position=opening#second-dawn-preview`);
  const map=page.getByRole('group',{name:'Galaxy map'});await map.waitFor();
  const zoom=()=>page.getByLabel('Galaxy zoom').textContent();
  await page.getByRole('button',{name:'Fit',exact:true}).click();
  const wheel=async(ctrlKey=true)=>map.evaluate((svg,ctrlKey)=>{
   const box=svg.getBoundingClientRect();const event=new WheelEvent('wheel',{deltaY:-30,ctrlKey,clientX:box.x+box.width*.7,clientY:box.y+box.height*.5,bubbles:true,cancelable:true});svg.dispatchEvent(event);return event.defaultPrevented;
  },ctrlKey);
  assert.equal(await wheel(),true);await page.waitForTimeout(30);assert.equal(await zoom(),'135%');
  const camera=page.locator('[data-galaxy-camera]');
  const before=await camera.evaluate(el=>{const m=el.getScreenCTM();return {x:m.e,y:m.f};});
  const box=await map.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
  await page.mouse.wheel(75,110);
  await page.waitForFunction(({x,y})=>{const m=document.querySelector('[data-galaxy-camera]').getScreenCTM();return Math.abs(m.e-x)>50&&Math.abs(m.f-y)>80;},before);
  const after=await camera.evaluate(el=>{const m=el.getScreenCTM();return {x:m.e,y:m.f};});
  assert.ok(Math.abs(after.x-before.x+75)<2);assert.ok(Math.abs(after.y-before.y+110)<2);
  assert.equal(await zoom(),'135%');
  assert.equal(await wheel(false),true);assert.equal(await zoom(),'135%');
  assert.equal(await page.evaluate(()=>{const event=new WheelEvent('wheel',{deltaY:-30,ctrlKey:true,bubbles:true,cancelable:true});document.body.dispatchEvent(event);return event.defaultPrevented;}),false);
  await page.getByRole('button',{name:'Fit',exact:true}).click();
  const safari=(type,scale)=>map.evaluate((svg,{type,scale})=>{const box=svg.getBoundingClientRect();const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{scale,clientX:box.x+box.width*.7,clientY:box.y+box.height*.5});svg.dispatchEvent(event);return event.defaultPrevented;},{type,scale});
  assert.equal(await safari('gesturestart',1),true);await safari('gesturechange',1.5);await page.waitForTimeout(30);assert.equal(await zoom(),'150%');
  await wheel();assert.equal(await zoom(),'150%');await safari('gestureend',1.5);
  assert.deepEqual(errors,[]);console.log(`${name}: map-only ctrl-wheel zoom, two-axis wheel panning without zoom, outside-map scrolling, Safari gesture fallback and duplicate suppression passed.`);
 }finally{await browser.close();}
}
