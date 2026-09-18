import assert from 'node:assert/strict';
import{chromium}from'playwright';
const b=await chromium.launch();
const checks=[];
try {
 const p=await b.newPage({viewport:{width:1366,height:768}});
 await p.goto('http://127.0.0.1:5175/#second-dawn-preview');
 await p.getByLabel('Review position').selectOption('midgame');
 await p.getByRole('button',{name:'Blueprints',exact:true}).click();
 await p.getByRole('button',{name:'Edit interceptor',exact:true}).click();
 const slot=await p.locator('.dg-blueprint-slot').first().boundingBox();
 const footer=await p.locator('.dg-upgrade-confirm').boundingBox();
 const visibleHeight=Math.max(0,Math.min(slot.y+slot.height,footer.y)-slot.y);
 checks.push({screen:'blueprints',slotVisiblePixels:visibleHeight,slotHeight:slot.height});
 assert(visibleHeight>=90,`First blueprint slot needs 90 visible pixels; got ${visibleHeight}`);
 await p.getByLabel('Review position').selectOption('combat');
 const confirm=await p.getByRole('button',{name:'Confirm choice',exact:true}).boundingBox();
 const panel=await p.locator('.sd-main').boundingBox();
 checks.push({screen:'combat',confirmBottom:confirm.y+confirm.height,panelBottom:panel.y+panel.height});
 assert(confirm.y+confirm.height<=panel.y+panel.height-4,'Combat confirmation must be fully above main panel edge');
 console.log(JSON.stringify(checks));
} finally {await b.close();}
