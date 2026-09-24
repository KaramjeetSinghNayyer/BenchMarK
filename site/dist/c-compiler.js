import API from './vendor/clang/shared.js';

const harness = `
#undef sort
static double benchmark_values[20000];
double *benchmark_input(void) { return benchmark_values; }
void benchmark_sort(int n) { sort(benchmark_values, n); }
`;

export async function loadCompiler({readAsset, onProgress = () => {}} = {}) {
  const read = readAsset || (async name => {
    const response = await fetch(new URL('./vendor/clang/' + name + '.gz', import.meta.url));
    if (!response.ok) throw new Error('Unable to load C compiler (' + response.status + '). Please retry.');
    return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  });
  let diagnostics = '';
  onProgress('Loading the C compiler. The first use downloads about 19 MB.');
  const moduleNames = ['clang', 'lld', 'memfs'];
  const compiled = new Map(await Promise.all(moduleNames.map(async name => [name, await WebAssembly.compile(await read(name))])));
  const api = new API({
    readBuffer: read,
    compileStreaming: name => Promise.resolve(compiled.get(name)),
    hostWrite: text => { diagnostics = (diagnostics + text).slice(-16000); }
  });
  await api.ready;
  let next = 0;
  return async source => {
    if (typeof source !== 'string' || !source.trim() || source.length > 100000) throw new Error('Supply between 1 and 100,000 characters of C source.');
    const id = ++next;
    const input = 'algorithm' + id + '.c', obj = 'algorithm' + id + '.o', output = 'algorithm' + id + '.wasm';
    diagnostics = '';
    api.memfs.addFile(input, new TextEncoder().encode('void sort(double input[], int n);\n#line 1 "algorithm.c"\n' + source + '\n#line 1 "benchmark-harness.c"\n' + harness));
    try {
      onProgress('Compiling ANSI C89 with optimization -O2…');
      await api.run(compiled.get('clang'), 'clang', '-cc1', '-emit-obj', '-triple', 'wasm32-unknown-wasi', '-isysroot', '/', '-internal-isystem', '/include', '-internal-isystem', '/lib/clang/8.0.1/include', '-std=c89', '-pedantic-errors', '-O2', '-ferror-limit', '8', '-o', obj, '-x', 'c', input);
      await api.run(compiled.get('lld'), 'wasm-ld', '--no-threads', '--no-entry', '--export=benchmark_input', '--export=benchmark_sort', '-z', 'stack-size=1048576', '--max-memory=67108864', '-Llib/wasm32-wasi', obj, '-lc', '-o', output);
      const bytes = api.memfs.getFileContents(output).slice();
      const module = await WebAssembly.compile(bytes);
      return {module, diagnostics: cleanDiagnostics(diagnostics)};
    } catch (error) {
      throw new Error(cleanDiagnostics(diagnostics) || error.message);
    }
  };
}

function cleanDiagnostics(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(line => !line.startsWith('> ')).join('\n').trim();
}
