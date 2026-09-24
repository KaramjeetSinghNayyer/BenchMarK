export const algorithms = [
{id:'quick',name:'Quick sort',color:'#8b70dc',theory:'nlogn',complexity:'O(n log n)',worst:'O(n²)',space:'O(log n) average',description:'Partition around a middle pivot, then sort each side. Usually fast, but partition quality matters.',source:`function sort(input) {
  // Partition in place around a middle pivot.
  function quick(left, right) {
    if (left >= right) return;
    const pivot = input[(left + right) >> 1];
    let i = left, j = right;
    while (i <= j) {
      while (input[i] < pivot) i++;
      while (input[j] > pivot) j--;
      if (i <= j) {
        [input[i], input[j]] = [input[j], input[i]];
        i++; j--;
      }
    }
    if (left < j) quick(left, j);
    if (i < right) quick(i, right);
  }
  quick(0, input.length - 1);
  return input;
}`},
{id:'merge',name:'Merge sort',color:'#46a99a',theory:'nlogn',complexity:'O(n log n)',worst:'O(n log n)',space:'O(n)',description:'Divide into halves, then merge sorted pieces. Predictable growth with extra memory for merging.',source:`function sort(input) {
  if (input.length <= 1) return input;
  const middle = Math.floor(input.length / 2);
  const left = sort(input.slice(0, middle));
  const right = sort(input.slice(middle));
  const result = [];
  let i = 0, j = 0;
  // Take the smaller value from either half.
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  while (i < left.length) result.push(left[i++]);
  while (j < right.length) result.push(right[j++]);
  return result;
}`},
{id:'bubble',name:'Bubble sort',color:'#dda66c',theory:'quadratic',complexity:'O(n²)',worst:'O(n²)',space:'O(1)',description:'Swap neighboring values until the largest reaches the end. An early exit makes sorted inputs much faster.',source:`function sort(input) {
  for (let end = input.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      if (input[i] > input[i + 1]) {
        [input[i], input[i + 1]] = [input[i + 1], input[i]];
        swapped = true;
      }
    }
    // Already sorted? No more passes are needed.
    if (!swapped) break;
  }
  return input;
}`},
{id:'insertion',name:'Insertion sort',color:'#729cd9',theory:'quadratic',complexity:'O(n²)',worst:'O(n²)',space:'O(1)',description:'Insert each value into a sorted prefix. Useful for small arrays and nearly sorted data.',source:`function sort(input) {
  for (let i = 1; i < input.length; i++) {
    const value = input[i];
    let j = i - 1;
    // Shift larger values to make room.
    while (j >= 0 && input[j] > value) {
      input[j + 1] = input[j];
      j--;
    }
    input[j + 1] = value;
  }
  return input;
}`},
{id:'selection',name:'Selection sort',color:'#d47e9e',theory:'quadratic',complexity:'O(n²)',worst:'O(n²)',space:'O(1)',description:'Repeatedly select the smallest remaining value. Uses few swaps but still scans the unsorted portion.',source:`function sort(input) {
  for (let i = 0; i < input.length - 1; i++) {
    let smallest = i;
    for (let j = i + 1; j < input.length; j++) {
      if (input[j] < input[smallest]) smallest = j;
    }
    if (smallest !== i) {
      [input[i], input[smallest]] = [input[smallest], input[i]];
    }
  }
  return input;
}`},
{id:'heap',name:'Heap sort',color:'#a49a79',theory:'nlogn',complexity:'O(n log n)',worst:'O(n log n)',space:'O(1)',description:'Build a max heap and repeatedly move its largest value to the end. Guaranteed n log n growth in place.',source:`function sort(input) {
  function sift(size, root) {
    while (true) {
      let largest = root;
      const left = 2 * root + 1;
      const right = left + 1;
      if (left < size && input[left] > input[largest]) largest = left;
      if (right < size && input[right] > input[largest]) largest = right;
      if (largest === root) return;
      [input[root], input[largest]] = [input[largest], input[root]];
      root = largest;
    }
  }
  for (let i = Math.floor(input.length / 2) - 1; i >= 0; i--) {
    sift(input.length, i);
  }
  for (let end = input.length - 1; end > 0; end--) {
    [input[0], input[end]] = [input[end], input[0]];
    sift(end, 0);
  }
  return input;
}`}
];
export const models = [
  {id:'constant',label:'O(1)',fn:n=>1},
  {id:'log',label:'O(log n)',fn:n=>Math.log2(Math.max(2,n))},
  {id:'linear',label:'O(n)',fn:n=>n},
  {id:'nlogn',label:'O(n log n)',fn:n=>n*Math.log2(Math.max(2,n))},
  {id:'quadratic',label:'O(n²)',fn:n=>n*n},
  {id:'cubic',label:'O(n³)',fn:n=>n*n*n}
];
export const escapeHTML = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function seededRandom(seed) {let state=seed>>>0;return()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296}}
export function generateCases(max,pattern,seed) {
  if(!Number.isInteger(max)||max<100||max>20000) throw Error('Input size must be between 100 and 20,000.');
  if(!['random','sorted','reversed','nearly','duplicates'].includes(pattern)) throw Error('Choose a valid input pattern.');
  const sizes=[...new Set([.1,.25,.5,.75,1].map(f=>Math.max(10,Math.round(f*max))))];
  const random=seededRandom(seed);
  return sizes.map((n,index)=>{let input=Array.from({length:n},()=>Math.floor(random()*(pattern==='duplicates'?8:n*10)));
    if(['sorted','reversed','nearly'].includes(pattern)) input.sort((a,b)=>a-b);
    if(pattern==='reversed') input.reverse();
    if(pattern==='nearly') for(let i=0;i<Math.max(1,Math.floor(n*.01));i++){const a=Math.floor(random()*n),b=Math.floor(random()*n);[input[a],input[b]]=[input[b],input[a]];}
    return {id:index+1,input};});
}
export function parseCases(text) {
  if(new TextEncoder().encode(text).length>2*1024*1024) throw Error('Test cases must be smaller than 2 MB.');
  const trimmed=text.trim();if(!trimmed) throw Error('Paste or upload at least one test case.');
  let arrays;
  if(trimmed.startsWith('[')) {try {const parsed=JSON.parse(trimmed);arrays=Array.isArray(parsed)&&parsed.every(x=>typeof x==='number')?[parsed]:parsed;}catch{throw Error('Invalid JSON. Use [3, 1, 2] or [[3, 1], [4, 2]].');}}
  else arrays=trimmed.split(/\r?\n/).filter(l=>l.trim()).map(line=>line.split(',').map(v=>{if(!v.trim()) throw Error('CSV contains an empty value. Use numbers without headers.');const n=Number(v.trim());if(!Number.isFinite(n))throw Error('CSV accepts finite numbers only; omit headers.');return n;}));
  if(!Array.isArray(arrays)||arrays.length<1||arrays.length>20) throw Error('Supply between 1 and 20 test cases.');
  arrays.forEach((a,i)=>{if(!Array.isArray(a)||a.length>20000||!a.every(n=>typeof n==='number'&&Number.isFinite(n))) throw Error(`Case ${i+1}: use an array of finite numbers with at most 20,000 elements.`);});
  return arrays.map((input,i)=>({id:i+1,input}));
}
export function median(values) {if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);const i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;}
export function aggregate(rows,id) {const groups=new Map();for(const row of rows)if(row.algorithm===id&&row.status==='valid'){if(!groups.has(row.n))groups.set(row.n,[]);groups.get(row.n).push(row.ms);}return [...groups].map(([n,times])=>({n,time:median(times),min:Math.min(...times),max:Math.max(...times),count:times.length})).sort((a,b)=>a.n-b.n);}
export function fitModel(points,model) {const usable=points.filter(p=>p.n>0&&Number.isFinite(p.time));if(!usable.length)return {coefficient:0,error:Infinity,r2:null};const xs=usable.map(p=>model.fn(p.n));const ys=usable.map(p=>p.time);const coefficient=xs.reduce((s,x,i)=>s+x*ys[i],0)/xs.reduce((s,x)=>s+x*x,0);const error=xs.reduce((s,x,i)=>s+(ys[i]-coefficient*x)**2,0);const mean=ys.reduce((a,b)=>a+b,0)/ys.length;const total=ys.reduce((s,y)=>s+(y-mean)**2,0);return{coefficient,error,r2:total>0?1-error/total:null};}
export function bestFit(points) {const positive=points.filter(p=>p.n>0);if(positive.length<4||Math.max(...positive.map(p=>p.time))<.05) return null;return models.map(m=>({...m,...fitModel(positive,m)})).sort((a,b)=>a.error-b.error)[0];}
export function fingerprint(input) {let hash=2166136261;for(const c of JSON.stringify(input)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
export function csvCell(value){const text=String(value??'');const safe=/^[=+@\t\r]/.test(text)||(text.startsWith('-')&&!Number.isFinite(Number(text)))?"'"+text:text;return '"'+safe.replaceAll('"','""')+'"';}
export function toCSV(rows,run) {
 const headers=['run_id','timestamp_utc','language','compiler','compiler_flags','algorithm','modified','input_size','case_id','input_fingerprint','repetition','elapsed_ms','status','error','pattern','seed','max_input_size_requested','generator_version','repetitions_requested','warmup_runs','case_timeout_ms','theoretical_average_builtin','browser','hardware_concurrency','source_code','custom_input_json'];
 const lines=rows.map(r=>{const a=run.algorithms.find(a=>a.id===r.algorithm);const c=run.cases.find(c=>c.id===r.caseId);return[run.id,run.timestamp,run.language||'javascript',run.compiler||'Browser JavaScript engine',run.compilerFlags||'',a.name,a.modified,r.n,r.caseId,fingerprint(c.input),r.repetition,r.ms??'',r.status,r.error||'',run.pattern,run.seed,Math.max(...run.cases.map(c=>c.input.length)),'mulberry32-v1',run.repetitions,1,12000,a.complexity,run.browser,run.cores,a.source,run.pattern==='custom'?JSON.stringify(c.input):''].map(csvCell).join(',');});
 return '\uFEFF'+[headers.map(csvCell).join(','),...lines].join('\r\n');
}
