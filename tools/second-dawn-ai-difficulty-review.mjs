import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.SECOND_DAWN_SITE_URL??'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('This fixture review is local only.');
const output='coding_agents/second_dawn_ai_difficulty_review';await mkdir(output,{recursive:true});
const browser=await chromium.launch();const results=[];
try{for(const [width,height]of [[1440,900],[390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.evaluate(async()=>{
  const [{default:ReactDOM},{default:Picker}]=await Promise.all([import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/second-dawn-game/AiDifficultyPicker.tsx')]);
  const {default:React}=await import('/node_modules/.vite/deps/react.js');
  document.body.innerHTML='<div id="review"></div>';document.body.style.cssText='background:#0b111a;color:#dbe5ec;font-family:system-ui;margin:24px';
  function Demo(){const [value,setValue]=React.useState('normal');return React.createElement('main',{style:{maxWidth:'450px',margin:'auto'}},React.createElement('h1',null,'Choose your opponents'),React.createElement(Picker,{value,onChange:setValue}));}
  ReactDOM.createRoot(document.getElementById('review')).render(React.createElement(Demo));
 });
 await page.getByRole('button',{name:/Expert/}).click();await page.screenshot({path:`${output}/expert-${width}.png`,fullPage:true});
 assert.equal(await page.getByRole('button',{name:/Expert/}).getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);results.push({width,height,errors});await page.close();
}}finally{await browser.close();}await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
