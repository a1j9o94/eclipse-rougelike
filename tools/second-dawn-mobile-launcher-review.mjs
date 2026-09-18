import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const site=(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175').replace(/\/$/,'');
const dir='coding_agents/second_dawn_mobile_launcher_review';await mkdir(dir,{recursive:true});
const browser=await chromium.launch();const results=[];
for(const[width,height]of[[360,800],[390,844],[430,932]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(site);await page.getByRole('button',{name:'New game',exact:true}).waitFor();
 await page.getByRole('button',{name:'New game',exact:true}).isEnabled();
 await page.screenshot({path:`${dir}/${width}-home.png`});
 await page.getByRole('button',{name:'Save player profile',exact:true}).click();
 await page.getByLabel('Player username',{exact:true}).fill('Mobile review');
 await page.screenshot({path:`${dir}/${width}-profile.png`});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'New game',exact:true}).click();
 await page.getByRole('heading',{name:'Choose a faction board'}).waitFor();
 await page.screenshot({path:`${dir}/${width}-factions.png`});
 const overflow=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(overflow.scrollWidth<=overflow.width+1,JSON.stringify(overflow));
 await page.getByRole('button',{name:'Start game',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-setup.png`});
 assert.deepEqual(errors,[]);results.push({width,height,overflow,pageErrors:errors,accountCreated:false,matchCreated:false});await context.close();
}
await browser.close();await writeFile(`${dir}/results.json`,JSON.stringify({site,results},null,2));console.log(JSON.stringify(results));
