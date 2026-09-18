import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile, copyFile, symlink, lstat, realpath} from 'node:fs/promises';
import {createServer} from 'node:net';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** @typedef {{file:string,args:string[]}} Command */
/** @typedef {{projectRoot?:string,signal?:AbortSignal,checkPorts?:boolean,convexCommand?:Command,viteCommand?:Command,onReady?:()=>void|Promise<void>}} LocalOptions */
const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');

async function linkDirectory(source,target){
 try{const entry=await lstat(target);if(!entry.isSymbolicLink()||await realpath(target)!==await realpath(source))throw new Error(`Local workspace path already exists: ${target}`);}
 catch(error){if(error.code!=='ENOENT')throw error;await symlink(source,target,'junction');}
}
async function requireFreePort(port){
 await new Promise((accept,reject)=>{const server=createServer();server.once('error',()=>reject(new Error(`Port ${port} is already in use. Stop the previous local server before starting Second Dawn.`)));server.listen(port,'127.0.0.1',()=>server.close(accept));});
}
async function prepareWorkspace(root){
 const local=join(root,'.second-dawn'),backend=join(local,'backend'),envFile=join(local,'convex.env');
 await mkdir(backend,{recursive:true,mode:0o700});
 for(const folder of ['convex','shared','node_modules'])await linkDirectory(join(root,folder),join(backend,folder));
 // Copies prevent CLI configuration upgrades from changing the real package or tsconfig.
 await copyFile(join(root,'package.json'),join(backend,'package.json'));
 for(const name of ['tsconfig.json','tsconfig.app.json','tsconfig.node.json','tsconfig.eclipse.json']){
  try{await copyFile(join(root,name),join(backend,name));}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 try{await lstat(envFile);}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(envFile,'CONVEX_DEPLOYMENT=anonymous:anonymous-agent\n',{mode:0o600});}
 const configured=await readFile(envFile,'utf8');
 if(!/^CONVEX_DEPLOYMENT=anonymous:[a-zA-Z0-9_-]+\s*$/m.test(configured)||/^CONVEX_DEPLOY_KEY=/m.test(configured))throw new Error('The local environment must identify an anonymous deployment. No cloud credentials are used by this launcher.');
 return {local,backend,envFile};
}

/** Start the durable anonymous backend and Vite; resolve after shutdown. @param {LocalOptions} options @returns {Promise<number>} */
export async function runLocal(options={}){
 const root=resolve(options.projectRoot??defaultRoot);
 if(options.checkPorts!==false){await requireFreePort(3210);await requireFreePort(5175);}
 const {backend,envFile}=await prepareWorkspace(root);
 const command=options.convexCommand??{file:process.execPath,args:[join(root,'node_modules/convex/bin/main.js'),'dev','--env-file',envFile,'--typecheck','disable']};
 const viteCommand=options.viteCommand??{file:process.execPath,args:[join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5175','--strictPort']};
 const environment={...process.env,CONVEX_AGENT_MODE:'anonymous'};
 // Inherited cloud or self-hosted credentials must never redirect this local launcher.
 for(const key of ['CONVEX_DEPLOY_KEY','CONVEX_DEPLOYMENT','CONVEX_SELF_HOSTED_URL','CONVEX_SELF_HOSTED_ADMIN_KEY'])delete environment[key];
 const children=[];let stopping=false,ready=false,output='',resolveExit;
 const finished=new Promise(resolve=>{resolveExit=resolve;});
 const grouped=process.platform!=='win32';
 const stop=async(code=0)=>{
  if(stopping)return;stopping=true;clearTimeout(deadline);
  options.signal?.removeEventListener('abort',abort);
  await Promise.all(children.map(child=>new Promise(resolve=>{
   if(child.exitCode!==null||child.signalCode!==null){resolve();return;}
   let timer;
   const done=()=>{clearTimeout(timer);resolve();};child.once('exit',done);
   const kill=signal=>{try{if(grouped)process.kill(-child.pid,signal);else child.kill(signal);}catch(error){if(error.code!=='ESRCH')process.stderr.write('Could not stop a local child process.\n');}};
   kill('SIGTERM');timer=setTimeout(()=>{kill('SIGKILL');done();},5000);timer.unref();
  })));
  resolveExit(code);
 };
 const abort=()=>{void stop(0);};
 const deadline=setTimeout(()=>{process.stderr.write('Local Convex startup timed out. Check the backend output above.\n');void stop(1);},120000);
 const launch=(spec,cwd,env)=>{
  const child=spawn(spec.file,spec.args,{cwd,env,detached:grouped,stdio:['ignore','pipe','pipe']});children.push(child);
  child.once('error',()=>{process.stderr.write('Unable to launch a local server process. Run npm ci, then retry.\n');void stop(1);});
  child.once('exit',code=>{if(!stopping)void stop(code??1);});
  return child;
 };
 const configuredReady=async()=>{
  if(ready||stopping)return;ready=true;clearTimeout(deadline);
  try{
   // Convex currently writes this file even with --env-file. It is safely inside the isolated cwd.
   const written=await readFile(join(backend,'.env.local'),'utf8').catch(error=>{if(error.code==='ENOENT')return readFile(envFile,'utf8');throw error;});
   const deployment=written.match(/^CONVEX_DEPLOYMENT=(anonymous:[a-zA-Z0-9_-]+)\s*$/m);
   if(!deployment)throw new Error('Anonymous deployment configuration was not written.');
   await writeFile(envFile,`CONVEX_DEPLOYMENT=${deployment[1]}\n`,{mode:0o600});
   if(stopping)return;
   const vite=launch(viteCommand,root,{...environment,VITE_CONVEX_URL:'http://127.0.0.1:3210'});
   vite.stdout.on('data',chunk=>process.stdout.write(chunk));vite.stderr.on('data',chunk=>process.stderr.write(chunk));
   process.stdout.write('\nSecond Dawn: http://127.0.0.1:5175/ · local autosaves resume on the next launch.\n');
   await options.onReady?.();
  }catch{process.stderr.write('Could not finish local startup. Original project configuration has not been changed.\n');void stop(1);}
 };
 options.signal?.addEventListener('abort',abort,{once:true});
 if(options.signal?.aborted){await stop(0);return finished;}
 const convex=launch(command,backend,environment);
 const capture=(chunk,target)=>{target.write(chunk);output=(output+chunk.toString()).slice(-4096);if(/Convex functions ready/.test(output))void configuredReady();};
 convex.stdout.on('data',chunk=>capture(chunk,process.stdout));convex.stderr.on('data',chunk=>capture(chunk,process.stderr));
 return finished;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const abort=new AbortController();for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>abort.abort());
 runLocal({signal:abort.signal}).then(code=>{process.exitCode=code;}).catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
}
