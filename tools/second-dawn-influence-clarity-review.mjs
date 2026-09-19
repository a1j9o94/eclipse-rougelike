import {chromium,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5173';
const dir='coding_agents/second_dawn_influence_clarity_review';
await mkdir(dir,{recursive:true});const results=[];
for(const [engine,browserType] of Object.entries({chromium,webkit})){
 const browser=await browserType.launch();
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/?position=workflow-influence#second-dawn-preview`);
  if(width===390){await page.getByRole('button',{name:'Choose action',exact:true}).click();await page.getByRole('group',{name:'Choose your action'}).getByRole('button',{name:/^Influence/}).click();}
  else await page.getByRole('button',{name:'Influence',exact:true}).click();
  const own=page.getByRole('button',{name:/^Inspect sector 228,/});await own.focus();await own.press('Enter');
  if(width===390&&await page.getByRole('button',{name:'Expand Influence details'}).isVisible())await page.getByRole('button',{name:'Expand Influence details'}).click();
  await page.getByText('You already control this sector.',{exact:true}).waitFor();
  if(await page.getByRole('button',{name:/^Withdraw from sector/}).count())throw new Error('Owned sector click staged withdrawal');
  await page.screenshot({path:`${dir}/${engine}-${width}-owned-safe.png`});
  if(width===390)await page.getByRole('button',{name:'Collapse Influence details'}).click();
  const target=page.getByRole('button',{name:/^Inspect sector 109,.*legal influence target/});await target.focus();await target.press('Enter');
  if(width===390&&await page.getByRole('button',{name:'Expand Influence details'}).isVisible())await page.getByRole('button',{name:'Expand Influence details'}).click();
  const commit=page.getByRole('button',{name:'Take control of sector 109',exact:true});await commit.waitFor();
  await page.screenshot({path:`${dir}/${engine}-${width}-claim.png`});
  await commit.click();await page.getByRole('button',{name:/^Inspect sector 109, Descendants of Draco/}).waitFor();
  if(errors.length)throw new Error(errors.join('\n'));
  results.push({engine,width,ownedClickDidNotWithdraw:true,claimCommitted:true,noPageErrors:true,...await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth}))});
  await page.close();
 }
 await browser.close();
}
await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
