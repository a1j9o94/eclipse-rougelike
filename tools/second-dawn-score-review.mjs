import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173').replace(/\/$/,'');
const directory=process.env.SECOND_DAWN_REVIEW_DIR??'coding_agents/second_dawn_score_review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${site}/?position=scoring#second-dawn-preview`);
  const standings=page.getByRole('region',{name:'Standings'});await standings.waitFor();
  assert.equal(await standings.getByRole('article').count(),6);
  for(const label of ['Play again','Return home','View final galaxy']){const button=page.getByRole('button',{name:label,exact:true});const box=await button.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<height,'Endgame control visible without scrolling');}
  await page.screenshot({path:`${directory}/${width}-final.png`,animations:'disabled'});
  const card=standings.getByRole('article').first();await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${directory}/${width}-score-card.png`,animations:'disabled'});
  await card.getByRole('button',{name:/^Sectors:/}).click();await page.getByRole('dialog',{name:'Public score inspection'}).waitFor();
  await page.getByRole('dialog',{name:'Public score inspection'}).getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'View final galaxy',exact:true}).click();await page.getByRole('group',{name:'Galaxy map'}).waitFor();
  await page.goto(`${site}/?position=midgame#second-dawn-preview`);
  await page.getByRole('button',{name:width<600?/Your public score/:/Your public VP/}).click();await standings.waitFor();
  assert.equal(await standings.getByRole('button',{name:'Reputation: Hidden until game end',exact:true}).count(),6);
  assert.equal(await page.getByRole('button',{name:'Play again',exact:true}).count(),0);
  await page.screenshot({path:`${directory}/${width}-public.png`,animations:'disabled'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({width,height,finalControlsVisible:true,finalMapAccessible:true,scoreSourcesInspectable:true,reputationHiddenUntilEnd:true,pageErrors:errors});await page.close();
 }
}finally{await browser.close();await writeFile(`${directory}/results.json`,JSON.stringify({site,results},null,2));}
console.log(JSON.stringify(results));
