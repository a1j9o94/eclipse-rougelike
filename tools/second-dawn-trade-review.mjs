import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch();const checks=[];
try{
 for(const [width,height]of [[1366,768],[1440,900],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height}});
 await page.goto(`${(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175').replace(/\/$/,'')}/?position=midgame#second-dawn-preview`);
 await page.getByRole('button',{name:'Trade',exact:true}).first().click();
 const before=await page.locator('.dg-trade-balance').innerText();
 await page.getByRole('button',{name:'Increase received amount'}).click();
 const increased=await page.getByRole('img',{name:'Receive 2 science'}).count()===1;
 await page.getByRole('button',{name:'Decrease received amount'}).click();
 await page.getByRole('button',{name:'Receive money'}).click();
 const receive=await page.getByRole('img',{name:'Receive 1 money'}).count()===1;
 const confirm=page.getByRole('button',{name:'Confirm trade'});
 const button=await confirm.boundingBox();const footer=await page.locator('.sd-footer').boundingBox();const workspace=await page.locator('.sd-main').boundingBox();
 await page.waitForTimeout(300);
 await page.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-trade.png`});
 const spend=await page.getByRole('img',{name:/^Spend /}).getAttribute('aria-label');
 await confirm.click();
 const after=await page.locator('.dg-trade-balance').innerText();
 checks.push({width,height,increased,receive,spend,before,after,committed:before!==after,confirmationVisible:button.y>=workspace.y&&button.y+button.height<=footer.y,horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 await page.close();
 }
 await writeFile('coding_agents/second_dawn_revision_screenshots/trade-review.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
 if(checks.some(check=>!check.increased||!check.receive||!check.committed||!check.confirmationVisible||check.horizontalOverflow))throw new Error('Trade browser check failed');
}finally{await browser.close();}
