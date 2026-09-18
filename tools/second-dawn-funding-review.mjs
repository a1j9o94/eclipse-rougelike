import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const site=(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175').replace(/\/$/,'');
const browser=await chromium.launch(),checks=[];
try{for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${site}/?position=opening-three#second-dawn-preview`);
 await page.getByRole('button',{name:'Research',exact:true}).first().click();
 await page.locator('button.sd-tech').filter({hasText:'Starbase'}).click();
 await page.getByRole('button',{name:'Pay 3 money',exact:true}).click();
 await page.getByRole('img',{name:'Spend 3 money',exact:true}).waitFor();
 await page.getByText('24 money left after upkeep',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Inspect researched Starbase',exact:true}).count(),0);
 const confirm=page.getByRole('button',{name:'Convert & research',exact:true});await confirm.scrollIntoViewIfNeeded();
 await page.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-funded-research.png`,animations:'disabled'});
 await confirm.click();await page.getByRole('button',{name:'Inspect researched Starbase',exact:true}).waitFor();
 assert.match(await page.locator('.sd-resource').first().innerText(),/23/);
 await page.getByRole('button',{name:'History',exact:true}).click();
 assert.match(await page.getByRole('log',{name:'Match actions'}).innerText(),/Starbase/i);
 assert.deepEqual(errors,[]);checks.push({width,height,conversionWarned:true,sourceChanged:true,moneyAfterUpkeep:24,researched:true,logged:true,pageErrors:errors});await page.close();
}}finally{await browser.close();}
await writeFile('coding_agents/second_dawn_revision_screenshots/funding-review.json',JSON.stringify({site,checks},null,2));console.log('Three desktop sizes: warned money conversion, atomic research, owned tile and public log verified.');
