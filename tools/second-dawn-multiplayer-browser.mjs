import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';

const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175';
// Vite's local review server and the Vercel preview both target the approved development
// deployment. A dedicated local Convex instance remains available by explicit override.
const backend=process.env.SECOND_DAWN_CONVEX_URL??'https://ideal-nightingale-55.convex.cloud';
const evidenceLabel=(process.env.SECOND_DAWN_EVIDENCE_LABEL??(new URL(site).hostname==='127.0.0.1'?'local':'live')).replace(/[^a-z0-9_-]/gi,'-');
const directory=`coding_agents/second_dawn_multiplayer_browser/${evidenceLabel}`;
const timeout=30_000;
const client=new ConvexHttpClient(backend);
const getRoom=makeFunctionReference('eclipseRooms:getRoom');
const getMatchView=makeFunctionReference('eclipseMatches:getMatchView');
const getMatchHistory=makeFunctionReference('eclipseMatches:getMatchHistory');
const submitCommand=makeFunctionReference('eclipseMatches:submitCommand');
const createGuest=makeFunctionReference('eclipseGuests:createGuestSession');

/** Resolve only after a predicate becomes true, while keeping an actionable timeout. */
async function eventually(predicate,message,{within=45_000,interval=250}={}){
 const deadline=Date.now()+within;let last;
 while(Date.now()<deadline){
  try{last=await predicate();if(last)return last;}catch(error){last=error;}
  await new Promise(resolve=>setTimeout(resolve,interval));
 }
 throw Error(`${message}${last instanceof Error?`: ${last.message}`:''}`);
}
async function identity(page){
 const value=await page.evaluate(()=>({credential:localStorage.getItem('eclipse.second-dawn.guest.v1'),matchId:localStorage.getItem('eclipse.second-dawn.match.v1')}));
 assert.ok(value.credential,'Guest credential was not persisted.');
 return value;
}
async function screenshotSizes(page,label){
 const captures=[];
 for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){
  await page.setViewportSize({width,height});
  await page.screenshot({path:`${directory}/${width}x${height}-${label}.png`,fullPage:false});
  captures.push({width,height,label,horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 return captures;
}

await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true});
const hostContext=await browser.newContext();
const guestContext=await browser.newContext();
const host=await hostContext.newPage();
const guest=await guestContext.newPage();
host.setDefaultTimeout(timeout);guest.setDefaultTimeout(timeout);
const errors=[];
for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
const evidence={
 evidence:'Agent-operated two-browser authoritative multiplayer check. No guest credentials, room token, or match id are recorded.',
 site,backend,checkedAt:new Date().toISOString(),
 captures:[],
};

try{
 // Host creates a minimum two-human room and intentionally chooses the shortest supported timer.
 await host.goto(site,{waitUntil:'domcontentloaded'});
 await host.getByRole('button',{name:'Create multiplayer room',exact:true}).click();
 await host.getByRole('button',{name:'Terran Directorate, Red board',exact:true}).click();
 await host.getByRole('button',{name:'30 seconds',exact:true}).click();
 await host.getByRole('button',{name:'Create room',exact:true}).click();
 const inviteInput=host.getByLabel('Room invitation link');
 await inviteInput.waitFor();
 const invite=await inviteInput.inputValue();
 const inviteUrl=new URL(invite);
 const roomToken=decodeURIComponent(inviteUrl.pathname.split('/').filter(Boolean).at(-1)??'');
 assert.ok(roomToken,'Room invitation did not contain a token.');
 evidence.captures.push(...await screenshotSizes(host,'lobby-host'));

 // A separate browser gets a separate anonymous guest credential and claims an unused board color.
 await guest.goto(invite,{waitUntil:'domcontentloaded'});
 await guest.getByRole('button',{name:'Hydran Progress, Blue board',exact:true}).click();
 await guest.getByRole('button',{name:'Join room',exact:true}).click();
 await guest.getByRole('button',{name:'Ready to play',exact:true}).waitFor();
 await host.getByRole('button',{name:'Ready to play',exact:true}).waitFor();
 const hostIdentity=await identity(host);
 const guestIdentity=await identity(guest);
 assert.notEqual(hostIdentity.credential,guestIdentity.credential,'Two browser contexts shared a guest credential.');
 const joined=await eventually(async()=>{
  const lobby=await client.query(getRoom,{roomToken,credential:hostIdentity.credential});
  return lobby?.seats.filter(seat=>seat.occupied).length===2?lobby:null;
 },'Guest did not appear in the host lobby.');
 assert.equal(joined.seats[0].faction,'terran-directorate');
 assert.equal(joined.seats[1].faction,'hydran');

 // Selecting a faction or roster resets ready state, then each actual seat readies itself.
 await host.getByRole('button',{name:'Ready to play',exact:true}).click();
 await guest.getByRole('button',{name:'Ready to play',exact:true}).click();
 await eventually(async()=>{
  const lobby=await client.query(getRoom,{roomToken,credential:hostIdentity.credential});
  return lobby?.seats.every(seat=>seat.occupied&&seat.ready)?lobby:null;
 },'Both room seats did not become ready.');
 await host.getByRole('button',{name:'Start room game',exact:true}).click();
 await host.getByRole('button',{name:'Game room',exact:true}).waitFor();
 await guest.getByRole('button',{name:'Game room',exact:true}).waitFor();
 evidence.captures.push(...await screenshotSizes(host,'playing-host'));

 const started=await eventually(async()=>{
  const lobby=await client.query(getRoom,{roomToken,credential:hostIdentity.credential});
  return lobby?.status==='playing'&&lobby.matchId?lobby:null;
 },'Room did not become a playing match.');
 const matchId=started.matchId;
 assert.equal(await host.evaluate(()=>localStorage.getItem('eclipse.second-dawn.match.v1')),matchId,'Host did not store the started match.');
 assert.equal(await guest.evaluate(()=>localStorage.getItem('eclipse.second-dawn.match.v1')),matchId,'Guest did not store the started match.');
 const hostView=await client.query(getMatchView,{credential:hostIdentity.credential,matchId});
 const guestView=await client.query(getMatchView,{credential:guestIdentity.credential,matchId});
 assert.equal(hostView.viewerSeatId,'seat-1');
 assert.equal(guestView.viewerSeatId,'seat-2');
 assert.equal(hostView.private.seatId,'seat-1');
 assert.equal(guestView.private.seatId,'seat-2');
 assert.equal(hostView.pendingDecision,null);
 assert.equal(guestView.pendingDecision,null);

 // Read-only server privacy checks: anonymous strangers cannot fetch a match view, and a
 // participant's response contains only their own private seat payload.
 const stranger=await client.action(createGuest,{});
 const unauthorized=await client.query(getMatchView,{credential:stranger.credential,matchId});
 assert.equal(unauthorized,null,'A guest without a room seat received a private match view.');
 const publicLobby=await client.query(getRoom,{roomToken});
 assert.equal(publicLobby.viewerSlot,null);
 assert.equal(JSON.stringify(publicLobby).includes(hostIdentity.credential),false);
 assert.equal(JSON.stringify(guestView.private).includes('seat-1'),false,'Guest private payload exposed host private seat identity.');

 // Seat 1 takes an actual legal action. Seat 2 receives the same public revision but cannot
 // submit seat 1's turn, proving the browser is not merely rendering a duplicated local board.
 const revisionBefore=hostView.revision;
 await host.getByRole('button',{name:'Pass',exact:true}).click();
 const afterPass=await eventually(async()=>{
  const view=await client.query(getMatchView,{credential:hostIdentity.credential,matchId});
  return view.revision>revisionBefore?view:null;
 },'Host action was not accepted by the authoritative match.');
 const guestAfterPass=await client.query(getMatchView,{credential:guestIdentity.credential,matchId});
 assert.equal(guestAfterPass.revision,afterPass.revision,'Guest did not receive the host action revision.');
 const wrongSeat=await client.mutation(submitCommand,{credential:hostIdentity.credential,matchId,commandId:`browser-wrong-seat-${crypto.randomUUID()}`,expectedRevision:guestAfterPass.revision,command:{type:'pass'}});
 assert.equal(wrongSeat.ok,false);
 assert.equal(wrongSeat.error.code,'NOT_YOUR_TURN');

 // Offline disables a real current-seat submission, then reconnect preserves the same game.
 await guestContext.setOffline(true);
 await guest.getByText('Disconnected · waiting to reconnect',{exact:true}).waitFor();
 assert.equal(await guest.getByRole('button',{name:'Pass',exact:true}).isDisabled(),true,'Offline guest could submit a turn command.');
 await guestContext.setOffline(false);
 await guest.waitForFunction(()=>!document.querySelector('.dg-action-panel .sd-primary')?.disabled);

 // Reload through the invitation path, not a retained React state. The participant returns to
 // the same room and the same authoritative match.
 await guest.goto(invite,{waitUntil:'domcontentloaded'});
 await guest.getByRole('button',{name:'Game room',exact:true}).waitFor();
 assert.equal(await guest.evaluate(()=>localStorage.getItem('eclipse.second-dawn.match.v1')),matchId,'Room reload opened a different match.');

 // The 30-second deadline transfers the inactive human seat to bounded Normal AI. The seat
 // controller remains human and the active turn returns to the host after the automated turn.
 const beforeTimeout=await client.query(getRoom,{roomToken,credential:hostIdentity.credential});
 assert.equal(beforeTimeout.timer?.targetSeatId,'seat-2');
 assert.equal(beforeTimeout.timer?.status,'active');
 const timeoutView=await eventually(async()=>{
  const lobby=await client.query(getRoom,{roomToken,credential:hostIdentity.credential});
  const view=await client.query(getMatchView,{credential:hostIdentity.credential,matchId});
  if(lobby?.timer?.status==='failed')throw Error(`Timer AI failed: ${lobby.timer.error??'no error supplied'}`);
  return view.activeSeatId==='seat-1'&&view.revision>afterPass.revision?{lobby,view}:null;
 },'Thirty-second timeout AI did not finish seat 2 and return the turn to seat 1.',{within:100_000,interval:500});
 assert.equal(timeoutView.view.seats.find(seat=>seat.id==='seat-2')?.controller,'human');
 const history=await client.query(getMatchHistory,{credential:hostIdentity.credential,matchId,limit:100});
 assert.ok(history?.entries.some(entry=>entry.summary.startsWith('AI takeover · ')),'The timed-out AI command was not labeled in public history.');
 await host.getByRole('button',{name:'History',exact:true}).click();
 await host.getByRole('log',{name:'Match actions',exact:true}).waitFor();
 await host.getByText(/AI takeover · /).first().waitFor();
 await host.screenshot({path:`${directory}/timeout-history.png`,fullPage:false});

 evidence.roomCreated=true;
 evidence.distinctGuests=true;
 evidence.distinctFactions=true;
 evidence.readyAndHostStart=true;
 evidence.sameMatchForBothSeats=true;
 evidence.privateViewOwnership=true;
 evidence.unauthorizedViewDenied=true;
 evidence.correctSeatActionAccepted=true;
 evidence.wrongSeatCommandDenied=true;
 evidence.offlineSubmissionDisabled=true;
 evidence.roomReloadResumed=true;
 evidence.timeoutAiReturnedHumanSeat=true;
 evidence.timeoutAiHistoryVisible=true;
 evidence.pageErrors=errors;
 await writeFile(`${directory}/results.json`,JSON.stringify(evidence,null,2));
 assert.deepEqual(errors,[]);
 console.log('Multiplayer room create/join/ready/start/privacy/reconnect/timeout browser check passed.');
}catch(error){
 evidence.failure=error instanceof Error?error.message:String(error);
 evidence.pageErrors=errors;
 await writeFile(`${directory}/results.json`,JSON.stringify(evidence,null,2));
 throw error;
}finally{
 await browser.close();
}
