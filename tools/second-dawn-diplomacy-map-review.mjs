import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173').replace(/\/$/,'');
const directory=process.env.SECOND_DAWN_REVIEW_DIR??'coding_agents/second_dawn_diplomacy_map_review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 for(const [width,height] of [[1366,768],[1440,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${site}/?position=diplomacy#second-dawn-preview`);
  const science=page.getByRole('radio',{name:'Science',exact:true});await science.click();
  await page.getByRole('button',{name:'View galaxy',exact:true}).click();
  const map=page.getByRole('group',{name:'Galaxy map'});await map.waitFor();
  await page.getByRole('button',{name:'Fit',exact:true}).click();
  await page.screenshot({path:`${directory}/${width}-galaxy.png`,animations:'disabled'});
  // Sector keyboard activation avoids selecting the fleet button layered over it.
  const sector=map.getByRole('button',{name:/^Inspect sector /}).first();await sector.focus();await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('button',{name:'Build here',exact:true}).count(),0);
  if(width<600)await page.getByRole('button',{name:/^Expand Sector .* details$/}).click();
  await page.screenshot({path:`${directory}/${width}-map-inspection.png`,animations:'disabled'});
  if(width<600)await page.getByRole('button',{name:'Dismiss details',exact:true}).click();
  const back=page.getByRole('button',{name:width<600?'Return to decision':'Return to ambassador exchange',exact:true});
  const bounds=await back.boundingBox();assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=height,'Return is visible without scrolling');
  await back.click();assert.equal(await science.getAttribute('aria-checked'),'true');
  await page.screenshot({path:`${directory}/${width}-exchange-restored.png`,animations:'disabled'});
  if(width>=600){await page.getByRole('button',{name:'Explore',exact:true}).click();await map.waitFor();await back.click();assert.equal(await science.getAttribute('aria-checked'),'true');}
  else {await page.getByRole('navigation',{name:'Mobile game navigation'}).getByRole('button',{name:'Galaxy',exact:true}).click();await map.waitFor();await back.click();assert.equal(await science.getAttribute('aria-checked'),'true');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No document overflow');
  assert.deepEqual(errors,[]);results.push({width,height,mapInspection:true,draftPreserved:true,returnVisible:true,pageErrors:errors});await page.close();
 }
}finally{await browser.close();await writeFile(`${directory}/results.json`,JSON.stringify({site,results},null,2));}
console.log(JSON.stringify(results));
