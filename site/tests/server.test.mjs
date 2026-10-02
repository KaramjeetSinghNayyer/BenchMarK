import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createServer} from '../server.mjs';

test('static server serves entry point, modules, HEAD and intact compiler archives', async t => {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const index=await fetch(base+'/');
  assert.equal(index.status,200);
  assert.match(await index.text(),/BenchMarker/);
  assert.equal(index.headers.get('x-content-type-options'),'nosniff');
  const module=await fetch(base+'/c-compiler-worker.js');
  assert.match(module.headers.get('content-type'),/text\/javascript/);
  const head=await fetch(base+'/style.css',{method:'HEAD'});
  assert.equal(head.status,200);
  assert.ok(Number(head.headers.get('content-length'))>0);
  assert.equal(await head.text(),'');
  const archive=await fetch(base+'/vendor/clang/memfs.gz');
  assert.equal(archive.headers.get('content-encoding'),null);
  assert.deepEqual(Buffer.from(await archive.arrayBuffer()),await readFile(new URL('../dist/vendor/clang/memfs.gz',import.meta.url)));
  assert.equal((await fetch(base+'/missing.js')).status,404);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  // Use raw HTTP paths so the client does not normalize traversal before sending.
  const status=pathname=>new Promise((resolve,reject)=>{
    http.get(base+pathname,res=>{res.resume();resolve(res.statusCode)}).on('error',reject);
  });
  assert.equal(await status('/%2e%2e%2fpackage.json'),403);
  assert.equal(await status('/%ZZ'),400);
});
