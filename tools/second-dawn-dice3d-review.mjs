import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const directory='coding_agents/second_dawn_dice3d_review';await mkdir(directory,{recursive:true});
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
const results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]) {
 let browser;
 try {browser=await type.launch(name==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});}catch(error){results.push({browser:name,unavailable:String(error)});continue;}
 try {
  for(const width of name==='webkit'?[390]:[1366,390]) {
   const page=await browser.newPage({viewport:{width,height:width===390?844:768},hasTouch:width<600});const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(`${site}/?position=retreat#second-dawn-preview`);
   await page.getByRole('button',{name:'Roll dice',exact:true}).click();
   await page.waitForTimeout(400);
   const active=await page.locator('.dg-dice-overlay canvas').count();
   await page.screenshot({path:`${directory}/${name}-${width}-combat-throw.png`});
   await page.waitForTimeout(1800);assert.equal(await page.locator('.dg-dice-overlay').count(),0,'Throw clears itself');
   await page.screenshot({path:`${directory}/${name}-${width}-combat-results.png`});
   // The same actual board, with six known results supplied directly to the renderer
   // so each settled top face can be reviewed before the production overlay clears.
   await page.evaluate(async()=>{
    const {createDiceThrow}=await import('/src/second-dawn-game/dice3d/renderer.ts');
    const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:9000;pointer-events:none';
    const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:100%';overlay.append(canvas);document.body.append(overlay);
    try{window.diceReview=createDiceThrow({canvas,rolls:Array.from({length:6},(_,i)=>({id:`review-${i}`,face:i+1,color:['yellow','orange','blue','red'][i%4]})),onSettled:()=>{},onUnavailable:()=>{document.body.dataset.webglReview='unavailable';}});}catch{document.body.dataset.webglReview='unavailable';}
   });
   await page.waitForTimeout(400);await page.screenshot({path:`${directory}/${name}-${width}-six-dice-throw.png`});
   await page.waitForTimeout(1800);await page.screenshot({path:`${directory}/${name}-${width}-six-dice-settled.png`});
   results.push({browser:name,width,actualCombatCanvasObserved:active>0,overlayCleared:true,sixDiceWebGL:await page.evaluate(()=>document.body.dataset.webglReview??'available'),pageErrors:errors});
   await page.close();
  }
 } finally {await browser.close();}
}
await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
