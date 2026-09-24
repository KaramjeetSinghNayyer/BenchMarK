import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {Worker} from 'node:worker_threads';
import {loadCompiler} from '../dist/c-compiler.js';
import {instantiateC} from '../dist/c-runtime.js';
import {cSources,C_FLAGS,C_COMPILER} from '../dist/c-algorithms.js';
import {generateCases,toCSV,algorithms} from '../dist/core.js';

const compile=await loadCompiler({readAsset:async name=>{
  const buffer=gunzipSync(await readFile(new URL('../dist/vendor/clang/'+name+'.gz',import.meta.url)));
  return buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
}});
const modules={};
for(const [id,source] of Object.entries(cSources))test('ANSI C '+id+' compiles and preserves values',async()=>{
 const {module}=await compile(source);modules[id]=module;
 const runtime=await instantiateC(module);
 for(const input of [[],[42],[-3.5,2,2,0,-1],...[ 'random','sorted','reversed','nearly','duplicates'].flatMap(p=>generateCases(500,p,42).map(c=>c.input))]){
   runtime.prepare(input);runtime.sort(input.length);assert.deepEqual(runtime.result(input.length),[...input].sort((a,b)=>a-b));
 }
});
test('C89 diagnostics reject invalid syntax, C99 declarations, and incompatible signatures',async()=>{
 for(const source of ['void sort(double input[], int n) { broken code }','void sort(double a[],int n){for(int i=0;i<n;i++)a[i]=0;}','void sort(int a[],int n){}'])await assert.rejects(()=>compile(source),/error:/);
});
test('failed compilation does not corrupt subsequent compiles',async()=>{
 await assert.rejects(()=>compile('void sort(double input[], int n) { missing; }'));
 const {module}=await compile(cSources.insertion);const runtime=await instantiateC(module);runtime.prepare([2,1]);runtime.sort(2);assert.deepEqual(runtime.result(2),[1,2]);
});
function runWorker(module,input,timeout=5000){return new Promise((resolve,reject)=>{
 const workerURL=new URL('../dist/c-benchmark-worker.js',import.meta.url).href;
 const worker=new Worker(`const {parentPort}=require('node:worker_threads');global.self={postMessage:m=>parentPort.postMessage(m)};import(${JSON.stringify(workerURL)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
 const events=[];const timer=setTimeout(()=>{worker.terminate();resolve([...events,{type:'timeout'}]);},timeout);
 worker.on('error',e=>{clearTimeout(timer);worker.terminate();reject(e)});
 worker.on('message',m=>{events.push(m);if(['done','error'].includes(m.type)){clearTimeout(timer);worker.terminate();resolve(events)}});
 worker.postMessage({module,input,repetitions:3});
});}
test('compiled C worker emits validated timings and rejects incorrect output',async()=>{
 const good=await runWorker(modules.merge,[3,1,2,1]);assert.equal(good.at(-1).type,'done');assert.equal(good.filter(e=>e.type==='sample').length,3);
 const bad=await compile('void sort(double input[], int n) { (void)input; (void)n; }');
 const events=await runWorker(bad.module,[2,1]);assert.equal(events.at(-1).type,'error');assert.match(events.at(-1).error,/Incorrect C output/);
});
test('infinite C loops can be terminated by the host',async()=>{
 const {module}=await compile('void sort(double a[],int n){volatile int keep=1;while(keep){}}');
 const events=await runWorker(module,[2,1],150);assert.equal(events.at(-1).type,'timeout');
});
test('CSV identifies C compiler, flags and exact C source',()=>{
 const run={id:'c-run',timestamp:'2026-09-23',language:'c',compiler:C_COMPILER,compilerFlags:C_FLAGS,pattern:'custom',seed:42,repetitions:3,browser:'test',cores:4,algorithms:[{...algorithms[0],source:cSources.quick,modified:false}],cases:[{id:1,input:[2,1]}]};
 const csv=toCSV([{algorithm:'quick',caseId:1,n:2,repetition:1,ms:.2,status:'valid'}],run);
 assert.ok(csv.includes('"language","compiler","compiler_flags"'));assert.ok(csv.includes('"c",'));assert.ok(csv.includes(C_COMPILER));assert.ok(csv.includes(C_FLAGS));assert.ok(csv.includes('void sort(double input[], int n)'));
});
