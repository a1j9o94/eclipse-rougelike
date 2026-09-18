import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory='coding_agents/second_dawn_revision_screenshots';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const results=[];
for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5175/#second-dawn-preview');
 async function capture(name){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`${directory}/${width}x${height}-${name}.png`,animations:'disabled'});results.push({width,height,screen:name,pageErrors:[...errors]});}
 await page.getByLabel('Review position').selectOption('opening-three');
 await page.getByRole('button',{name:/Inspect sector .*Eridani/}).first().click();
 assert.equal(await page.locator('.dg-planet-row').count(),4);await capture('planets');
 await page.getByRole('button',{name:'Blueprints',exact:true}).click();await page.getByRole('button',{name:'Interceptor',exact:true}).click();
 await page.getByRole('button',{name:'Slot 4: Empty slot',exact:true}).click();await page.getByRole('button',{name:'Install Hull in slot 4',exact:true}).click();await page.getByRole('button',{name:'Dreadnought',exact:true}).click();await page.getByRole('button',{name:'Interceptor',exact:true}).click();await page.getByRole('button',{name:'Slot 4: Hull',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Install Hull in slot 4',exact:true}).getAttribute('aria-pressed'),'true');await capture('interceptor-tray');
 await page.getByLabel('Review position').selectOption('midgame');await page.getByRole('button',{name:'Research',exact:true}).first().click();await page.getByRole('button',{name:/Gluon Computer/}).click();assert.equal(await page.getByRole('button',{name:/Gluon Computer/}).getByRole('img',{name:/computer: \+3/}).count(),1);await capture('research-icons');
 await page.locator('.sd-player').nth(1).click();assert.equal(await page.getByLabel('Your private reputation tile').count(),0);await capture('opponent');
 await page.getByRole('button',{name:'Diplomacy',exact:true}).click();await capture('diplomacy');
 await page.getByRole('button',{name:'Scoring',exact:true}).click();await page.locator('.dg-score summary').first().click();assert.equal(await page.getByText('Hidden until game end',{exact:true}).count()>0,true);await capture('public-score');
 assert.deepEqual(errors,[]);await page.close();
}
await browser.close();await writeFile(`${directory}/feedback-review.json`,JSON.stringify({evidence:'Automated review of real engine fixtures; not a human usability acceptance',results},null,2));console.log(`${results.length} feedback revision screens captured with workflow assertions.`);
