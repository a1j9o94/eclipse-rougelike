import{chromium}from'playwright';import{mkdir,writeFile}from'node:fs/promises';
const directory='coding_agents/second_dawn_mobile_review';await mkdir(directory,{recursive:true});const b=await chromium.launch();const results=[];
for(const[width,height]of[[360,800],[390,844],[430,932]]){
 const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true});await p.goto('http://127.0.0.1:5175/#second-dawn-preview');await p.getByRole('navigation',{name:'Mobile game navigation'}).waitFor();
 for(const mode of['opening','research','blueprints','combat']){
  await p.getByLabel('Review position').selectOption(mode==='opening'?'opening':mode==='combat'?'combat':'midgame');
  if(mode==='research'){await p.getByRole('button',{name:'Empire',exact:true}).click();await p.getByRole('button',{name:'Research technologies',exact:true}).click();}
  if(mode==='blueprints'){await p.getByRole('button',{name:'Empire',exact:true}).click();await p.getByRole('button',{name:'Ship blueprints',exact:true}).click();await p.getByRole('button',{name:'Interceptor',exact:true}).click();}
  await p.screenshot({path:`${directory}/${width}x${height}-${mode}.png`,animations:'disabled'});
  results.push({width,height,mode,...await p.evaluate(()=>({innerWidth,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,innerHeight,mainHeight:document.querySelector('.sd-main').clientHeight,mainScroll:document.querySelector('.sd-main').scrollHeight}))});
 }
 await p.close();
}
await b.close();await writeFile(`${directory}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
