import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import assert from 'node:assert/strict';
const url=process.env.SECOND_DAWN_SITE_URL;
if(!url)throw Error('Set SECOND_DAWN_SITE_URL to the deployed site.');
const backend='https://ideal-nightingale-55.convex.cloud';
const directory='coding_agents/second_dawn_deployment_live';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
const client=new ConvexHttpClient(backend);
await page.goto(url);await page.getByRole('button',{name:'New game',exact:true}).click();await page.getByRole('button',{name:'Start game',exact:true}).click();await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();
const identity=await page.evaluate(()=>({credential:localStorage.getItem('eclipse.second-dawn.guest.v1'),matchId:localStorage.getItem('eclipse.second-dawn.match.v1')}));
assert.ok(identity.credential&&identity.matchId);
const getView=()=>client.query(makeFunctionReference('eclipseMatches:getMatchView'),identity);
const initial=await getView();assert.equal(initial.revision,0);assert.equal(initial.seats.length,3);
await page.screenshot({path:`${directory}/opening.png`});
await page.reload();await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();assert.equal((await getView()).revision,initial.revision);
await page.locator('.sd-frontier').first().click();await page.context().setOffline(true);await page.getByText('Disconnected · waiting to reconnect',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Confirm action',exact:true}).isDisabled(),true);
await page.context().setOffline(false);await page.waitForFunction(()=>!document.querySelector('.dg-action-panel .sd-primary')?.disabled);await page.getByRole('button',{name:'Confirm action',exact:true}).click();await page.locator('.dg-exploration-decision').getByRole('heading',{name:/^exploration$/i}).waitFor();const pending=(await getView()).pendingDecision;
await page.reload();await page.locator('.dg-exploration-decision').getByRole('heading',{name:/^exploration$/i}).waitFor();assert.deepEqual((await getView()).pendingDecision,pending);await page.screenshot({path:`${directory}/resumed-exploration.png`});
// Create another game through the UI and pass, so scheduled AI jobs can progress.
await page.goto(url);await page.getByRole('button',{name:'New game',exact:true}).click();await page.getByRole('button',{name:'Start game',exact:true}).click();await page.getByRole('button',{name:/^Game (menu|room)$/}).waitFor();
const aiMatchId=await page.evaluate(()=>localStorage.getItem('eclipse.second-dawn.match.v1'));
await page.getByRole('button',{name:'Pass',exact:true}).click();
let aiView;for(let i=0;i<45;i++){aiView=await client.query(makeFunctionReference('eclipseMatches:getMatchView'),{credential:identity.credential,matchId:aiMatchId});if(aiView.aiStatus?.status==='failed')throw Error('AI job failed: '+aiView.aiStatus.error);if(aiView.revision>=4)break;await new Promise(resolve=>setTimeout(resolve,1000));}
assert.ok(aiView.revision>=4,'AI must accept multiple decisions after the human passes.');assert.deepEqual(errors,[]);
await page.getByRole('button',{name:'History',exact:true}).click();await page.waitForFunction(()=>new Set([...document.querySelectorAll('.dg-history-byline strong')].map(node=>node.textContent)).size>=2);

await writeFile(`${directory}/smoke.json`,JSON.stringify({url,backend,checkedAt:new Date().toISOString(),gameCreated:true,seats:initial.seats.length,revisionSurvivedReload:true,offlineSubmissionDisabled:true,reconnectedSubmissionAccepted:true,pendingExplorationSurvivedReload:true,aiAdvancedToRevision:aiView.revision,aiJobStatus:aiView.aiStatus?.status,humanAndAiHistoryVisible:true,publicScoreVisible:await page.locator('.dg-running-score').isVisible(),pageErrors:errors,evidence:'Agent-operated real deployed browser and read-only API verification. Credentials never recorded.'},null,2));await browser.close();console.log('Live creation, save/resume, offline guard, reconnect, pending decision recovery and scheduled AI progression passed.');
