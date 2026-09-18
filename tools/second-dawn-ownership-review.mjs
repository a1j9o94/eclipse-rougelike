import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch();const checks=[];
try{
 for(const[width,height]of[[1366,768],[1440,900],[1920,1080]])for(const position of['opening','midgame','late']){
 const page=await browser.newPage({viewport:{width,height}});
 await page.goto(`${(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175').replace(/\/$/,'')}/?position=${position}#second-dawn-preview`);
 await page.locator('.dg-tile').first().waitFor();
 await page.waitForTimeout(300);
 await page.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-${position}-ownership.png`});
 checks.push({width,height,position,...await page.evaluate(()=>({sectorIdFont:getComputedStyle(document.querySelector('.dg-sector-id')).fontSize,ownerFont:getComputedStyle(document.querySelector('.dg-owner-number')).fontSize,coloredFaces:[...document.querySelectorAll('.dg-tile-face')].filter(el=>el.getAttribute('fill').includes('owner-')).length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth}))});await page.getByRole('button',{name:'Fit',exact:true}).click();
 await page.waitForTimeout(300);
 await page.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-${position}-ownership-fit.png`});
 await page.getByRole('button',{name:/^Inspect sector 222,/}).click();
 if(!await page.locator('aside').last().getByText(/Sector 222/).count())throw new Error('Inspector must retain full sector ID');
 await page.close();
 }
 await writeFile('coding_agents/second_dawn_revision_screenshots/ownership-review.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
 if(checks.some(check=>parseFloat(check.sectorIdFont)>=parseFloat(check.ownerFont)||check.coloredFaces===0||check.horizontalOverflow))throw new Error('Ownership map review failed');
}finally{await browser.close();}
