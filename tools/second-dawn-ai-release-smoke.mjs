import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const site=process.env.SECOND_DAWN_SITE_URL;
if(!site)throw new Error('Set SECOND_DAWN_SITE_URL to the site under review.');
const output=process.env.SECOND_DAWN_REVIEW_OUTPUT??'.second-dawn/ai-release/live';
await mkdir(output,{recursive:true});
const client=new ConvexHttpClient('https://ideal-nightingale-55.convex.cloud');
const browser=await chromium.launch();const results=[];
try{
 for(const difficulty of ['normal','hard','expert']){
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(site);await page.getByRole('button',{name:'New game',exact:true}).click();
  await page.getByLabel('AI opponents').selectOption(difficulty==='expert'?'5':'1');
  await page.getByRole('button',{name:new RegExp(`^${difficulty}`, 'i')}).click();
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();
  const identity=await page.evaluate(()=>({credential:localStorage.getItem('eclipse.second-dawn.guest.v1'),matchId:localStorage.getItem('eclipse.second-dawn.match.v1')}));
  assert.ok(identity.credential&&identity.matchId);
  const getView=()=>client.query(makeFunctionReference('eclipseMatches:getMatchView'),identity);
  const initial=await getView();assert.equal(initial.aiDifficulty,difficulty);
  await page.reload();await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();
  assert.equal((await getView()).aiDifficulty,difficulty);
  // A random starter can put several Expert seats ahead of the human in a six-seat match.
  const pass=page.getByRole('button',{name:/^Pass(?: \+2 money| for this round)?$/});
  await pass.click({trial:true,timeout:180_000});
  let autoPassSurvivedReload=false;
  if(difficulty==='normal'){
   await page.getByRole('checkbox',{name:'Auto-pass unless attacked'}).check();
   const savedAt=Date.now();
   while(!(await getView()).seats.find(seat=>seat.id===initial.viewerSeatId).autoPassUnlessAttacked){
    assert.ok(Date.now()-savedAt<15_000,'Auto-pass preference saved');await new Promise(resolve=>setTimeout(resolve,100));
   }
   await page.reload();await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();
   autoPassSurvivedReload=await page.getByRole('checkbox',{name:'Auto-pass unless attacked'}).isChecked();assert.ok(autoPassSurvivedReload);
  }
  const beforePass=await getView();
  await pass.click({timeout:180_000});
  const started=Date.now(),diagnostics=[],states=new Set();let progressed=false,thinkingImage=false;
  while(Date.now()-started<100_000){
   const view=await getView();states.add(view.aiStatus?.status);
   assert.notEqual(view.aiStatus?.status,'failed','Hosted AI job failed; inspect targeted diagnostics.');
   if(view.aiStatus?.status==='thinking'&&!thinkingImage){await page.screenshot({path:`${output}/${difficulty}-thinking.png`});thinkingImage=true;}
   if(view.revision>beforePass.revision+1&&view.aiStatus?.status!=='thinking'){
    const raw=execFileSync('npx',['convex','run','--deployment-name','ideal-nightingale-55','eclipseMatches:getAiDiagnostics',JSON.stringify({matchId:identity.matchId})],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    const report=JSON.parse(raw);diagnostics.push(report);
    await writeFile(`${output}/${difficulty}-diagnostics.json`,JSON.stringify(diagnostics,null,2));
    if(difficulty==='normal'||report.lastPlanNodes>0||view.activeSeatId===view.viewerSeatId||view.pendingDecision?.owner===view.viewerSeatId||view.revision>12){progressed=true;break;}
   }
   await new Promise(resolve=>setTimeout(resolve,300));
  }
  assert.ok(progressed,'AI accepted commands within the smoke deadline');
  await page.screenshot({path:`${output}/${difficulty}-accepted.png`});
  assert.deepEqual(errors,[]);
  const current=await getView();
  results.push({difficulty,players:initial.seats.length,matchId:identity.matchId,initialStarter:initial.startSeatId,humanSeat:initial.viewerSeatId,revision:current.revision,settingsSurvivedReload:true,autoPassSurvivedReload,states:[...states],observedThinking:thinkingImage,elapsedMs:Date.now()-started,diagnostics,errors});
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
  console.log(`${difficulty}: ${initial.seats.length} seats, revision ${current.revision}, no page/job errors.`);
  await page.close();
 }
}finally{await browser.close();}
