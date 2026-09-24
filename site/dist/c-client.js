// Compiler workers are terminated after each batch, releasing the compiler heap.
export function compileC(sources, {signal, onProgress = () => {}} = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./c-compiler-worker.js', import.meta.url), {type:'module'});
    const results = new Map();
    let finished = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      if (error) reject(error); else resolve(results);
    };
    const abort = () => finish(new DOMException('Compilation cancelled.', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('C compilation exceeded 120 seconds. Please retry.')), 120000);
    signal?.addEventListener('abort', abort, {once:true});
    if (signal?.aborted) { abort(); return; }
    worker.onmessage = ({data}) => {
      if (data.type === 'progress') onProgress(data.message);
      else if (data.type === 'compiled' || data.type === 'compile-error') results.set(data.id, data);
      else if (data.type === 'done') finish();
      else if (data.type === 'error') finish(new Error(data.error));
    };
    worker.onerror = event => { event.preventDefault(); finish(new Error(event.message || 'C compiler could not start.')); };
    worker.postMessage({sources});
  });
}
