import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175';const dir='coding_agents/second_dawn_mobile_decisions_review';await mkdir(dir,{recursive:true});
const browser=await chromium.launch();const errors=[],results=[];
for(const[width,height]of[[360,800],[390,844],[430,932]]){
const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
for(const position of ['exploration','discovery','control','bankruptcy','reputation','population-return','resource-reward','portal-placement','retreat','bombardment','scoring','workflow-diplomacy']){
 await page.goto(`${site}/?position=${position}#second-dawn-preview`);await page.getByLabel('Review position').waitFor();await page.waitForTimeout(100);
 await page.screenshot({path:`${dir}/${width}-${position}.png`,animations:'disabled'});
 const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('.sd-workspace h1')?.textContent,workspaceWidth:document.querySelector('.sd-workspace')?.clientWidth,workspaceContentWidth:document.querySelector('.sd-workspace')?.scrollWidth,overflowing:[...document.querySelectorAll('.sd-workspace *')].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+1||b.left< -1);}).slice(0,10).map(el=>({tag:el.tagName,className:el.className}))}));
 if(position==='exploration'){
  const diagram=await page.getByRole('region',{name:'Exploration placement preview'}).boundingBox();
  assert.ok(diagram.height>=240,`Exploration diagram too small: ${diagram.height}px`);
  assert.ok(await page.locator('.dg-connections-scroll').evaluate(el=>el.clientHeight>=100),'Exploration connection details must not collapse');
 }
 results.push({position,height,...metrics});
}
await page.close();
}
await browser.close();await writeFile(`${dir}/results.json`,JSON.stringify({site,results,pageErrors:errors},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify(results));
