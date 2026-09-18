import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site=(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173').replace(/\/$/,'');
const directory='coding_agents/second_dawn_combat_flow_review';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const results=[];
async function publicRevision(page){return page.evaluate(()=>{const node=document.querySelector('.dg-app');const key=Object.keys(node).find(key=>key.startsWith('__reactFiber$'));let fiber=node[key];while(fiber.return)fiber=fiber.return;const stack=[fiber.stateNode.current];while(stack.length){const current=stack.pop();const view=current.memoizedProps?.view;if(view?.sectors&&Number.isInteger(view.revision))return view.revision;if(current.child)stack.push(current.child);if(current.sibling)stack.push(current.sibling);}throw Error('No public view');});}
async function accept(page,control){const before=await publicRevision(page);await control.click();assert.equal(await publicRevision(page),before+1,'One click accepts exactly one command');}

try{
 for(const [width,height] of [[1366,768],[1440,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${site}/?position=retreat#second-dawn-preview`);const roll=page.getByRole('button',{name:'Roll dice',exact:true});await roll.waitFor();
  const box=await roll.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=height,'Roll is visible without scrolling');
  assert.equal(await page.getByRole('button',{name:'Confirm choice',exact:true}).count(),0);
  await page.screenshot({path:`${directory}/${width}-combat-ready.png`,animations:'disabled'});
  await accept(page,roll);
  await page.reload();await page.getByRole('button',{name:'Retreat',exact:true}).click();
  await page.screenshot({path:`${directory}/${width}-retreat-routes.png`,animations:'disabled'});
  await accept(page,page.getByRole('button',{name:/^Retreat to Sector/}).first());
  await page.goto(`${site}/?position=combat#second-dawn-preview`);await page.getByRole('group',{name:'Volley targets'}).getByRole('button',{name:/^Target/}).first().click();
  await page.getByRole('button',{name:'Resolve volley',exact:true}).click();const impacts=page.getByRole('region',{name:'Recent combat impacts'});await impacts.waitFor();
  const casualty=impacts.getByRole('group',{name:'Interceptor destroyed'});const casualtyBox=await casualty.boundingBox();assert.ok(casualtyBox&&casualtyBox.y>=0&&casualtyBox.y+casualtyBox.height<height-50,'Destruction card visible without scrolling');assert.match(await impacts.innerText(),/1 ship destroyed/);assert.match(await impacts.innerText(),/Interceptor/);
  await page.screenshot({path:`${directory}/${width}-ship-destroyed.png`,animations:'disabled'});
  const text=await impacts.innerText();assert.deepEqual(errors,[]);results.push({width,height,rollVisibleWithoutScrolling:true,rollAccepted:true,retreatAccepted:true,casualtyText:text,pageErrors:errors});await page.close();
 }
}finally{await browser.close();await writeFile(`${directory}/results.json`,JSON.stringify({site,results},null,2));}
console.log(JSON.stringify(results));
