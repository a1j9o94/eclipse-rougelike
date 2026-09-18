import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='coding_agents/second_dawn_gameplay_screenshots';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1366,height:768}});
const results=[];
for(const [type,label] of [['research','Research'],['build','Build'],['move','Move'],['influence','Influence'],['colonize','Colonize'],['trade','Trade'],['pass','Pass'],['end-action','End action'],['finish-upkeep','Finish upkeep']]){
 const start=Date.now();
 try{
  await page.goto('http://127.0.0.1:5175/#second-dawn-review');
  await page.reload();
  await page.getByLabel('Review position').selectOption(`workflow-${type}`);
  await page.getByRole('button',{name:label,exact:true}).last().click();
  let chosen=label,preview='';
  if(type==='build'){
   const planner=page.getByRole('dialog');await planner.waitFor();
   const add=planner.getByRole('button',{name:/^Add /});let selected=false;
   for(let index=0;index<await add.count();index++){const button=add.nth(index);if(await button.isEnabled()){chosen=await button.getAttribute('aria-label');await button.click();selected=true;break;}}
   assert.ok(selected,'A build component must be available.');preview=await planner.innerText();
   await page.getByRole('button',{name:/^(Confirm build|Convert & build)$/}).click();
  }else if(type==='move'){
   await page.getByRole('button',{name:'Fit',exact:true}).click();
   const planner=page.getByRole('region',{name:'Move fleet',exact:true});await planner.waitFor();
   const ships=planner.getByRole('checkbox');let selected=false;
   for(let index=0;index<await ships.count();index++){const ship=ships.nth(index);if(await ship.isEnabled()){await ship.check();selected=true;break;}}
   assert.ok(selected,'A movable ship must be available.');
   const destination=page.getByRole('button',{name:/legal move destination/}).first();await destination.click();chosen=await destination.getAttribute('aria-label');preview=await planner.innerText();
   await page.getByRole('button',{name:/^Confirm move/}).click();
  }else if(type==='trade'){
   const panel=page.getByRole('region',{name:'Trade resources',exact:true});
   await panel.waitFor();
   const increment=page.getByRole('button',{name:'Increase received amount',exact:true});
   if(await increment.isEnabled())await increment.click();
   preview=await panel.innerText();
   chosen=await panel.locator('.dg-trade-swap').innerText();
   const visible=await page.getByRole('button',{name:'Confirm trade',exact:true}).evaluate(button=>{const bounds=button.getBoundingClientRect();let top=0,bottom=innerHeight;for(let ancestor=button.parentElement;ancestor;ancestor=ancestor.parentElement){if(/auto|scroll|hidden|clip/.test(getComputedStyle(ancestor).overflowY)){const box=ancestor.getBoundingClientRect();top=Math.max(top,box.top);bottom=Math.min(bottom,box.bottom);}}return bounds.top>=top&&bounds.bottom<=bottom;});
   assert.ok(visible,'Trade confirmation must be visible before scrolling.');
   await page.screenshot({path:`${directory}/1366x768-trade-workflow.png`});
   await page.getByRole('button',{name:'Confirm trade',exact:true}).click();
  }else if(type==='research'){
   const technology=page.locator('.sd-tech').filter({hasText:'Within budget'}).first();
   await technology.waitFor();chosen=(await technology.innerText()).split('\n')[0];await technology.click();
   preview=await page.locator('.sd-inspector').innerText();
   await page.getByRole('button',{name:/^(Confirm action|Convert & research)$/}).click();
  }else if(type==='influence'){
   const planner=page.getByRole('region',{name:'Influence planner'});await planner.waitFor();
   const source=planner.getByRole('button',{name:/^Remove control from sector/}).first();
   if(await source.count())await source.click();
   const target=planner.getByRole('button',{name:/^Place disc in sector/}).first();
   if(await target.count()&&await target.isEnabled())await target.click();
   preview=await planner.innerText();chosen=await planner.locator('.dg-influence-confirm > strong').innerText();
   await planner.getByRole('button',{name:'Confirm influence',exact:true}).click();
  }else if(type==='colonize'){
   const planner=page.getByRole('region',{name:'Colonization planner'});await planner.waitFor();
   const planet=planner.locator('.dg-colonization-square:not([disabled])').first();await planet.waitFor();chosen=await planet.getAttribute('aria-label');await planet.click();
   preview=await planner.innerText();await planner.getByRole('button',{name:'Confirm colonization',exact:true}).click();
  }else if(['pass','end-action','finish-upkeep'].includes(type)){
   // The turn-management button itself commits the unambiguous legal command.
   assert.equal(await page.getByRole('button',{name:'Confirm action',exact:true}).count(),0);
   preview='Committed directly from the turn button.';
  }else throw Error(`No specialized workflow is registered for ${type}.`);
  await page.getByText('Applied to the isolated engine fixture. No guest save changed.',{exact:true}).waitFor();
  results.push({id:`browser-${type}`,fixture:`workflow-${type}`,result:'accepted by actual engine',chosen,preview,after:await page.locator('.sd-note').innerText(),elapsedSeconds:(Date.now()-start)/1000,wrongTurns:0});
 }catch(error){results.push({id:`browser-${type}`,result:'failed',error:String(error),elapsedSeconds:(Date.now()-start)/1000,wrongTurns:1});}
}
for(const offer of [false,true]){
 const start=Date.now();const id=offer?'browser-diplomacy-exchange':'browser-diplomacy-finish';
 try{
  await page.goto('http://127.0.0.1:5175/#second-dawn-review');
  await page.reload();
  await page.getByLabel('Review position').selectOption('workflow-diplomacy');
  const diplomacy=page.getByRole('region',{name:'Post-combat diplomacy'});await diplomacy.waitFor();
  assert.equal(await diplomacy.getByRole('radiogroup',{name:'Ambassador population'}).count(),0);
  if(offer){
   await diplomacy.getByRole('radiogroup',{name:'Diplomacy partner'}).getByRole('radio').nth(1).click();
   await diplomacy.getByRole('radiogroup',{name:'Ambassador population'}).getByRole('radio').first().click();
  }
  const preview=await page.locator('.sd-workspace').innerText();
  await page.screenshot({path:`${directory}/1366x768-diplomacy-${offer?'offer':'finish'}.png`});
  await diplomacy.getByRole('button',{name:offer?'Offer ambassadors':'Finish diplomacy',exact:true}).click();
  await page.getByText('Applied to the isolated engine fixture. No guest save changed.',{exact:true}).waitFor();
  if(offer){
   const response=page.getByRole('region',{name:'Ambassador exchange'});await response.waitFor();
   await response.getByRole('radiogroup',{name:'Diplomatic response'}).getByRole('radio',{name:'Accept exchange'}).click();
   await response.getByRole('radiogroup',{name:'Ambassador population'}).getByRole('radio').first().click();
   await response.getByRole('button',{name:'Accept ambassadors',exact:true}).click();
   await response.waitFor({state:'detached'});
  }
  results.push({id,fixture:'workflow-diplomacy',result:'accepted by actual engine',preview,elapsedSeconds:(Date.now()-start)/1000,wrongTurns:0});
 }catch(error){results.push({id,result:'failed',error:String(error),elapsedSeconds:(Date.now()-start)/1000,wrongTurns:1});}
}
await writeFile(`${directory}/action-workflows.json`,JSON.stringify({evidence:'Agent browser automation with recorded real-engine states. Actions executed through the actual UI; explicit choices are previewed and confirmed, while unambiguous turn buttons commit directly. processGameCommand accepts each. Fixture setup is automated. Timings are execution durations, not human search times. No Convex persistence or human playtest claimed.',results},null,2));
await browser.close();
assert.equal(results.filter(r=>r.result==='failed').length,0,JSON.stringify(results.filter(r=>r.result==='failed')));
console.log(`Passed ${results.length} remaining action workflows.`);
