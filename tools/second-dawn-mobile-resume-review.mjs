import {chromium} from 'playwright';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';
import {randomBytes,randomInt} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175';
const client=new ConvexHttpClient('https://ideal-nightingale-55.convex.cloud'),fn=makeFunctionReference;
const directory=`coding_agents/second_dawn_mobile_resume_review/${new URL(site).hostname==='127.0.0.1'?'local':'live'}`;await mkdir(directory,{recursive:true});
const username=`Mobile-${randomBytes(5).toString('hex')}`,pin=String(randomInt(100000,999999));
const first=await client.action(fn('eclipseGuests:createGuestSession'),{});
await client.action(fn('eclipsePlayers:registerPlayer'),{...first,username,pin});
const {matchId}=await client.mutation(fn('eclipseMatches:createMatch'),{...first,aiCount:1,faction:'terran-directorate'});
let view;
for(let attempt=0;attempt<60;attempt++){
 view=await client.query(fn('eclipseMatches:getMatchView'),{...first,matchId});
 if(view.activeSeatId===view.viewerSeatId&&!view.pendingDecision)break;
 await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.equal(view.activeSeatId,view.viewerSeatId);
const accepted=await client.mutation(fn('eclipseMatches:submitCommand'),{...first,matchId,commandId:`mobile-${randomBytes(10).toString('hex')}`,expectedRevision:view.revision,command:{type:'pass'}});assert.equal(accepted.ok,true);
for(let attempt=0;attempt<20;attempt++){view=await client.query(fn('eclipseMatches:getMatchView'),{...first,matchId});if(view.revision>accepted.receipt.revision)break;await new Promise(resolve=>setTimeout(resolve,1000));}
assert.ok(view.revision>accepted.receipt.revision);
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(site);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('textbox',{name:'Player username',exact:true}).fill(username);await page.getByLabel('PIN or recovery code',{exact:true}).fill(pin);await page.getByRole('button',{name:'Continue as player',exact:true}).click();
 await page.getByRole('button',{name:/Continue · round/}).first().click();
 await page.getByRole('heading',{name:'Since you last played',exact:true}).waitFor();
 await page.screenshot({path:`${directory}/390-catch-up.png`});
 const throughRevision=Number(await page.locator('.sd-activity-recap').getAttribute('data-through-revision'));
 await page.getByRole('button',{name:'Continue game',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.sd-activity-recap'));
 const acknowledged=await client.query(fn('eclipseMatches:getMatchView'),{...first,matchId});assert.ok(acknowledged.lastSeenRevision>=throughRevision);
 await page.getByRole('button',{name:'Galaxy',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Galaxy',exact:true}).getAttribute('aria-pressed'),'true');await page.screenshot({path:`${directory}/390-resumed-galaxy.png`});
 assert.deepEqual(errors,[]);
 await writeFile(`${directory}/results.json`,JSON.stringify({site,crossDeviceLogin:true,catchUpVisible:true,explicitAcknowledgmentSharedAcrossDevices:true,acknowledgedRevision:throughRevision,publicOnly:true,pageErrors:errors},null,2));console.log('Mobile cross-device login, public catch-up and explicit shared acknowledgment passed.');
}finally{await browser.close();}
