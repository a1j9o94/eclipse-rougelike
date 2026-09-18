import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='coding_agents/second_dawn_gameplay_screenshots';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const checks=[];
for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height}});
 await page.goto('http://127.0.0.1:5175/#second-dawn-preview');
 await page.getByLabel('Review position').waitFor();
 for(const screen of ['opening','midgame','late','research','blueprints','combat','scoring']){
  const position=['research','blueprints'].includes(screen)?'midgame':screen;
  await page.getByLabel('Review position').selectOption(position);
  if(screen==='midgame'){await page.getByRole('button',{name:'Fit',exact:true}).click();await page.getByRole('button',{name:/^Inspect sector/}).first().click();}
  if(screen==='research')await page.getByRole('button',{name:'Research',exact:true}).first().click();
  if(screen==='blueprints'){await page.getByRole('button',{name:'Blueprints',exact:true}).click();await page.getByRole('button',{name:'Edit interceptor',exact:true}).click();}
  if(screen==='scoring')await page.getByRole('button',{name:'Scoring',exact:true}).click();
  await page.screenshot({path:`${directory}/${width}x${height}-${screen}.png`,animations:'disabled'});
  checks.push({width,height,screen,...await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,verticalOverflow:document.documentElement.scrollHeight>innerHeight}))});
 }
 await page.close();
}
await writeFile(`${directory}/review-results.json`,JSON.stringify({type:'Actual engine view fixtures; agent review, no human usability evidence',checks},null,2));
await browser.close();
console.log(`Captured ${checks.length} actual gameplay screenshots.`);
