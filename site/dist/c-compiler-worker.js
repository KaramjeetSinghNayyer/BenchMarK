import {loadCompiler} from './c-compiler.js';
self.onmessage = async ({data}) => {
  try {
    const compile = await loadCompiler({onProgress: message => self.postMessage({type:'progress',message})});
    for (const {id,source} of data.sources) {
      try {
        const result = await compile(source);
        self.postMessage({type:'compiled',id,...result});
      } catch (error) {
        self.postMessage({type:'compile-error',id,error:error.message});
      }
    }
    self.postMessage({type:'done'});
  } catch (error) {
    self.postMessage({type:'error',error:error.message});
  }
};
