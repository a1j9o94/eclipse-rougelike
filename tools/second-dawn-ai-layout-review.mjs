import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='coding_agents/second_dawn_ai_layout_review';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const checks=[];
for(const[width,height]of [[1366,768],[1440,900]]){
 const page=await browser.newPage({viewport:{width,height}});
 await page.goto('http://127.0.0.1:5175/#second-dawn-preview');
 for(const screen of ['research','blueprints','combat','build']){
  await page.getByLabel('Review position').selectOption(screen==='combat'?'combat':'midgame');
  if(screen==='research')await page.getByRole('button',{name:'Research',exact:true}).first().click();
  if(screen==='blueprints'){
   await page.getByRole('button',{name:'Blueprints',exact:true}).click();
   await page.getByRole('button',{name:'Edit interceptor',exact:true}).click();
  }
  if(screen==='build')await page.getByRole('button',{name:'Build',exact:true}).click();
  await page.screenshot({path:`${directory}/${width}x${height}-${screen}.png`,animations:'disabled'});
  checks.push({width,height,screen,...await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,documentHeight:document.documentElement.scrollHeight,scrollPanels:[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+5&&['auto','scroll'].includes(getComputedStyle(e).overflowY)).map(e=>({class:e.className,height:e.clientHeight,contentHeight:e.scrollHeight})),visibleButtons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().top<innerHeight).map(e=>({text:e.getAttribute('aria-label')||e.textContent,bottom:e.getBoundingClientRect().bottom,disabled:e.disabled}))}))});
 }
 await page.close();
}
await writeFile(`${directory}/results.json`,JSON.stringify(checks,null,2));
await browser.close();
console.log(`Captured ${checks.length} screens.`);
