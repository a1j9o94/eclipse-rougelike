import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
const directory='coding_agents/second_dawn_history_browser';await mkdir(directory,{recursive:true});
const browser=await chromium.launch();const checks=[];
for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){
 const p=await browser.newPage({viewport:{width,height}});await p.goto('http://127.0.0.1:5175/?position=midgame#second-dawn-preview');await p.getByLabel('Review position').waitFor();await p.getByRole('button',{name:'History',exact:true}).click();await p.getByRole('log',{name:'Match actions'}).waitFor();await p.locator('.dg-history-scroll li').first().waitFor();await p.screenshot({path:`${directory}/${width}x${height}-preview.png`});checks.push({width,height,rows:await p.locator('.dg-history-scroll li').count(),...await p.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,verticalOverflow:document.documentElement.scrollHeight>innerHeight}))});await p.close();
}
const p=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5175/');await p.getByRole('button',{name:'New game',exact:true}).click();await p.getByRole('button',{name:'Start game',exact:true}).click();await p.getByRole('button',{name:'Game menu',exact:true}).waitFor();
await p.getByRole('button',{name:'Pass',exact:true}).click();await p.getByRole('button',{name:'History',exact:true}).click();
await p.waitForFunction(()=>document.querySelectorAll('.dg-history-scroll li').length>=4,{},{timeout:45000});
await p.waitForFunction(()=>document.querySelectorAll('.dg-history-scroll li').length>=8,{},{timeout:45000});
const anchor=await p.evaluate(()=>{const scroll=document.querySelector('.dg-history-scroll');scroll.scrollTop=220;const item=[...scroll.querySelectorAll('li')].find(li=>li.getBoundingClientRect().top>=scroll.getBoundingClientRect().top);return{text:item.querySelector('small').textContent,y:item.getBoundingClientRect().top,first:scroll.querySelector('li small').textContent};});
await p.waitForFunction(first=>document.querySelector('.dg-history-scroll li small').textContent!==first,anchor.first,{timeout:45000});
const anchorAfter=await p.evaluate(text=>{const item=[...document.querySelectorAll('.dg-history-scroll li')].find(li=>li.querySelector('small').textContent===text);return{y:item.getBoundingClientRect().top};},anchor.text);
await writeFile(`${directory}/scroll-anchor-check.json`,JSON.stringify({before:anchor,after:anchorAfter,delta:anchorAfter.y-anchor.y},null,2));
assert.ok(Math.abs(anchorAfter.y-anchor.y)<2,`Scrolled history jumped ${anchorAfter.y-anchor.y}px`);
const identity=await p.evaluate(()=>({credential:localStorage.getItem('eclipse.second-dawn.guest.v1'),matchId:localStorage.getItem('eclipse.second-dawn.match.v1')}));const client=new ConvexHttpClient('https://ideal-nightingale-55.convex.cloud');const query=()=>client.query(makeFunctionReference('eclipseMatches:getMatchHistory'),{...identity,limit:100});
const before=await query();assert.ok(before.entries.some(e=>e.actorSeatId==='seat-1'));assert.ok(before.entries.some(e=>e.actorSeatId!=='seat-1'));await p.screenshot({path:`${directory}/1366x768-real-game.png`});
await p.reload();await p.getByRole('button',{name:/Continue · round/}).first().click();await p.getByRole('button',{name:'History',exact:true}).click();await p.locator('.dg-history-scroll li').first().waitFor();const after=await query();for(const entry of before.entries)assert.ok(after.entries.some(e=>e.revision===entry.revision&&e.summary===entry.summary));await p.screenshot({path:`${directory}/1366x768-resumed-history.png`});
await writeFile(`${directory}/checks.json`,JSON.stringify({checks,realGame:{humanAndAi:true,scrollAnchorDelta:anchorAfter.y-anchor.y,recordedBefore:before.entries.length,recordedAfter:after.entries.length,resumePreserved:true,errors}},null,2));await browser.close();console.log('History preview captures and real guest AI/save-resume passed.');
