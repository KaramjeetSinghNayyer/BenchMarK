export async function instantiateC(module) {
  // No browser or network APIs are exposed to student C programs.
  const imports = {};
  let instance;
  for (const entry of WebAssembly.Module.imports(module)) {
    if (entry.kind !== 'function') throw new Error('Unsupported C module import: ' + entry.name);
    const namespace = imports[entry.module] ||= {};
    namespace[entry.name] = (...args) => {
      if (entry.name === 'proc_exit') throw new Error('C program exited with code ' + args[0] + '.');
      if (entry.name === 'fd_write') {
        const [fd,iovs,count,written] = args;
        if (fd !== 1 && fd !== 2) return 8;
        const view = new DataView(instance.exports.memory.buffer);
        let bytes = 0;
        for (let i=0;i<count;i++) bytes += view.getUint32(iovs+i*8+4,true);
        view.setUint32(written,bytes,true);
        return 0; // stdout is intentionally discarded in benchmark mode.
      }
      throw new Error('This benchmark does not support C runtime API: ' + entry.name);
    };
  }
  instance = await WebAssembly.instantiate(module, imports);
  const {memory, benchmark_input: pointer, benchmark_sort: sort} = instance.exports;
  if (!memory || !pointer || !sort) throw new Error('C module is missing the required sorting interface.');
  const address = pointer();
  return {
    prepare(input) { new Float64Array(memory.buffer, address, input.length).set(input); },
    sort(n) { sort(n); },
    result(n) { return Array.from(new Float64Array(memory.buffer,address,n)); }
  };
}
