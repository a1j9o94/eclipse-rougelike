import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='coding_agents/second_dawn_mobile_economy_review';await mkdir(dir,{recursive:true});const browser=await chromium.launch();const results=[];
try{
 for(const[width,height]of[[360,800],[390,844],[430,932]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:5175/?position=workflow-trade#second-dawn-preview');await page.getByRole('button',{name:'Empire',exact:true}).click();await page.getByRole('button',{name:'Convert resources',exact:true}).click();
 const panel=page.getByRole('region',{name:'Convert resources',exact:true});await panel.waitFor();await page.screenshot({path:`${dir}/${width}-trade.png`});
 const geometry=await panel.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,choices:[...el.querySelectorAll('.dg-trade-choices button')].map(button=>button.getBoundingClientRect().width)}));
 assert.ok(geometry.scrollWidth<=geometry.width+1,`Trade overflow: ${JSON.stringify(geometry)}`);assert.ok(geometry.choices.every(width=>width>=44),`Trade targets too narrow: ${JSON.stringify(geometry)}`);
 const science=Number(await page.locator('.dg-mobile-resources>span').nth(1).locator('strong').innerText());
 await page.getByRole('button',{name:'Confirm conversion',exact:true}).click();await page.waitForFunction(expected=>Number(document.querySelectorAll('.dg-mobile-resources>span strong')[1]?.textContent)===expected,science+1);
 results.push({width,height,tradeAcceptedByEngine:true,geometry});await page.close();
 }
}finally{await browser.close();}
await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
