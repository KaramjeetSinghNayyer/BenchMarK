import {cp, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';

const source = path.resolve(import.meta.dirname, '../dist');
const output = path.resolve(import.meta.dirname, '../build');
const required = ['index.html', 'style.css', 'app.js', 'lab.js', 'core.js', 'benchmark-worker.js', 'c-algorithms.js', 'c-client.js', 'c-compiler.js', 'c-compiler-worker.js', 'c-runtime.js', 'c-benchmark-worker.js', ...['shared.js', 'clang.gz', 'lld.gz', 'memfs.gz', 'sysroot.tar.gz', 'LICENSE', 'LICENSE.llvm', 'NOTICE'].map(file => 'vendor/clang/' + file)];
for (const file of required) {
  if (!(await stat(path.join(source, file))).isFile()) throw new Error(`Missing release asset: ${file}`);
}
async function validate(directory) {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await validate(file);
    else if (!entry.isFile()) throw new Error(`Release assets must be regular files: ${file}`);
    else if (entry.name.endsWith('.js')) execFileSync(process.execPath, ['--check', file], {stdio:'inherit'});
    else if (entry.name.endsWith('.gz')) gunzipSync(await readFile(file));
  }
}
await validate(source);
await rm(output, {recursive:true, force:true});
await cp(source, output, {recursive:true, filter:file => !path.basename(file).startsWith('.')});
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Release ready in site/build (including compiler assets and licenses).');
