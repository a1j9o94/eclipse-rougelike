import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
const env=await readFile('.env.local','utf8');
const backend=env.match(/^VITE_CONVEX_URL=["']?([^\s"']+)/m)?.[1];
assert(backend,'Configured development backend required');
const client=new ConvexHttpClient(backend),base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5173';
const directory='coding_agents/second_dawn_history_truncation_live_review';await mkdir(directory,{recursive:true});
const host=await client.action(api.eclipseGuests.createGuestSession,{}),guest=await client.action(api.eclipseGuests.createGuestSession,{});
const room=await client.mutation(api.eclipseRooms.createRoom,{...host,settings:{humanSeatCount:2,aiCount:0,timerMs:172800000,warpPortals:true,showCombatOdds:false},faction:'hydran'});
await client.mutation(api.eclipseRooms.joinRoom,{...guest,roomToken:room.roomToken,faction:'planta'});
for(const person of [host,guest])await client.mutation(api.eclipseRooms.setRoomReady,{...person,roomToken:room.roomToken,ready:true});
const {matchId}=await client.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});
const browser=await chromium.launch(),errors=[],checks=[],pages=[];
const view=person=>client.query(api.eclipseMatches.getMatchView,{...person,matchId});
async function poll(fn){for(let i=0;i<100;i++){const result=await fn();if(result)return result;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Authoritative update timed out');}
async function acknowledge(page){const button=page.getByRole('button',{name:'View turn',exact:true});if(await button.isVisible())await button.click();}
try{
 for(const person of [host,guest]){const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addInitScript(({credential})=>localStorage.setItem('eclipse.second-dawn.guest.v1',credential),person);const page=await context.newPage();pages.push(page);page.on('pageerror',error=>errors.push(error.message));await page.goto(`${base}/room/${room.roomToken}`);await page.getByRole('button',{name:'Settings',exact:true}).waitFor();}
 const [hp,gp]=pages,initial=await view(host),actor=initial.activeSeatId===initial.viewerSeatId?host:guest,actorPage=actor===host?hp:gp;
 await actorPage.getByRole('dialog',{name:'Your turn',exact:true}).waitFor();await acknowledge(actorPage);
 await actorPage.getByRole('button',{name:/^Pass/}).click();
 await poll(async()=>(await view(host)).revision>initial.revision);
 assert.equal(await actorPage.getByText('Action saved',{exact:true}).count(),0);checks.push('Actual pass saves silently');
 await (actor===host?gp:hp).getByRole('dialog',{name:'Your turn',exact:true}).waitFor();
 for(const page of pages)await acknowledge(page);
 await hp.getByRole('button',{name:'History',exact:true}).click();await hp.getByRole('button',{name:'Undo to before this action',exact:true}).first().click();
 await hp.getByRole('button',{name:'Request undo',exact:true}).click();await gp.getByRole('button',{name:'Approve undo',exact:true}).waitFor();
 await gp.reload();await gp.getByRole('button',{name:'Approve undo',exact:true}).click();
 await poll(async()=>(await client.query(api.eclipseRollback.getRollbackStatus,{...host,matchId})).lastResolution?.status==='applied');
 const restored=await view(host),history=await client.query(api.eclipseMatches.getMatchHistory,{...host,matchId});
 assert.deepEqual(restored.seats.map(s=>s.resources),initial.seats.map(s=>s.resources));assert.equal(restored.activeSeatId,initial.activeSeatId);
 assert.equal(history.entries.some(entry=>entry.revision===1),false);assert.equal(history.entries.length,1);assert.equal(history.nextBeforeRevision,null);
 checks.push('Consent survives reload and restores starting resources/turn');checks.push('Selected action and future removed from public history');
 await hp.getByText('Game restored to before action #1.',{exact:true}).waitFor();
 for(const page of pages)await acknowledge(page);
 await hp.getByRole('dialog',{name:'Undo game actions',exact:true}).waitFor({state:'hidden'});
 await hp.getByText(`Saved · revision ${restored.revision}`,{exact:true}).waitFor({state:'attached'});
 await poll(async()=>{
  await acknowledge(hp);
  if(await hp.getByText('Restored an earlier position',{exact:true}).isVisible())return true;
  const button=hp.getByRole('button',{name:'History',exact:true});
  if(await button.getAttribute('aria-pressed')!=='true')await button.click();
  return false;
 });
 assert.equal(await hp.getByText('Passed · +2 money',{exact:true}).count(),0);
 assert.equal(await hp.getByRole('button',{name:'Load earlier actions',exact:true}).count(),0);
 await hp.screenshot({path:`${directory}/restored-history.png`});checks.push('Browser cache removes discarded rows and stops pagination');
 assert.deepEqual(errors,[]);await writeFile(`${directory}/results.json`,JSON.stringify({base,checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}catch(error){for(const page of pages)console.log((await page.locator('body').innerText()).slice(-4500));throw error;}finally{
 await browser.close();
 for(const person of [host,guest]){const current=await view(person);if(current?.canResign)await client.mutation(api.eclipseMatches.resignMatch,{...person,matchId,commandId:crypto.randomUUID(),expectedRevision:current.revision});}
}
