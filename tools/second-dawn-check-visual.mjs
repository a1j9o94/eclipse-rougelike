import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
/** Compare only: a test run never replaces reviewed baseline images. */
export async function compareReviewedScreenshots(baseline,actual,files){
 const differences=[];
 for(const file of files){
  const expected=await readFile(join(baseline,file));let rendered;
  try{rendered=await readFile(join(actual,file));}catch(error){if(error.code!=='ENOENT')throw error;differences.push({file,reason:'missing'});continue;}
  if(!expected.equals(rendered))differences.push({file,reason:'changed'});
 }
 return differences;
}
async function main(){
 const exitCode=await new Promise((accept,reject)=>{const child=spawn(process.execPath,['tools/second-dawn-gameplay-visual-review.mjs'],{stdio:'inherit'});child.once('error',reject);child.once('exit',code=>accept(code??1));});
 if(exitCode)return exitCode;
 const baseline='coding_agents/second_dawn_visual_baseline_v5';
 const manifest=JSON.parse(await readFile(join(baseline,'review.json'),'utf8'));
 const differences=await compareReviewedScreenshots(baseline,'coding_agents/second_dawn_gameplay_screenshots',manifest.files);
 if(differences.length){for(const difference of differences)process.stderr.write(`${difference.file}: ${difference.reason}\n`);process.stderr.write('Review the actual images against coding_agents/second_dawn_visual_baseline_v5 before changing any baseline. Browser/platform rendering differences also require investigation.\n');return 1;}
 process.stdout.write(`All ${manifest.files.length} rendered screens match the reviewed baseline.\n`);return 0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main();
