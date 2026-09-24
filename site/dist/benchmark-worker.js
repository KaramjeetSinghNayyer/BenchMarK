// A disposable worker keeps edited synchronous code off the UI thread.
self.onmessage = ({data}) => {
  const {source,input,repetitions}=data;
  const send=self.postMessage.bind(self);
  const now=performance.now.bind(performance);
  try {
    const sort = new Function('"use strict";\n'+source+'\n;return typeof sort === "function" ? sort : null;')();
    if(typeof sort!=='function') throw Error('Define a function named sort(input).');
    const reference=[...input].sort((a,b)=>a-b);
    const validate=(output)=>{
      if(!Array.isArray(output)) throw Error('Return an array, or sort the input in place. Async functions are not supported.');
      if(output.length!==reference.length||reference.some((value,i)=>value!==output[i])) throw Error('Incorrect output: values must be sorted ascending, with every original value preserved.');
    };
    const warm=[...input];const warmResult=sort(warm);validate(warmResult===undefined?warm:warmResult);
    for(let repetition=1;repetition<=repetitions;repetition++) {
      const copy=[...input];
      const start=now();const result=sort(copy);const ms=Math.max(0,now()-start);
      validate(result===undefined?copy:result);
      send({type:'sample',repetition,ms});
    }
    send({type:'done'});
  }catch(error){send({type:'error',error:String(error?.message||error).slice(0,500)});}
};
