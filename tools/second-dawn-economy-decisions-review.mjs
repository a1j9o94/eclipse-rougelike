import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='coding_agents/second_dawn_visual_decisions';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const checks=[];
try{
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height}});
  for(const position of ['control','bankruptcy','portal-placement','population-return','resource-reward','reputation','diplomacy','bombardment']){
   await page.goto(`http://127.0.0.1:5175/?position=${position}#second-dawn-preview`);
   await page.getByLabel('Review position').waitFor();
   if(position==='control')await page.getByRole('radio',{name:'Place influence disc'}).click();
   if(['portal-placement','bankruptcy'].includes(position))await page.getByRole('group',{name:'Eligible sectors'}).getByRole('button').first().click();
   await page.screenshot({path:`${directory}/${width}-${position}.png`,animations:'disabled'});
   checks.push({width,height,position,...await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,bodyOverflow:document.documentElement.scrollHeight>innerHeight,confirm:[...document.querySelectorAll('.dg-economy-decision>footer button')].map(el=>({text:el.textContent,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}))}))});
  }
  await page.close();
 }
 await writeFile(`${directory}/review.json`,JSON.stringify(checks,null,2));
 console.log(`Captured ${checks.length} persisted decision screenshots.`);
}finally{await browser.close();}
