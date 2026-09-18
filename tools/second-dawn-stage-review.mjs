import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const site=(process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175').replace(/\/$/,'');
const dir='coding_agents/second_dawn_stage_live_review';await mkdir(dir,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
try {
 for(const position of ['opening','midgame','late','combat','ancients','exploration-ancients','ancient-combat']){
  await p.goto(`${site}/?position=${position}#second-dawn-preview`);await p.getByRole('navigation',{name:'Preview game stages'}).waitFor();assert.equal(await p.getByLabel('Review position').inputValue(),position);
  if(['opening','midgame','late'].includes(position))await p.getByRole('button',{name:'Fit',exact:true}).click();
  if(position==='ancients')assert.equal(await p.getByRole('group',{name:'Ancients · 1 Ancient'}).count(),1);
  if(position==='exploration-ancients')assert.equal(await p.getByText('1 Ancient defend this sector',{exact:true}).count(),1);
  if(position.includes('combat')){await p.getByRole('region',{name:'Active battle overview'}).waitFor();assert.equal(await p.getByRole('button',{name:'Confirm choice',exact:true}).count(),1);}
  await p.screenshot({path:`${dir}/1440x900-${position}.png`,animations:'disabled'});results.push({position,directLinkOpened:true});
 }
 assert.deepEqual(errors,[]);
}finally{await b.close();}
await writeFile(`${dir}/results.json`,JSON.stringify({site,results,pageErrors:errors,evidence:'Agent browser review of real engine fixture views'},null,2));console.log('All seven stage/Ancient direct links opened their real engine positions without page errors.');
