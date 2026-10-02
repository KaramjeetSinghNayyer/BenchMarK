import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.gz':'application/gzip'};
export function createServer(directory=root) {
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}
  let file;
  try {
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   file=path.resolve(directory,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
   if(!file.startsWith(directory+path.sep)){res.writeHead(403).end();return}
  } catch {res.writeHead(400).end('Bad request');return}
  try {
   const body=await readFile(file);
   // Compiler archives are decompressed by the app; do not set Content-Encoding.
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-cache'});
   res.end(req.method==='HEAD'?undefined:body);
  } catch(error) {
   const missing=['ENOENT','ENOTDIR','EISDIR'].includes(error.code);
   res.writeHead(missing?404:500).end(missing?'Not found':'Server error');
  }
 });
}
