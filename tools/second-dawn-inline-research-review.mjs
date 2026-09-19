import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Use isolated local fixtures for this review.');
const output='coding_agents/second_dawn_inline_research_review';await mkdir(output,{recursive:true});const results=[];
for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();try{for(const [width,height]of [[1440,900],[390,844],[360,800]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<900});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${origin}/?position=opening#second-dawn-preview`);await page.locator('.dg-app').waitFor();
  if(await page.getByRole('button',{name:'Choose action',exact:true}).count()){await page.getByRole('button',{name:'Choose action',exact:true}).click();await page.getByRole('button',{name:/^Research/}).click();}else await page.getByRole('button',{name:'Research',exact:true}).first().click();
  const card=page.getByRole('article',{name:'Orbital technology'});const tile=card.getByRole('button',{name:/Orbital ×/});await tile.evaluate(e=>e.scrollIntoView({block:'center'}));const before=await tile.boundingBox();await tile.click();
  const buy=card.getByRole('button',{name:/Research · [0-9]+ science/});await buy.waitFor();const after=await tile.boundingBox();const box=await buy.boundingBox();assert.ok(before&&after&&box);assert.ok(Math.abs(before.y-after.y)<100,`Selection unexpectedly jumped ${after.y-before.y}px`);await page.screenshot({path:`${output}/${engine}-${width}-selected.png`});assert.ok(box.y-(after.y+after.height)<110,`Confirm too far from selected tile: ${box.y-(after.y+after.height)}px`);
  await card.getByText('Change conversion',{exact:true}).click();await card.locator('.dg-funding').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${engine}-${width}-funding.png`});await card.getByText('Change conversion',{exact:true}).click();
  if(width===390){await card.evaluate(panel=>{const sizes=Array.from(panel.querySelectorAll('*')).filter(e=>e instanceof HTMLElement).map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize)}));for(const {e,size}of sizes){e.dataset.oldFontSize=e.style.fontSize;e.style.fontSize=`${size*2}px`;}});await buy.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${engine}-${width}-text-200.png`});assert.equal(await card.evaluate(e=>e.scrollWidth>e.clientWidth),false);await card.evaluate(panel=>{for(const e of panel.querySelectorAll('[data-old-font-size]'))if(e instanceof HTMLElement){e.style.fontSize=e.dataset.oldFontSize??'';delete e.dataset.oldFontSize;}});}
  await buy.click();await page.locator('.dg-research-workspace').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);results.push({engine,width,height,selectionShift:after.y-before.y,confirmationGap:box.y-(after.y+after.height),submitted:true,errors});await page.close();
 }}finally{await browser.close();}
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
