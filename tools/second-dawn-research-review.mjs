import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch();
const checks=[];
try {
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]) {
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto(`${(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175').replace(/\/$/,'')}/?position=midgame#second-dawn-preview`);
  await page.getByRole('button',{name:'Research',exact:true}).first().click();
  const initial=await page.evaluate(()=>{
   const footer=document.querySelector('.sd-footer').getBoundingClientRect();
   const owned=document.querySelector('.dg-owned-research').getBoundingClientRect();
   const cards=[...document.querySelectorAll('button.sd-tech')];
   const firstY=Math.min(...cards.map(card=>card.getBoundingClientRect().top));
   return {ownedVisible:owned.bottom<footer.top,firstRow:cards.filter(card=>Math.abs(card.getBoundingClientRect().top-firstY)<3).map(card=>({name:card.querySelector('strong')?.textContent,bottom:card.getBoundingClientRect().bottom,visible:card.getBoundingClientRect().bottom<=footer.top})),singlePrices:cards.every(card=>card.querySelectorAll('.dg-research-price').length<=1),priceFont:getComputedStyle(document.querySelector('.dg-research-price-value > strong')).fontSize,horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
  });
  await page.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-research-owned.png`});
  await page.getByRole('button',{name:'Inspect researched Plasma Cannon'}).click();
  const ownedInspect=await page.locator('aside').last().evaluate(el=>({text:el.textContent,scrollTop:el.scrollTop}));
  const gluon=page.locator('button.sd-tech').filter({hasText:'Gluon Computer'});
  await gluon.click();
  const selected=await page.locator('aside').last().evaluate(el=>({text:el.textContent,scrollTop:el.scrollTop}));
  await page.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-research-selected.png`});
  checks.push({width,height,...initial,ownedInspectAtTop:ownedInspect.scrollTop===0&&ownedInspect.text.includes('Plasma Cannon'),selectedAtTop:selected.scrollTop===0&&selected.text.includes('Gluon Computer')});
  await page.close();
 }
 await writeFile('coding_agents/second_dawn_revision_screenshots/research-review.json',JSON.stringify(checks,null,2));
 console.log(JSON.stringify(checks,null,2));
 if(checks.some(check=>!check.ownedVisible||!check.singlePrices||check.horizontalOverflow||!check.ownedInspectAtTop||!check.selectedAtTop||check.firstRow.some(card=>!card.visible)))throw new Error('Research browser acceptance check failed');
}finally{await browser.close();}
