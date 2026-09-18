import{chromium}from'playwright';
const b=await chromium.launch();
for(const[width,height]of[[1366,768],[1440,900],[1920,1080]])for(const [position,action]of[['opening-three','Build'],['workflow-move','Move']]){
const p=await b.newPage({viewport:{width,height}});await p.goto(`http://127.0.0.1:5175/?position=${position}#second-dawn-preview`);await p.getByRole('button',{name:action,exact:true}).first().click();
if(action==='Build'){console.log(await p.getByRole('dialog').innerText());await p.getByRole('button',{name:'Add dreadnought',exact:true}).click();}
else {console.log(await p.locator('.dg-movement-planner').innerText());const c=p.locator('.dg-movement-planner input:enabled').first();if(await c.count()){await c.check();const target=p.getByRole('button',{name:/legal move destination/}).first();await target.waitFor();await target.click();}}
await p.waitForTimeout(350);await p.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-${action.toLowerCase()}-planner.png`});await p.close();}
await b.close();
