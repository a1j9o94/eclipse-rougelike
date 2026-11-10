import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const directory=process.env.ECLIPSE_CHOICE_FITTING_DIR??'.second-dawn/choice-fitting-regression';
const fixtureDirectory='.second-dawn/choice-fitting-regression';
await mkdir(directory,{recursive:true});
await mkdir(fixtureDirectory,{recursive:true});
await writeFile(`${fixtureDirectory}/index.html`,'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>');
await writeFile(`${fixtureDirectory}/fixture.tsx`,`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Board from '/src/second-dawn-game/SecondDawnBoard';
import fixtures from '/src/second-dawn-game/reviewFixtures.json';
import {getPlayerView} from '/shared/eclipse/protocol';
import {legalCommands} from '/shared/eclipse/legal';
import {processGameCommand} from '/shared/eclipse/engine';
import '/src/index.css';
const mode=new URLSearchParams(location.search).get('mode');
function Harness(){
 const [state,setState]=useState(()=>{
  const start=structuredClone(mode==='upgrade'?fixtures.opening:fixtures.discovery);
  start.seats[0].controller='human';
  if(mode==='discovery'){
   start.pendingDecision.tileId='rift-conductor';
   start.engine.riftCannons=true;
  }
  return start;
 });
 const [receipt,setReceipt]=useState(null);
 const view=getPlayerView(state,'p0');
 const submit=command=>{
  const result=processGameCommand(state,view.viewerSeatId,command);
  setReceipt({command,ok:result.ok,error:result.ok?undefined:result.error,nextDecision:result.ok?result.state.pendingDecision?.kind:undefined});
  if(result.ok)setState({...result.state,revision:state.revision+1});
 };
 return <><Board view={view} candidates={legalCommands(view)} connected busy={false} status="Ready" onSubmit={submit} onMenu={()=>{}}/><output id="submitted" hidden>{JSON.stringify(receipt)}</output></>;
}
createRoot(document.getElementById('root')).render(<Harness/>);`);

const server=await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
const results=[];
try {
 const address=server.httpServer.address();
 assert(address&&typeof address==='object');
 const base=`http://127.0.0.1:${address.port}/${fixtureDirectory}/index.html`;
 for(const [width,height] of [[360,640],[390,740],[390,844],[1024,600],[1440,900]]) {
  for(const mode of ['discovery','upgrade']) {
   const page=await browser.newPage({viewport:{width,height},isMobile:width<=760,hasTouch:width<=760,reducedMotion:'reduce'});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.setDefaultTimeout(5000);
   try {
    await page.goto(`${base}?mode=${mode}`);
    await page.locator('.dg-app').waitFor();
    if(mode==='discovery'){
     await page.getByRole('radio',{name:'Use Rift Conductor'}).click();
     const confirm=page.getByRole('button',{name:'Install or store Rift Conductor'});
     await assertOnScreen(confirm);
     await page.screenshot({path:`${directory}/${mode}-${width}x${height}.png`});
     await page.getByText('Reward details · Rift Conductor',{exact:true}).click();
     const details=page.getByText(/Next, install it for free in one ship blueprint/);
     await details.scrollIntoViewIfNeeded();
     await assertOnScreen(details);
     await assertOnScreen(confirm);
     await confirm.click();
    }else{
     if(width<=760)await page.getByRole('button',{name:'Choose action',exact:true}).click();
     await page.getByRole('button',{name:/^Upgrade(?: Fit your ships)?$/}).first().click();
     await page.getByRole('navigation',{name:'Ship classes'}).getByRole('button',{name:'Cruiser',exact:true}).click();
     const drive=page.getByRole('button',{name:/^Slot \d+: .* Drive$/}).first();
     const slot=(await drive.getAttribute('aria-label')).match(/Slot (\d+)/)[1];
     await drive.click();
     const part=page.getByRole('button',{name:`Install Fusion Drive in slot ${slot}`});
     const fittingBody=page.locator('.dg-fitting-body');
     if(width<=760&&await fittingBody.evaluate(element=>element.scrollHeight>element.clientHeight)){
      const before=await fittingBody.evaluate(element=>element.scrollTop);
      await page.getByText(/energy available/).hover();
      await page.mouse.wheel(0,150);
      await page.waitForFunction(top=>document.querySelector('.dg-fitting-body').scrollTop>top,before);
     }
     const list=page.getByRole('region',{name:'Replacement components'});
     const listRect=await list.boundingBox(),bodyRect=await fittingBody.boundingBox(),partRect=await part.boundingBox();
     assert(listRect&&bodyRect&&partRect,'Missing replacement scroll bounds');
     const visibleBottom=Math.min(listRect.y+listRect.height,bodyRect.y+bodyRect.height);
     const clipped=partRect.y+partRect.height-visibleBottom;
     if(clipped>1){
      const before=await list.evaluate(element=>element.scrollTop);
      await page.mouse.move(listRect.x+listRect.width/2,listRect.y+8);
      await page.mouse.wheel(0,Math.ceil(clipped)+2);
      await page.waitForFunction(top=>document.querySelector('.dg-part-picker-scroll').scrollTop>top,before);
     }
     await assertOnScreen(part);
     await page.screenshot({path:`${directory}/${mode}-${width}x${height}.png`});
     await part.click();
     const confirm=page.getByRole('button',{name:'Apply 1 upgrade'});
     await assertOnScreen(confirm);
     await confirm.click();
    }
    const receipt=JSON.parse(await page.locator('#submitted').textContent());
    assert.equal(receipt.ok,true,JSON.stringify(receipt));
    if(mode==='discovery')assert.equal(receipt.nextDecision,'ancient-part');
    assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    results.push({mode,width,height,engineAccepted:true});
   }catch(error){
    await page.screenshot({path:`${directory}/failure-${mode}-${width}x${height}.png`});
    results.push({mode,width,height,error:error.message,errors});
   }finally{await page.close();}
  }
 }
 await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));
 const failures=results.filter(result=>result.error);
 for(const failure of failures)console.error(`${failure.mode}/${failure.width}×${failure.height}: ${failure.error}`);
 assert.equal(failures.length,0,`See ${directory}/results.json`);
 console.log(`Rift Conductor and Cruiser drive confirmation passed ${results.length} viewport/workflow checks.`);
}finally{await browser.close();await server.close();}

async function assertOnScreen(locator){
 const label=await locator.getAttribute('aria-label')??await locator.textContent();
 const geometry=await locator.evaluate(element=>{
  const rect=element.getBoundingClientRect();
  const hit=[0.15,0.5,0.85].every(fraction=>element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height*fraction)));
  return {rect:rect.toJSON(),width:innerWidth,height:innerHeight,hit};
 });
 assert(geometry.rect.top>=0&&geometry.rect.bottom<=geometry.height&&geometry.rect.left>=0&&geometry.rect.right<=geometry.width&&geometry.hit,`${label} is outside the viewport or covered: ${JSON.stringify(geometry.rect)}`);
}
