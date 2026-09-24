import {instantiateC} from './c-runtime.js';
self.onmessage = async ({data}) => {
  try {
    const {module,input,repetitions} = data;
    const runtime = await instantiateC(module);
    const expected = [...input].sort((a,b)=>a-b);
    const validate = () => {
      const result = runtime.result(input.length);
      if (result.some((value,i)=>value!==expected[i])) throw new Error('Incorrect C output: sort ascending in place and preserve every original value.');
    };
    runtime.prepare(input); runtime.sort(input.length); validate();
    for (let repetition=1;repetition<=repetitions;repetition++) {
      runtime.prepare(input);
      const start=performance.now(); runtime.sort(input.length); const ms=performance.now()-start;
      validate();
      self.postMessage({type:'sample',repetition,ms});
    }
    self.postMessage({type:'done'});
  } catch (error) { self.postMessage({type:'error',error:error.message}); }
};
