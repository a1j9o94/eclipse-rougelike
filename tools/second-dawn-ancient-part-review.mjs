import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const checks = [];
try {
 for (const [width,height] of [[1366,768],[1440,900],[1920,1080]]) {
  const page = await browser.newPage({viewport:{width,height}});
  await page.goto(`${(process.env.SECOND_DAWN_SITE_URL ?? 'http://127.0.0.1:5175').replace(/\/$/,'')}/?position=discovery#second-dawn-preview`);
  await page.getByRole('radio',{name:'Use Conformal Drive'}).check();
  await page.getByRole('button',{name:'Confirm discovery'}).click();
  const classes = [];
  for (const shipClass of ['Interceptor','Cruiser','Dreadnought','Starbase']) {
   await page.getByRole('button',{name:shipClass,exact:true}).click();
   classes.push({shipClass,slots:await page.locator('.dg-ancient-slots > section').count(),legalSlots:await page.locator('.dg-ancient-slots button:enabled').count()});
  }
  await page.getByRole('button',{name:'Interceptor',exact:true}).click();
  const unsafeDisabled = await page.getByRole('button',{name:'Slot 2: Nuclear Source'}).isDisabled();
  await page.getByRole('button',{name:'Slot 3: Nuclear Drive'}).click();
  const button = page.getByRole('button',{name:'Confirm installation'});
  const bounds = await button.boundingBox();
  const footer = await page.locator('.sd-footer').boundingBox();
  const workspace = await page.locator('.sd-main').boundingBox();
  const slots = await page.locator('.dg-ancient-slots > section').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  const allSlotsVisible = slots.every(slot=>slot.top>=workspace.y && slot.bottom<=Math.min(workspace.y+workspace.height,footer.y));
  const replacement = await page.locator('.dg-ancient-replacement').innerText();
  await page.screenshot({path:`coding_agents/second_dawn_revision_screenshots/${width}x${height}-ancient-part.png`});
  await button.click();
  const installed = await page.locator('.dg-ancient-install').count() === 0;
  checks.push({width,height,classes,unsafeDisabled,replacement,allSlotsVisible,confirmationVisible:bounds.y>=0 && bounds.y+bounds.height<height-80,installed,horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 await page.goto(`${(process.env.SECOND_DAWN_SITE_URL ?? 'http://127.0.0.1:5175').replace(/\/$/,'')}/?position=discovery#second-dawn-preview`);
 await page.getByRole('radio',{name:'Use Conformal Drive'}).check();
 await page.getByRole('button',{name:'Confirm discovery'}).click();
 await page.getByRole('button',{name:'Store for later'}).click();
 await page.getByRole('button',{name:'Confirm storage'}).click();
 checks.push({workflow:'storage',completed:await page.locator('.dg-ancient-install').count()===0});
 await page.close();
 await writeFile('coding_agents/second_dawn_revision_screenshots/ancient-part-review.json',JSON.stringify(checks,null,2));
 if(checks.some(check=>check.allSlotsVisible===false||check.completed===false||check.installed===false||check.confirmationVisible===false||check.unsafeDisabled===false||check.horizontalOverflow===true))throw new Error('An ancient-part browser acceptance check failed.');
 console.log(JSON.stringify(checks,null,2));
} finally { await browser.close(); }
