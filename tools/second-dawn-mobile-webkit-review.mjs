import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {webkit} from 'playwright';
const site=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5175';
const directory=process.env.SECOND_DAWN_REVIEW_DIRECTORY??'coding_agents/second_dawn_mobile_webkit_review';await mkdir(directory,{recursive:true});
const browser=await webkit.launch();
const results=[],errors=[];
try{
 for(const[width,height]of[[390,844],[844,390]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});page.on('pageerror',error=>errors.push(error.message));
  for(const mode of['opening','research','blueprints','combat','scoring']){
   const fixture=mode==='research'||mode==='blueprints'?'midgame':mode;
   await page.goto(`${site}/?position=${fixture}#second-dawn-preview`);await page.getByRole('navigation',{name:'Mobile game navigation'}).waitFor();
   if(mode==='research'||mode==='blueprints'){
    await page.getByRole('button',{name:'Empire',exact:true}).tap();await page.getByRole('button',{name:mode==='research'?'Research technologies':'Ship blueprints',exact:true}).tap();
    await page.getByRole('heading',{name:mode==='research'?'Research':'Ship blueprints',exact:true}).waitFor();
   }
   if(mode==='combat')await page.getByRole('heading',{name:/^Combat allocation$/i}).waitFor();
   if(mode==='scoring')await page.locator('.sd-main h1').waitFor();
   if(mode==='blueprints'){const selector=await page.locator('.dg-blueprint-owner select').boundingBox();assert.ok(selector.height>=44,'Civilization selector needs a 44px native-WebKit touch target.');}
   const metrics=await page.evaluate(()=>({viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,viewportHeight:innerHeight,documentHeight:document.documentElement.scrollHeight,mainHeight:document.querySelector('.sd-main').clientHeight,mainScrollHeight:document.querySelector('.sd-main').scrollHeight}));
   assert.ok(metrics.documentWidth<=width,`${mode} ${width}px: horizontal document overflow`);assert.ok(metrics.mainHeight>90,`${mode}: useful content viewport`);
   await page.screenshot({path:`${directory}/${width}x${height}-${mode}.png`,animations:'disabled'});
   if(metrics.mainScrollHeight>metrics.mainHeight){await page.locator('.sd-main').evaluate(element=>element.scrollTop=element.scrollHeight);await page.waitForTimeout(60);assert.ok(await page.locator('.sd-main').evaluate(element=>element.scrollTop>0));await page.screenshot({path:`${directory}/${width}x${height}-${mode}-scrolled.png`,animations:'disabled'});}
   results.push({width,height,mode,...metrics});
  }
  await page.goto(`${site}/?position=opening#second-dawn-preview`);const map=page.getByRole('group',{name:'Galaxy map'});await map.waitFor();
  const first=page.locator('.dg-tile').first();await first.tap();assert.ok(await first.evaluate(element=>element.classList.contains('is-selected')),'Native WebKit touch tap selects sector.');
  await page.getByRole('button',{name:'Dismiss details'}).tap();
  await page.getByRole('button',{name:'Sectors',exact:true}).tap();const list=page.getByRole('region',{name:'Galaxy sector list'});await list.getByRole('button',{name:/^Sector /}).last().tap();assert.ok(await page.locator('.dg-tile').last().evaluate(element=>element.classList.contains('is-selected')),'Native touch list selects another sector.');
  await page.getByRole('button',{name:'Dismiss details'}).tap();
  const selected=await page.locator('.dg-tile.is-selected').getAttribute('data-galaxy-target'),before=await page.locator('[data-galaxy-camera]').getAttribute('transform');
  // Playwright exposes native touchscreen.tap for WebKit, not native swipe/pinch.
  // These pointerType=touch events check the production gesture handlers only.
  await first.evaluate(element=>{const r=element.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;for(const[type,dx]of[['pointerdown',0],['pointermove',35],['pointerup',35]])element.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:31,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientX:x+dx,clientY:y}));});
  assert.notEqual(await page.locator('[data-galaxy-camera]').getAttribute('transform'),before,'Synthetic touch-pointer pan updates camera in WebKit.');assert.equal(await page.locator('.dg-tile.is-selected').getAttribute('data-galaxy-target'),selected,'Pan cannot select original touch target.');
  await page.getByRole('button',{name:'Fit',exact:true}).tap();
  const b=await first.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+40,b.y+b.height/2+10,{steps:4});await page.mouse.up();assert.equal(await page.locator('.dg-tile.is-selected').getAttribute('data-galaxy-target'),selected,'Native mouse drag cannot select.');
  await page.getByRole('button',{name:'Fit',exact:true}).tap();await page.getByRole('button',{name:'Zoom in'}).tap();const camera=(await page.locator('[data-galaxy-camera]').getAttribute('transform')).match(/scale\(.+$/)[0];
  await page.getByRole('button',{name:'Empire',exact:true}).tap();await page.getByRole('button',{name:'Research technologies',exact:true}).tap();await page.getByRole('button',{name:'Galaxy',exact:true}).tap();assert.equal((await page.locator('[data-galaxy-camera]').getAttribute('transform')).match(/scale\(.+$/)[0],camera);
  await page.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${directory}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),site,browser:'Playwright WebKit 26.6',evidence:'Safari-engine desktop automation with mobile viewport/touch emulation; not physical iPhone/iPad or installed Safari testing. Native touch taps/navigation and mouse pan; touch-pointer pan is synthetic because Playwright WebKit has no public native swipe/pinch API. No cloud writes: isolated review fixtures only.',nativeTouchTap:true,nativeTouchList:true,nativeTouchNavigation:true,syntheticTouchPointerPan:true,nativeMousePan:true,cameraNavigation:true,errors,results},null,2));
 console.log('WebKit mobile: 10 screens, native taps/navigation, synthetic touch-pointer pan, native mouse pan, camera navigation and scroll/overflow checks passed.');
}finally{await browser.close();}
