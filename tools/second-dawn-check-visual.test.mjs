import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compareReviewedScreenshots} from './second-dawn-check-visual.mjs';
test('reports changed and missing renders without changing reviewed baselines',async()=>{
 const root=await mkdtemp(join(tmpdir(),'eclipse-visual-'));
 try{const baseline=join(root,'baseline'),actual=join(root,'actual');await mkdir(baseline);await mkdir(actual);await writeFile(join(baseline,'opening.png'),'reviewed');await writeFile(join(baseline,'combat.png'),'reviewed combat');await writeFile(join(actual,'opening.png'),'new render');
  assert.deepEqual(await compareReviewedScreenshots(baseline,actual,['opening.png','combat.png']),[{file:'opening.png',reason:'changed'},{file:'combat.png',reason:'missing'}]);assert.equal(await readFile(join(baseline,'opening.png'),'utf8'),'reviewed');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('accepts identical reviewed renders',async()=>{
 const root=await mkdtemp(join(tmpdir(),'eclipse-visual-'));
 try{await mkdir(join(root,'baseline'));await mkdir(join(root,'actual'));for(const dir of ['baseline','actual'])await writeFile(join(root,dir,'opening.png'),'identical');assert.deepEqual(await compareReviewedScreenshots(join(root,'baseline'),join(root,'actual'),['opening.png']),[]);}finally{await rm(root,{recursive:true,force:true});}
});
