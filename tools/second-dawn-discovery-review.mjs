import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const site=process.env.SECOND_DAWN_SITE_URL ?? 'http://127.0.0.1:5175/';
const directory='coding_agents/second_dawn_discovery_workflow_review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const results=[];
try {
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${site.replace(/\/$/,'')}/#second-dawn-preview`);
  const reset=async()=>{await page.getByLabel('Review position').selectOption('opening');await page.getByLabel('Review position').selectOption('discovery');await page.getByRole('heading',{name:'Conformal Drive',exact:true}).waitFor();};
  await reset();assert.equal(await page.getByRole('button',{name:'Confirm discovery'}).isDisabled(),true);
  const stats=page.locator('.dg-discovery-reward').first();
  assert.equal(await stats.getByRole('img',{name:/movement: 4/i}).count(),1);
  assert.equal(await stats.getByRole('img',{name:/initiative: \+2/i}).count(),1);
  const use=page.getByRole('radio',{name:'Use Conformal Drive'}),keep=page.getByRole('radio',{name:'Keep for 2 VP'});
  await use.focus();await page.keyboard.press('Space');assert.equal(await use.isChecked(),true);await page.keyboard.press('ArrowRight');assert.equal(await keep.isChecked(),true);await page.keyboard.press('ArrowLeft');assert.equal(await use.isChecked(),true);
  const fits=await page.getByRole('button',{name:'Confirm discovery'}).evaluate(el=>{const rect=el.getBoundingClientRect();for(let p=el.parentElement;p;p=p.parentElement){if(/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)){const b=p.getBoundingClientRect();if(rect.bottom>b.bottom+1||rect.top<b.top-1)return false;}}return rect.bottom<=innerHeight;});assert.equal(fits,true);
  await page.screenshot({path:`${directory}/${width}x${height}-discovery.png`,animations:'disabled'});
  await page.getByRole('button',{name:'Confirm discovery'}).click();await page.getByRole('heading',{name:'Conformal Drive',exact:true}).waitFor();await page.getByRole('button',{name:'Store for later',exact:true}).waitFor();
  await reset();const score=page.getByRole('button',{name:/Your public VP/});const before=Number((await score.innerText()).match(/\d+/)[0]);
  await keep.check();await page.getByRole('button',{name:'Confirm discovery'}).click();await page.getByRole('heading',{name:'Conformal Drive',exact:true}).waitFor({state:'hidden'});
  assert.equal(Number((await score.innerText()).match(/\d+/)[0]),before+2);assert.deepEqual(errors,[]);
  results.push({width,height,statsVisible:true,keyboardSelection:true,confirmationFits:true,useOpensPartPlacement:true,keepAddsTwoPublicVP:true,pageErrors:errors});await page.close();
 }
}finally{await browser.close();}
await writeFile(`${directory}/results.json`,JSON.stringify({site,evidence:'Agent browser automation, not human playtest',results},null,2));console.log('Discovery reveal, keyboard choices, placement follow-up and 2 VP scoring passed at all three desktop sizes.');
