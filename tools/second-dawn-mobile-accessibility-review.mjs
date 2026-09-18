import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='coding_agents/second_dawn_mobile_accessibility';await mkdir(dir,{recursive:true});
const browser=await chromium.launch();const results=[];
for(const [width,height,enlarged]of[[390,844,true],[844,390,false]])for(const screen of['research','trade']){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
 await page.goto('http://127.0.0.1:5175/?position=midgame#second-dawn-preview');await page.getByRole('button',{name:'Empire',exact:true}).click();await page.getByRole('button',{name:screen==='research'?'Research technologies':'Trade resources',exact:true}).click();
 if(enlarged)await page.evaluate(()=>{const entries=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement&&[...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())).map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize)}));for(const{e,size}of entries){e.style.fontSize=`${size*2}px`;e.style.lineHeight='1.4';}});
 await page.screenshot({path:`${dir}/${width}x${height}-${enlarged?'200percent-text':'landscape'}-${screen}.png`,animations:'disabled'});
 const metrics=await page.evaluate(()=>{const footer=document.querySelector('.dg-mobile-footer').getBoundingClientRect();return{width:innerWidth,docWidth:document.documentElement.scrollWidth,footerHeight:footer.height,measuredInset:parseFloat(document.querySelector('.dg-mobile-board').style.getPropertyValue('--mobile-footer-height')),mainHeight:document.querySelector('.sd-main').clientHeight};});assert.equal(metrics.width,metrics.docWidth);assert.ok(Math.abs(metrics.footerHeight-metrics.measuredInset)<2);assert.ok(metrics.mainHeight>150);results.push({screen,width,height,enlarged,...metrics});
 if(screen==='research'){
  await page.locator('.sd-tech').filter({hasText:'Improved Hull'}).first().click();const confirm=page.getByRole('button',{name:'Confirm action',exact:true});await confirm.scrollIntoViewIfNeeded();await confirm.click({trial:true});
  const gap=await page.evaluate(()=>document.querySelector('.dg-mobile-footer').getBoundingClientRect().top-document.querySelector('.dg-mobile-sheet').getBoundingClientRect().bottom);assert.ok(gap>=-1);await page.screenshot({path:`${dir}/${width}x${height}-${enlarged?'200percent-text':'landscape'}-confirmation.png`});
 }
 await page.close();
}
await browser.close();await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
