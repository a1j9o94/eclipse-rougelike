import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
const output=process.env.SECOND_DAWN_REVIEW_OUTPUT??'coding_agents/second_dawn_empire_map_review';await mkdir(output,{recursive:true});
const b=await chromium.launch();const results=[];
try{for(const [width,height]of [[1366,768],[1440,900],[1920,1080],[390,844],[360,800]]){
 const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`${site}/?position=midgame#second-dawn-preview`);const map=p.getByRole('group',{name:'Galaxy map'});await map.waitFor();
 assert.equal(await map.locator('[data-wormhole-kind="printed"]').count(),0);const links=await map.locator('[data-connection="wormhole"]').count();assert.ok(links>0);assert.equal(await map.locator('[data-wormhole-kind="wormhole"]').count(),links*2);
 await p.screenshot({path:`${output}/${width}-connected-board.png`});
 await p.getByRole('button',width<700?{name:'Game settings',exact:true}:{name:'Settings',exact:true}).click();const settings=p.getByRole('dialog',{name:'Game settings'});await settings.getByRole('checkbox',{name:/3D combat dice/}).uncheck();assert.equal(await p.evaluate(()=>localStorage.getItem('eclipse.second-dawn.dice3d.v1')),'off');await p.screenshot({path:`${output}/${width}-settings.png`});await settings.getByRole('button',{name:'Back to game'}).click();
 await p.goto(`${site}/?position=exploration-ancients#second-dawn-preview`);await p.getByRole('region',{name:'Exploration placement preview'}).waitFor();const printed=await p.getByRole('group',{name:'Galaxy map'}).locator('[data-wormhole-kind="printed"]').count();assert.ok(printed>0);await p.screenshot({path:`${output}/${width}-placement-openings.png`});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);results.push({width,height,pairedConnections:links,printedPlacementOpenings:printed,settingSaved:true,errors});await p.close();
}}finally{await b.close();}await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log('Connected edges, placement openings, saved settings, five viewports passed.');
