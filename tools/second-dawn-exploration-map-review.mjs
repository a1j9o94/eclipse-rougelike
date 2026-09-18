import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(site).hostname))throw new Error('Local preview fixtures only.');
const directory='coding_agents/second_dawn_exploration_map_review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const evidence=[];
try{
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[390,844],[360,800]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${site}/?position=exploration-ancients#second-dawn-preview`);await page.getByRole('region',{name:'Exploration placement preview'}).waitFor();
  const rotations=new Set();
  for(let index=0;index<6;index++){
   rotations.add(await page.getByTestId('drawn-exploration-tile').getAttribute('data-rotation'));
   for(const name of ['Rotate clockwise','Rotate counterclockwise','Place sector','Discard sector']){
    const box=await page.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=height,`${width} ${name} in viewport`);
   }
   await page.getByRole('button',{name:'Rotate clockwise',exact:true}).click();
  }
  assert.equal(rotations.size,6);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const strip=await page.getByRole('group',{name:'Drawn sector contents'}).boundingBox();assert.ok(strip&&strip.y+strip.height<height);
  await page.screenshot({path:`${directory}/${width}x${height}-ancients.png`});
  // Fit exposes the complete actual map, including a distant fleet to inspect.
  await page.getByRole('button',{name:'Fit',exact:true}).click();
  await page.getByRole('button',{name:/^Inspect sector 222,/}).click();
  await page.getByRole('heading',{name:'Sector 222',exact:true}).waitFor();
  assert.ok(await page.getByRole('group',{name:/Eridani Empire · 1 Interceptor/}).count());
  await page.screenshot({path:`${directory}/${width}x${height}-neighbor.png`});
  assert.deepEqual(errors,[]);evidence.push({width,height,rotations:6,commitControlsVisible:true,contentsStripVisible:true,neighborFactionFleet:true,horizontalOverflow:false,errors});await page.close();
 }
}finally{await browser.close();}
await writeFile(`${directory}/results.json`,JSON.stringify(evidence,null,2));
console.log('Passed exploration map, Ancient contents, six rotations, neighbor fleet and visible controls at all 5 sizes.');
