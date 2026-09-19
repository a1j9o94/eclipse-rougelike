import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(site).hostname))throw new Error('Local preview fixtures only.');
const directory='coding_agents/second_dawn_empire_overview_review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[390,844],[360,800]]){
  const mobile=width<700,page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${site}/?position=midgame#second-dawn-preview`);
  if(mobile)await page.getByRole('button',{name:'Empire',exact:true}).click();else await page.locator('.sd-player').first().click();
  await page.locator('.eo-overview').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${directory}/${width}x${height}-own.png`});
  for(const [name,selector] of [['fleet','.eo-fleet'],['abilities','.eo-abilities'],['knowledge','.eo-research']]){
   await page.locator(selector).scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/${width}x${height}-${name}.png`});
  }
  await page.getByRole('button',{name:'Inspect Cruiser blueprint',exact:true}).click();
  assert.equal(await page.locator('.eo-overview').count(),0);
  if(mobile){await page.getByRole('button',{name:'Players',exact:true}).click();assert.ok((await page.locator('.sd-player-list').boundingBox()).height<120);assert.ok((await page.locator('.sd-main').boundingBox()).height>200);}
  await page.locator('.sd-player').nth(1).click();await page.getByRole('heading',{name:'Hydran Progress',exact:true}).waitFor();
  await page.locator('.eo-hero').scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/${width}x${height}-opponent.png`});
  assert.equal(await page.getByRole('button',{name:'Research technology',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Colonize planets',exact:true}).count(),0);
  await page.getByRole('button',{name:'Inspect Advanced Labs',exact:true}).click();await page.locator('.eo-tech-effect').scrollIntoViewIfNeeded();
  assert.match(await page.locator('.eo-tech-effect').innerText(),/colonize advanced science/);
  await page.screenshot({path:`${directory}/${width}x${height}-opponent-technology.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({width,height,ownEmpire:true,opponentPublicOnly:true,blueprintNavigation:true,opponentTechnologyInspection:true,horizontalOverflow:false,errors});await page.close();
 }
}finally{await browser.close();}
await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log('Empire overview screenshots and navigation verified at five sizes.');
