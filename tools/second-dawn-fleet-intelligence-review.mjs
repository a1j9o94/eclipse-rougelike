import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='coding_agents/second_dawn_visual_fleet_intelligence_review';
const origin=process.env.SECOND_DAWN_PREVIEW_URL||'http://127.0.0.1:5173/';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const results=[];
async function inspect(page,tile){
 await page.getByRole('button',{name:new RegExp(`^Inspect sector ${tile},`)}).click();
 // The ship glyph itself also opens the same inspector; map-scale hit regions vary.
 if(!await page.getByRole('dialog',{name:/Fleet inspection/}).count())await page.getByRole('button',{name:'Inspect fleet',exact:true}).click();
 await page.getByRole('dialog',{name:/Fleet inspection/}).waitFor();
}
try{
 for(const[width,height]of [[1366,768],[1440,900],[1920,1080],[390,844],[360,800]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
  page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const url=new URL(origin);url.searchParams.set('position','late');url.hash='second-dawn-preview';
  await page.goto(url.href);await inspect(page,'226');
  const dialog=page.getByRole('dialog',{name:/Fleet inspection/});
  await page.screenshot({path:`${directory}/${width}x${height}-late.png`,animations:'disabled'});
  const measured=await dialog.evaluate(e=>({horizontalOverflow:e.scrollWidth>e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,blueprints:e.querySelectorAll('.dg-readonly-loadout').length,parts:e.querySelectorAll('.dg-readonly-part').length}));
  await dialog.evaluate(e=>e.scrollTo(0,e.scrollHeight));
  if(!await page.getByRole('button',{name:'Return to plan'}).isVisible())throw new Error('Sticky close button unavailable');
  await page.getByRole('button',{name:'Return to plan'}).click();
  if(width<500){await page.getByRole('button',{name:'Choose action',exact:true}).click();await page.getByRole('group',{name:'Choose your action'}).getByRole('button',{name:/^Move/}).click();}else await page.getByRole('button',{name:'Move',exact:true}).click();
  await page.getByRole('button',{name:/^Inspect sector 222,/}).click();
  if(await dialog.count())await page.getByRole('button',{name:'Return to plan'}).click();
  if(width<500&&await page.getByRole('button',{name:'Expand Move details'}).isVisible())await page.getByRole('button',{name:'Expand Move details'}).click();
  await page.getByRole('checkbox',{name:'Interceptor 1',exact:true}).check();
  if(width<500&&await page.getByRole('button',{name:'Collapse Move details'}).isVisible())await page.getByRole('button',{name:'Collapse Move details'}).click();
  await inspect(page,'226');
  await page.getByRole('region',{name:'Fleet comparison'}).evaluate(e=>e.scrollIntoView({block:'start'}));
  await page.screenshot({path:`${directory}/${width}x${height}-comparison.png`,animations:'disabled'});
  if(!await page.getByRole('region',{name:'Your selected fleet'}).count())throw new Error('Selected fleet missing');
  const comparisonOverflow=await dialog.evaluate(e=>e.scrollWidth>e.clientWidth);
  await page.getByRole('button',{name:'Return to plan'}).click();
  if(width<500&&await page.getByRole('button',{name:'Expand Move details'}).isVisible())await page.getByRole('button',{name:'Expand Move details'}).click();
  if(!await page.getByRole('checkbox',{name:'Interceptor 1',exact:true}).isChecked())throw new Error('Movement draft changed while inspecting');
  results.push({width,height,...measured,comparisonOverflow,closeAvailableAfterScroll:true,movementDraftPreserved:true,errors});
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const neutralUrl=new URL(origin);neutralUrl.searchParams.set('position','ancients');neutralUrl.hash='second-dawn-preview';
 await page.goto(neutralUrl.href);await inspect(page,'204');
 await page.screenshot({path:`${directory}/1440x900-ancients.png`,animations:'disabled'});
 results.push({scenario:'neutral',neutralSilhouettes:await page.locator('.dg-inspection-silhouette svg').count(),inventedModuleGrids:await page.locator('.dg-readonly-loadout').count()});
 await page.close();
 await writeFile(`${directory}/results.json`,`${JSON.stringify(results,null,2)}\n`);
 console.log(JSON.stringify(results));
}finally{await browser.close();}
