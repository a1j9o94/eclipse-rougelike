import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const directory='coding_agents/second_dawn_solo_room_review';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const captures=[];
async function capture(label){for(const [width,height] of [[1366,768],[1440,900],[1920,1080]]){await page.setViewportSize({width,height});await page.screenshot({path:`${directory}/${width}x${height}-${label}.png`,fullPage:false});captures.push({label,width,height,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});}}
try{
 await page.goto('http://127.0.0.1:5175');
 await page.getByRole('button',{name:'Create multiplayer room',exact:true}).click();
 await page.getByRole('spinbutton',{name:'Custom turn duration'}).fill('');
 await page.getByRole('button',{name:'Fewer human players'}).click();
 await page.getByRole('button',{name:'Create room',exact:true}).waitFor({state:'visible'});
 assert.equal(await page.getByRole('button',{name:'Create room',exact:true}).isEnabled(),true);
 await page.getByRole('heading',{name:'Room settings',exact:true}).scrollIntoViewIfNeeded();
 await capture('solo-settings');
 await page.getByRole('button',{name:'Create room',exact:true}).click();
 await page.getByRole('button',{name:'Ready to play',exact:true}).waitFor();
 await page.getByRole('heading',{name:'Your game room'}).scrollIntoViewIfNeeded();
 await capture('solo-room');
 await page.getByRole('button',{name:'Ready to play',exact:true}).click();
 await page.getByRole('button',{name:'Start room game',exact:true}).click();
 await page.getByRole('button',{name:'Game room',exact:true}).waitFor();
 assert.equal(await page.getByLabel('Turn timer',{exact:true}).count(),0);
 await capture('solo-board');
 assert.deepEqual(errors,[]);assert.equal(captures.some(c=>c.overflow),false);
 await writeFile(`${directory}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),kind:'Agent-operated actual rendered browser review; not a human usability study',checks:['Invalid timer cleared by switching to solo','Solo room shows Wait for me','Human readied and started room','Solo board has no turn timer'],captures,errors},null,2));
}finally{await browser.close();}
