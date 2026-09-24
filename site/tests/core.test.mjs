import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
import {algorithms,generateCases,parseCases,median,bestFit,aggregate,csvCell,toCSV} from '../dist/core.js';

for(const algorithm of algorithms)test(algorithm.name+' preserves and sorts all values',()=>{
 const sort=new Function(algorithm.source+';return sort;')();
 const inputs=[[],[1],[2,1],[-5,0,-5,8,.2,1],[1,1,1],...[ 'random','sorted','reversed','nearly','duplicates'].flatMap(p=>generateCases(500,p,42).map(c=>c.input))];
 for(const input of inputs){const copy=[...input];const result=sort(copy);assert.deepEqual(result??copy,[...input].sort((a,b)=>a-b));}
});
test('seeded generation is reproducible, bounded, and pattern-specific',()=>{
 assert.deepEqual(generateCases(1000,'random',42),generateCases(1000,'random',42));
 assert.notDeepEqual(generateCases(1000,'random',42),generateCases(1000,'random',43));
 assert.deepEqual(generateCases(1000,'random',42).map(c=>c.input.length),[100,250,500,750,1000]);
 for(const c of generateCases(1000,'sorted',0))assert.deepEqual(c.input,[...c.input].sort((a,b)=>a-b));
 for(const c of generateCases(1000,'reversed',0))assert.deepEqual(c.input,[...c.input].sort((a,b)=>b-a));
 assert.throws(()=>generateCases(999999,'random',42));
});
test('custom input parser handles JSON, CSV and edge cases; rejects invalid data',()=>{
 assert.deepEqual(parseCases('[3,1,2]')[0].input,[3,1,2]);
 assert.deepEqual(parseCases('[]')[0].input,[]);
 assert.equal(parseCases('[[2,1],[],[1.5,-2]]').length,3);
 assert.deepEqual(parseCases('3,1,2\r\n-2,4.5')[1].input,[-2,4.5]);
 for(const text of ['', '[null]', '[["2"]]', '1,,2','value,2','1,Infinity','[1,2,]',JSON.stringify([Array(20001).fill(0)])])assert.throws(()=>parseCases(text));
});
test('medians and curve fitting handle noisy and insufficient measurements',()=>{
 assert.equal(median([3,1,2]),2);assert.equal(median([4,1,2,3]),2.5);
 assert.equal(bestFit([{n:10,time:1}]),null);
 const points=[100,250,500,750,1000].map(n=>({n,time:n*n*.0001}));assert.equal(bestFit(points).id,'quadratic');assert.equal(bestFit(points).r2,1);
 assert.deepEqual(aggregate([{algorithm:'quick',n:2,ms:1,status:'valid'},{algorithm:'quick',n:2,ms:3,status:'valid'},{algorithm:'quick',n:2,ms:999,status:'error'}],'quick')[0].time,2);
});
test('CSV retains quotes, multiline code, input and metadata safely',()=>{
 assert.equal(csvCell('a,"b"\nc'),'"a,""b""\nc"');assert.equal(csvCell('=1+1'),'"\'=1+1"');
 const a={...algorithms[0],modified:false};const run={id:'test',timestamp:'2026-09-23',pattern:'custom',seed:42,repetitions:3,browser:'test',cores:4,algorithms:[a],cases:[{id:1,input:[2,1]}]};
 const csv=toCSV([{algorithm:'quick',caseId:1,n:2,repetition:1,ms:.2,status:'valid'}],run);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"[2,1]"'));assert.ok(csv.includes('source_code'));assert.ok(csv.includes('"0.2"'));
});
const workerSource=await readFile(new URL('../dist/benchmark-worker.js',import.meta.url),'utf8');
function execute(source,input=[3,1,2],limit=2000){return new Promise((resolve,reject)=>{
 const worker=new Worker(`const {parentPort}=require('node:worker_threads');global.self={postMessage:m=>parentPort.postMessage(m)};${workerSource}\nparentPort.on('message',data=>self.onmessage({data}));`,{eval:true});
 const events=[];const timer=setTimeout(()=>{worker.terminate();resolve([...events,{type:'timeout'}]);},limit);
 worker.on('error',e=>{clearTimeout(timer);worker.terminate();reject(e)});worker.on('message',m=>{events.push(m);if(m.type==='done'||m.type==='error'){clearTimeout(timer);worker.terminate();resolve(events)}});worker.postMessage({source,input,repetitions:3});
});}
test('worker produces timed valid runs and supports in-place returns',async()=>{
 for(const source of [algorithms[0].source,'function sort(a){a.sort((x,y)=>x-y)}']){const events=await execute(source);assert.equal(events.filter(e=>e.type==='sample').length,3);assert.equal(events.at(-1).type,'done');assert.ok(events.filter(e=>e.type==='sample').every(e=>e.ms>=0));}
});
test('worker rejects wrong values, duplicate loss, async and syntax errors',async()=>{
 for(const source of ['function sort(a){return a}', 'function sort(a){return [1,2,4]}','function sort(a){return [...new Set(a)].sort((x,y)=>x-y)}','async function sort(a){return a.sort()}','function sort( {']){const events=await execute(source,[3,1,1,2]);assert.equal(events.at(-1).type,'error');assert.equal(events.filter(e=>e.type==='sample').length,0);}
});
test('non-terminating edits can be terminated without blocking the host',async()=>{const events=await execute('function sort(a){while(true){}}',[2,1],150);assert.equal(events.at(-1).type,'timeout');});
