import path from 'node:path';
import {createServer} from '../server.mjs';
const port=Number(process.env.PORT||3001);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT must be an integer from 0 to 65535.');
const host=process.env.HOST||'127.0.0.1';
const directory=path.resolve(import.meta.dirname,process.argv.includes('--preview')?'../build':'../dist');
const server=createServer(directory);
server.listen(port,host,()=>console.log(`BenchMarker: http://${host}:${server.address().port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
