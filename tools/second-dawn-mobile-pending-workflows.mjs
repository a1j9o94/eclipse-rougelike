import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175';
const directory='coding_agents/second_dawn_mobile_pending_workflows';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const results=[],errors=[];
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(6000);page.on('pageerror',error=>errors.push(error.message));
// Read only the authorized public view supplied to the production Board. This
// observes engine acceptance without relying on the intentionally hidden mobile success toast.
async function publicState(){return page.evaluate(()=>{
 const node=document.querySelector('.dg-app');const key=Object.keys(node).find(key=>key.startsWith('__reactFiber$'));let fiber=node[key];while(fiber.return)fiber=fiber.return;
 const stack=[fiber.stateNode.current];while(stack.length){const current=stack.pop();const view=current.memoizedProps?.view;if(view?.sectors&&Number.isInteger(view.revision))return{revision:view.revision,decision:view.pendingDecision?.kind??null,sectors:view.sectors.length};if(current.sibling)stack.push(current.sibling);if(current.child)stack.push(current.child);}
 throw new Error('Public board view unavailable');
});}
async function tap(control){await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();assert.ok(box&&box.x>=-1&&box.x+box.width<=390+1&&box.y>=-1&&box.y+box.height<=844+1,`Control clipped: ${await control.innerText()} ${JSON.stringify(box)}`);await control.click();return box;}
async function confirm(position,label){const before=await publicState();const button=page.getByRole('button',{name:label,exact:true});const geometry=await tap(button);for(let attempt=0;attempt<30;attempt++){const after=await publicState();if(after.revision>before.revision){assert.equal(after.revision,before.revision+1);await page.screenshot({path:`${directory}/${position}-accepted.png`,animations:'disabled'});return{before,after,confirmation:label,geometry};}await page.waitForTimeout(50);}throw new Error(`No engine acceptance after ${label}`);}
try{
 for(const position of ['control','bankruptcy','portal-placement','reputation','resource-reward','population-return','discovery','retreat','diplomacy']){
  await page.goto(`${site}/?position=${position}#second-dawn-preview`);await page.getByLabel('Review position').waitFor();const steps=[];
  try{
   if(position==='control'){await tap(page.getByRole('radio',{name:'Place influence disc',exact:true}));steps.push(await confirm(position,'Confirm control'));}
   if(position==='bankruptcy'||position==='portal-placement'){await tap(page.getByRole('group',{name:'Eligible sectors'}).getByRole('button').first());steps.push(await confirm(position,position==='bankruptcy'?'Abandon selected sector':'Place warp portal'));}
   if(position==='reputation'){await tap(page.getByRole('checkbox',{name:'Keep 2 VP reputation'}));steps.push(await confirm(position,'Confirm reputation'));}
   if(position==='resource-reward'||position==='population-return'){
    const label=position==='resource-reward'?'Confirm reward':'Confirm population return';
    for(let count=0;count<12&&await page.getByRole('button',{name:label,exact:true}).isDisabled();count++)await tap(page.getByRole('button',{name:'Add money allocation',exact:true}));
    steps.push(await confirm(position,label));
   }
   if(position==='discovery'){
    const input=page.locator('.sd-workspace input[type=radio]').first();await input.check();steps.push(await confirm(position,'Confirm discovery'));
    const store=page.getByRole('button',{name:/Store.*part|Store for later|Store Conformal|Keep in storage/i});
    if(await store.count())await tap(store.first());
    else {const choice=page.getByRole('radio',{name:/Store/i});if(await choice.count())await tap(choice.first());}
    const available=await page.locator('.sd-workspace button').allTextContents();
    const confirmation=available.find(label=>/Confirm/.test(label));if(!confirmation)throw new Error(`Ancient part controls: ${available.join(' | ')}`);
    steps.push(await confirm(`${position}-ancient-part`,confirmation.trim()));
   }
   if(position==='retreat'){await tap(page.getByRole('button',{name:/^Retreat to Sector/}).first());steps.push(await confirm(position,'Confirm choice'));}
   if(position==='diplomacy'){await tap(page.getByRole('radio',{name:'Accept exchange',exact:true}));steps.push(await confirm(position,'Accept ambassadors'));}
   results.push({position,ok:true,steps});
  }catch(error){await page.screenshot({path:`${directory}/${position}-failure.png`,animations:'disabled'});results.push({position,ok:false,error:error.message,steps,buttons:await page.locator('.sd-workspace button').allTextContents()});}
 }
}finally{await browser.close();await writeFile(`${directory}/results.json`,JSON.stringify({site,viewport:{width:390,height:844},results,pageErrors:errors},null,2));}
console.log(JSON.stringify(results));assert.deepEqual(errors,[]);assert.ok(results.every(result=>result.ok),'One or more mobile pending workflows failed; see results.json');
