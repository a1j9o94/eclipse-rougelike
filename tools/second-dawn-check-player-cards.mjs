import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const directory='.second-dawn/player-card-regression';
await mkdir(directory,{recursive:true});
await writeFile(`${directory}/index.html`,'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
await writeFile(`${directory}/fixture.tsx`,`
import React from 'react';import {createRoot} from 'react-dom/client';
import Board from '/src/second-dawn-game/SecondDawnBoard';
import fixtures from '/src/second-dawn-game/reviewFixtures.json';
import {createGame} from '/shared/eclipse/setup';
import {getPlayerView} from '/shared/eclipse/protocol';
import {legalCommands} from '/shared/eclipse/legal';
import '/src/index.css';
const count=Number(new URLSearchParams(location.search).get('seats')??6);
const state=count===3?createGame({seed:18,seats:[{id:'p0',faction:'eridani',controller:'human'},{id:'p1',faction:'hydran',controller:'ai'},{id:'p2',faction:'planta',controller:'ai'}]}):structuredClone(fixtures.opening);
const view=getPlayerView(state,state.activeSeatId);
const names=Object.fromEntries(state.seats.map((seat,index)=>[seat.id,index===0?'CommanderWithAnUnusuallyLongUnbrokenName':'Player '+(index+1)]));
createRoot(document.getElementById('root')).render(<Board view={view} candidates={legalCommands(view)} playerNames={names} connected busy={false} status="Engine fixture review" onSubmit={()=>{}} onMenu={()=>{}}/>);
`);
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const address=server.httpServer.address();assert(address&&typeof address==='object');
const base=`http://127.0.0.1:${address.port}/${directory}/index.html`;
const results=[];
try{
 for(const[width,height]of[[320,740],[390,844],[761,900],[1366,768],[1920,1080]])for(const seats of[3,6]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  try{
   await page.goto(`${base}?seats=${seats}`);await page.locator('.dg-app').waitFor();
   if(await page.locator('.dg-mobile-header').count())await page.locator('.dg-mobile-header .dg-shell-menu>summary').click();
   await page.getByRole('button',{name:'Table & activity',exact:true}).click();
   const tools=page.locator('.dg-mobile-header .dg-shell-menu');if(await tools.count()&&await tools.evaluate(element=>element.open))await tools.locator('summary').click();
   const roster=page.getByRole('region',{name:'Civilization roster',exact:true});await roster.waitFor();
   const geometry=await roster.evaluate(element=>{
    const panel=element.closest('.sd-players'),panelRect=panel.getBoundingClientRect(),close=panel.querySelector('.dg-table-close'),closeRect=close.getBoundingClientRect();
    const cards=[...element.querySelectorAll('.sd-player')].map(card=>{
     const rect=card.getBoundingClientRect(),outside=[];
     const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
     for(let node=walker.nextNode();node;node=walker.nextNode()){
      if(!node.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const box of range.getClientRects())if(box.left<rect.left+1-.5||box.right>rect.right-1+.5||box.top<rect.top+1-.5||box.bottom>rect.bottom-1+.5)outside.push({text:node.textContent,rect:box.toJSON()});
     }
     for(const child of card.querySelectorAll('svg,.dg-roster-vp')){const box=child.getBoundingClientRect();if(box.left<rect.left||box.right>rect.right||box.top<rect.top||box.bottom>rect.bottom)outside.push({element:child.className,rect:box.toJSON()});}
     return{rect:rect.toJSON(),name:card.querySelector('strong').textContent,nameSize:parseFloat(getComputedStyle(card.querySelector('strong')).fontSize),statusSize:parseFloat(getComputedStyle(card.querySelector('div>small')).fontSize),score:card.querySelector('.dg-roster-vp').textContent,scrollWidth:card.scrollWidth,clientWidth:card.clientWidth,outside};
    });
    return{panel:panelRect.toJSON(),turnStripBottom:document.querySelector('.dg-turn-order-strip').getBoundingClientRect().bottom,closeVisible:close.contains(document.elementFromPoint(closeRect.x+closeRect.width/2,closeRect.y+closeRect.height/2)),viewport:{width:innerWidth,height:innerHeight},rosterScrollWidth:element.scrollWidth,rosterClientWidth:element.clientWidth,cards};
   });
   assert.equal(geometry.cards.length,seats);
   assert(geometry.panel.left>=0&&geometry.panel.right<=width&&geometry.panel.top>=0&&geometry.panel.bottom<=height,`${width}/${seats}: roster panel extends outside viewport`);
   assert(geometry.panel.top>=geometry.turnStripBottom,`${width}/${seats}: table overlaps header or turn order`);assert(geometry.closeVisible,`${width}/${seats}: Close table details is covered`);
   for(const card of geometry.cards){assert.deepEqual(card.outside,[],`${width}/${seats}: ${card.name} escapes its border`);assert(card.scrollWidth<=card.clientWidth+1,`${card.name} overflows horizontally`);assert(card.rect.height>=44);assert(card.nameSize>=13&&card.statusSize>=11,`${card.name} is too small to scan`);}
   assert(geometry.rosterScrollWidth<=geometry.rosterClientWidth+1,`${width}/${seats}: roster needs horizontal scrolling`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const selected=roster.locator('.sd-player.sd-active');await selected.scrollIntoViewIfNeeded();await selected.click();
   await roster.waitFor({state:'hidden'});assert.deepEqual(errors,[]);
   results.push({width,height,seats,geometry});
   if(seats===3){await page.getByRole('button',{name:'Table & activity',exact:true}).count().then(async count=>{if(!count)await page.locator('.dg-mobile-header .dg-shell-menu>summary').click();});await page.getByRole('button',{name:'Table & activity',exact:true}).click();const menu=page.locator('.dg-mobile-header .dg-shell-menu');if(await menu.count()&&await menu.evaluate(element=>element.open))await menu.locator('summary').click();await page.screenshot({path:`${directory}/players-${width}.png`});}
  }catch(error){await page.screenshot({path:`${directory}/failure-${width}-${seats}.png`});results.push({width,height,seats,error:error.message,errors});}
  finally{await page.close();}
 }
 await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));
 const failures=results.filter(result=>result.error);for(const failure of failures)console.error(`${failure.width}/${failure.seats}: ${failure.error}`);
 assert.equal(failures.length,0,`${failures.length} roster card checks failed; see ${directory}/results.json`);
 console.log(`Contained player-card text, symbols, score and real inspection clicks passed ${results.length} viewport/roster checks.`);
}finally{await browser.close();await server.close();}
