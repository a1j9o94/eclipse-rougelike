import{chromium}from'playwright';import{mkdir,writeFile}from'node:fs/promises';
const dir='coding_agents/second_dawn_mobile_actions';await mkdir(dir,{recursive:true});const b=await chromium.launch();const results=[];
async function openAction(p,action){await p.getByRole('button',{name:'Choose action'}).click();await p.getByRole('group',{name:'Choose your action'}).getByRole('button',{name:new RegExp(`^${action}`)}).click();}
for(const action of['Explore','Research','Build','Move','Influence','Upgrade']){
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const fixture=action==='Explore'?'opening':['Upgrade','Research'].includes(action)?'midgame':`workflow-${action.toLowerCase()}`;
 await p.goto(`http://127.0.0.1:5175/?position=${fixture}#second-dawn-preview`);await p.getByRole('navigation',{name:'Mobile game navigation'}).waitFor();await openAction(p,action);
 if(action==='Explore'){
  await p.getByRole('button',{name:/^Explore/}).first().click();await p.getByRole('button',{name:'Confirm action',exact:true}).click();
  await p.locator('.dg-exploration-decision').waitFor();
 }else if(action==='Research'){
  const tech=p.locator('.sd-tech').filter({hasText:'Improved Hull'}).first();await tech.click();await p.getByRole('button',{name:'Confirm action',exact:true}).click();
 }else if(action==='Build'){
  await p.getByRole('button',{name:'Details',exact:true}).click();await p.getByRole('button',{name:'Add interceptor',exact:true}).click();await p.getByRole('button',{name:'Confirm build',exact:true}).click();
 }else if(action==='Move'){
  await p.getByRole('button',{name:'Expand Move details'}).click();await p.getByRole('checkbox').first().check();await p.getByRole('button',{name:'Collapse Move details'}).click();await p.getByRole('button',{name:/^Inspect sector.*legal move destination/}).first().click();await p.getByRole('button',{name:/^Confirm move/}).click();
 }else if(action==='Influence'){
  await p.getByRole('button',{name:'Expand Influence details'}).click();await p.getByRole('button',{name:'Refresh colony ships',exact:true}).click();await p.getByRole('button',{name:'Confirm influence',exact:true}).click();
 }else if(action==='Upgrade'){
  await p.getByRole('button',{name:'Interceptor',exact:true}).click();await p.getByRole('button',{name:/Slot 4:/}).click();await p.getByRole('button',{name:'Install Hull in slot 4',exact:true}).click();await p.getByRole('button',{name:'Confirm blueprint',exact:true}).click();
 }
 await p.screenshot({path:`${dir}/${action.toLowerCase()}.png`,animations:'disabled'});
 if(await p.getByRole('button',{name:'Back',exact:true}).isVisible())await p.getByRole('button',{name:'Back',exact:true}).click();
 await p.getByRole('button',{name:'Activity',exact:true}).click();await p.locator('.dg-history-panel').getByText(/Round /).first().waitFor();
 const acceptedAction=await p.locator('.dg-history-scroll li').first().innerText();
 results.push({action,acceptedAction,...await p.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,notice:document.querySelector('.dg-action-draft-notice')?.textContent??null,screen:document.querySelector('.dg-mobile-board')?.getAttribute('data-mobile-screen')}))});
 await p.close();
}
await b.close();await writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
