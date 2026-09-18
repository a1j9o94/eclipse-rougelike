import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='coding_agents/second_dawn_fleet_review';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const results=[];
for(const[width,height]of [[1366,768],[1440,900],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height}});
 await page.goto(process.env.SECOND_DAWN_PREVIEW_URL||'http://127.0.0.1:5175/#second-dawn-preview');
 await page.getByLabel('Review position').selectOption('late');
 await page.getByRole('button',{name:'Fit',exact:true}).click();
 const mostShips=await page.locator('.dg-tile').evaluateAll(tiles=>tiles.map(tile=>({label:tile.getAttribute('aria-label'),count:tile.querySelectorAll('[data-fleet-card]').length})).sort((a,b)=>b.count-a.count)[0]);
 await page.getByRole('button',{name:mostShips.label,exact:true}).click();
 await page.screenshot({path:`${directory}/${width}x${height}-late.png`,animations:'disabled'});
 results.push({width,height,...await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,cards:document.querySelectorAll('[data-fleet-card]').length,emblems:document.querySelectorAll('.dg-faction-symbol').length,maximumVisibleCards:Math.max(...Array.from(document.querySelectorAll('.dg-tile'),tile=>tile.querySelectorAll('[data-fleet-card]').length))}))});
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.screenshot({path:`${directory}/${width}x${height}-late-detail.png`,animations:'disabled'});
 await page.close();
}
await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results));
