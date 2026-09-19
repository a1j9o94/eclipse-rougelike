import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
const env=await readFile('.env.local','utf8');
const url=env.match(/^VITE_CONVEX_URL=["']?([^\s"']+)/m)?.[1];if(!url)throw new Error('Configured development backend required');
const client=new ConvexHttpClient(url),base=process.env.REVIEW_BASE_URL??'http://127.0.0.1:5173';
const directory='coding_agents/second_dawn_game_recovery_live_review';await mkdir(directory,{recursive:true});
const host=await client.action(api.eclipseGuests.createGuestSession,{}),guest=await client.action(api.eclipseGuests.createGuestSession,{});
const settings={humanSeatCount:2,aiCount:0,timerMs:172800000,warpPortals:true,showCombatOdds:true};
const room=await client.mutation(api.eclipseRooms.createRoom,{...host,settings,faction:'hydran'});
await client.mutation(api.eclipseRooms.joinRoom,{...guest,roomToken:room.roomToken,faction:'planta'});
for(const person of [host,guest])await client.mutation(api.eclipseRooms.setRoomReady,{...person,roomToken:room.roomToken,ready:true});
const {matchId}=await client.mutation(api.eclipseRooms.startRoom,{...host,roomToken:room.roomToken});
const browser=await chromium.launch(),errors=[],checks=[];
const hostContext=await browser.newContext({viewport:{width:1440,height:900}}),guestContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const pages=[];
for(const [context,person] of [[hostContext,host],[guestContext,guest]]){await context.addInitScript(({credential})=>localStorage.setItem('eclipse.second-dawn.guest.v1',credential),person);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));pages.push(page);await page.goto(`${base}/room/${room.roomToken}`);await page.getByRole('button',{name:/^(Game settings|Settings)$/}).waitFor();}
const [hp,gp]=pages;
async function view(person=host){return client.query(api.eclipseMatches.getMatchView,{...person,matchId});}
async function poll(check){for(let i=0;i<80;i++){const value=await check();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out waiting for authoritative state');}
async function requestUndo(){await hp.getByRole('button',{name:'Settings',exact:true}).click();await hp.getByRole('button',{name:'History & undo',exact:true}).click();await hp.getByRole('button',{name:'Undo to before this action',exact:true}).filter({visible:true}).first().click();await hp.getByRole('button',{name:'Request undo',exact:true}).click();await gp.getByRole('button',{name:'Approve undo',exact:true}).waitFor();}
try{
 const initial=await view();assert.equal(initial.showCombatOdds,true);
 const actor=initial.activeSeatId===initial.viewerSeatId?host:guest,actorPage=actor===host?hp:gp;
 // Start via the real client workflow: mobile command palette or desktop Pass.
 if(actor===guest){await actorPage.getByRole('button',{name:'Choose action',exact:true}).click();await actorPage.getByRole('group',{name:'Choose your action'}).getByRole('button',{name:/^Pass/}).click();}
 else await actorPage.getByRole('button',{name:/^Pass/}).click();
 await poll(async()=>((await view()).revision>initial.revision));
 await requestUndo();
 await hp.screenshot({path:`${directory}/desktop-host-request.png`});await gp.screenshot({path:`${directory}/mobile-guest-vote.png`});
 await gp.reload();await gp.getByRole('button',{name:'Approve undo',exact:true}).waitFor();checks.push('Vote survives guest reload');
 await gp.getByRole('button',{name:'Approve undo',exact:true}).click();
 const restored=await poll(async()=>{const status=await client.query(api.eclipseRollback.getRollbackStatus,{...host,matchId});return status.lastResolution?.status==='applied'&&await view();});
 assert.equal(restored.activeSeatId,initial.activeSeatId);assert.deepEqual(restored.seats.map(s=>s.resources),initial.seats.map(s=>s.resources));assert(restored.revision>initial.revision);checks.push('Shared approved undo restores resources and active turn with higher revision');
 // Make another reversible accepted command, then reject the next request.
 const actorView=await view(actor);await client.mutation(api.eclipseMatches.submitCommand,{...actor,matchId,commandId:crypto.randomUUID(),expectedRevision:actorView.revision,command:{type:'pass'}});
 if(await hp.getByRole('button',{name:'Close undo game actions'}).isVisible())await hp.getByRole('button',{name:'Close undo game actions'}).click();
 await requestUndo();await gp.getByRole('button',{name:'Keep current game',exact:true}).click();
 await poll(async()=>(await client.query(api.eclipseRollback.getRollbackStatus,{...host,matchId})).lastResolution?.status==='rejected');checks.push('Declining preserves current play');
 await hp.getByRole('button',{name:'Game menu',exact:true}).click();await hp.getByRole('button',{name:'Save & return home',exact:true}).click();await hp.getByRole('heading',{name:'Active games',exact:true}).waitFor();checks.push('Save and return home preserves active game');
 await hp.goto(`${base}/room/${room.roomToken}`);await hp.getByRole('button',{name:'Game menu',exact:true}).click();await hp.getByRole('button',{name:'Resign from game',exact:true}).click();await hp.screenshot({path:`${directory}/desktop-resign.png`});await hp.getByRole('button',{name:'Confirm resignation',exact:true}).click();await hp.getByText('Past games (1)',{exact:true}).waitFor();
 const resigned=await view();assert.equal(resigned.participation,'resigned');assert.equal(resigned.seats.find(s=>s.id===resigned.viewerSeatId).controller,'ai');checks.push('Resignation hands seat to AI and archives it');
 await gp.getByRole('button',{name:/^Game (menu|room)$/}).click();await gp.getByRole('button',{name:'Quit this game',exact:true}).click();await gp.getByRole('button',{name:'Confirm quit',exact:true}).click();await gp.getByText('Past games (1)',{exact:true}).waitFor();assert.equal((await view(guest)).matchLifecycle,'abandoned');checks.push('Last human quits without invented scoring');
 assert.deepEqual(errors,[]);await writeFile(`${directory}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),base,checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
} catch(error){console.log('Host:',(await hp.locator('body').innerText()).slice(-3500));console.log('Guest:',(await gp.locator('body').innerText()).slice(-2500));throw error;}finally{await browser.close();}
