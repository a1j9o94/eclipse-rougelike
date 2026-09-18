import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, stat, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {runLocal} from './second-dawn-local.mjs';

async function fixture(){
 const root=await realpath(await mkdtemp(join(tmpdir(),'second-dawn-local-')));
 for(const folder of ['convex','shared','node_modules'])await mkdir(join(root,folder));
 await writeFile(join(root,'package.json'),'{}');
 const bytes=Buffer.from('# Existing configuration\r\nLEGACY_VALUE=keep\r\n\0','utf8');
 await writeFile(join(root,'.env.local'),bytes,{mode:0o640});
 await writeFile(join(root,'convex.json'),'{"legacy":true}\n',{mode:0o600});
 const cli=join(root,'fake-convex.mjs');
 await writeFile(cli,`import{writeFileSync,unlinkSync,existsSync}from'node:fs';
writeFileSync('.env.local','CONVEX_DEPLOYMENT=anonymous:anonymous-agent\\n');
if(existsSync('convex.json'))unlinkSync('convex.json');
writeFileSync('cli-location.txt',process.cwd());
if(process.argv.includes('fail'))process.exit(7);
console.log('Convex functions ready!');
setInterval(()=>{},1000);`);
 const vite=join(root,'fake-vite.mjs');
 await writeFile(vite,`import{writeFileSync}from'node:fs';writeFileSync('.second-dawn/vite-url.txt',process.env.VITE_CONVEX_URL);setInterval(()=>{},1000);`);
 return {root,bytes,cli,vite};
}

for(const failing of [false,true])test(`isolated CLI ${failing?'failure':'startup and shutdown'} preserves original configuration bytes and permissions`,async()=>{
 const f=await fixture();const abort=new AbortController();let atReady=false;
 try{
  const exit=await runLocal({projectRoot:f.root,checkPorts:false,signal:abort.signal,convexCommand:{file:process.execPath,args:[f.cli,...(failing?['fail']:[])]},viteCommand:{file:process.execPath,args:[f.vite]},onReady:async()=>{
   atReady=true;
   assert.deepEqual(await readFile(join(f.root,'.env.local')),f.bytes);
   assert.equal(await readFile(join(f.root,'convex.json'),'utf8'),'{"legacy":true}\n');
   for(let i=0;i<30;i++){try{await stat(join(f.root,'.second-dawn/vite-url.txt'));break;}catch{await new Promise(resolve=>setTimeout(resolve,10));}}
   abort.abort();
  }});
  assert.equal(exit,failing?7:0);assert.equal(atReady,!failing);
  assert.deepEqual(await readFile(join(f.root,'.env.local')),f.bytes);
  assert.equal((await stat(join(f.root,'.env.local'))).mode&0o777,0o640);
  assert.equal(await readFile(join(f.root,'convex.json'),'utf8'),'{"legacy":true}\n');
  assert.equal((await stat(join(f.root,'convex.json'))).mode&0o777,0o600);
  assert.equal(await readFile(join(f.root,'.second-dawn/backend/cli-location.txt'),'utf8'),join(f.root,'.second-dawn/backend'));
  if(!failing){
   assert.match(await readFile(join(f.root,'.second-dawn/convex.env'),'utf8'),/^CONVEX_DEPLOYMENT=anonymous:anonymous-agent\n$/);
   assert.equal(await readFile(join(f.root,'.second-dawn/vite-url.txt'),'utf8'),'http://127.0.0.1:3210');
  }
 }finally{abort.abort();await rm(f.root,{recursive:true,force:true});}
});
