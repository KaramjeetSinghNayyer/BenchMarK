import {algorithms,models,escapeHTML as esc,generateCases,parseCases,aggregate,bestFit,fitModel,toCSV} from './core.js';
import {cSources, C_FLAGS, C_COMPILER} from './c-algorithms.js';
import {compileC} from './c-client.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={language:'javascript',cSources:{...cSources},selected:new Set(['quick','merge','bubble']),sources:Object.fromEntries(algorithms.map(a=>[a.id,a.source])),customCases:[],rows:[],run:null,running:false,worker:null,cancelJob:null,cancelled:false,chartMode:'measured',chartAlgorithm:'quick',editor:'quick',view:'lab'};
const sources = () => state.language === 'c' ? state.cSources : state.sources;
const builtinSource = a => state.language === 'c' ? cSources[a.id] : a.source;
const compiledCache = new Map();
function cacheModule(source, module) { compiledCache.set(source,module); if(compiledCache.size>12)compiledCache.delete(compiledCache.keys().next().value); }
function changeLanguage(language) {
  if(state.running || !['javascript','c'].includes(language))return;
  state.language=language;
  $('#benchmark-language').value=$('#editor-language').value=language;
  openEditor(state.editor);
  status((language==='c'?'ANSI C89 → WebAssembly':'JavaScript')+' selected for the next experiment.');
}
$('#benchmark-language').onchange=()=>changeLanguage($('#benchmark-language').value);
$('#editor-language').onchange=()=>changeLanguage($('#editor-language').value);
const descriptions={lab:['Every algorithm has a story.','Go beyond Big O. Discover how sorting algorithms perform in the real world.','Benchmark lab'],algorithms:['A small change. A new possibility.','Read the code, follow the logic, and make the algorithm your own.','Algorithm studio'],cases:['Great experiments start with good inputs.','Control the data. Explore edge cases. Make your comparisons reproducible.','Test cases'],results:['From experiment to evidence.','Inspect every measurement and take your results with you.','Results & exports']};
function showView(view){if(!descriptions[view])return;state.view=view;$$('.view').forEach(el=>el.classList.toggle('active',el.id===view+'-view'));$$('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));const [title,description,crumb]=descriptions[view];$('#page-title').textContent=title;$('#page-description').textContent=description;$('#breadcrumb-current').textContent=crumb;}
$$('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('.brand').onclick=e=>{e.preventDefault();showView('lab')};
$('#open-studio').onclick=()=>showView('algorithms');$('#open-results').onclick=()=>showView('results');$('#open-cases').onclick=()=>showView('cases');
$('#methodology-button').onclick=()=>$('#methodology').showModal();$('#close-methodology').onclick=()=>$('#methodology').close();
function selectedAlgorithms(){return algorithms.filter(a=>state.selected.has(a.id));}
$('#algorithm-picker').innerHTML=algorithms.map(a=>`<label class="algo-option ${state.selected.has(a.id)?'checked':''}"><input type="checkbox" value="${a.id}" ${state.selected.has(a.id)?'checked':''}><span class="algo-dot" style="background:${a.color}"></span>${a.name}</label>`).join('');
$$('#algorithm-picker input').forEach(el=>el.onchange=()=>{if(el.checked)state.selected.add(el.value);else state.selected.delete(el.value);el.closest('label').classList.toggle('checked',el.checked);$('#selected-count').textContent=state.selected.size+' selected';if(!state.run)renderResults();});
$('#max-size').oninput=()=>$('#size-output').textContent=Number($('#max-size').value).toLocaleString();
$('#distribution').onchange=()=>{const custom=$('#distribution').value==='custom';$('#max-size').disabled=custom||state.running;$('#size-output').textContent=custom?'Custom':Number($('#max-size').value).toLocaleString();if(custom&&!state.customCases.length)showView('cases');};
function status(message,error=false){$('#run-status').textContent=message;$('#run-status').classList.toggle('error-text',error);}
function setRunning(value){state.running=value;$('#run-button').disabled=value;$('#cancel-button').hidden=!value;$('#run-progress').hidden=!value;$$('#algorithm-picker input, #distribution, #repetitions, #seed, #max-size, #save-code, #reset-code, #apply-cases, #benchmark-language, #editor-language, #editor-algorithm, #code-input').forEach(e=>e.disabled=value);if(!value)$('#max-size').disabled=$('#distribution').value==='custom';$('#chart-badge').textContent=value?'EXPERIMENT IN PROGRESS':'MEASURED ON YOUR DEVICE';}
function runJob(algorithm,testCase,run,compiled){return new Promise(resolve=>{
 let finished=false;let timer;const worker=run.language==='c'?new Worker(new URL('./c-benchmark-worker.js',import.meta.url),{type:'module'}):new Worker(new URL('./benchmark-worker.js',import.meta.url));state.worker=worker;
 const finish=(error,statusName='error')=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();if(error)state.rows.push({algorithm:algorithm.id,n:testCase.input.length,caseId:testCase.id,repetition:0,ms:null,status:statusName,error});state.worker=null;state.cancelJob=null;resolve();};
 state.cancelJob=()=>finish('Experiment stopped by user.','cancelled');
 worker.onmessage=({data})=>{if(finished)return;if(data.type==='sample'&&Number.isFinite(data.ms)&&data.ms>=0){state.rows.push({algorithm:algorithm.id,n:testCase.input.length,caseId:testCase.id,repetition:data.repetition,ms:data.ms,status:'valid'});}else if(data.type==='done')finish();else if(data.type==='error')finish(data.error);};
 worker.onerror=e=>{e.preventDefault();finish(e.message||'The algorithm worker could not run.');};
 timer=setTimeout(()=>finish('Exceeded the 12-second limit for this algorithm and test case.','timeout'),12000);
 worker.postMessage({module:compiled,source:algorithm.source,input:testCase.input,repetitions:run.repetitions});
});}
async function runBenchmark(){
 if(state.running)return {error:'An experiment is already running.'};
 let cases,seed,repetitions,selected;
 try{selected=selectedAlgorithms();if(!selected.length)throw Error('Select at least one algorithm.');seed=Number($('#seed').value);if(!$('#seed').value||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Use a whole-number seed between 0 and 4,294,967,295.');repetitions=Number($('#repetitions').value);if(![3,5,10,20].includes(repetitions))throw Error('Choose 3, 5, 10, or 20 repetitions.');cases=$('#distribution').value==='custom'?state.customCases:generateCases(Number($('#max-size').value),$('#distribution').value,seed);if(!cases.length)throw Error('Add custom test cases before starting.');}catch(e){status(e.message,true);showView('lab');return{error:e.message};}
 const run={id:crypto.randomUUID(),timestamp:new Date().toISOString(),language:state.language,compiler:state.language==='c'?C_COMPILER:'Browser JavaScript engine',compilerFlags:state.language==='c'?C_FLAGS:'',pattern:$('#distribution').value,seed,repetitions,algorithms:selected.map(a=>({...a,source:sources()[a.id],modified:sources()[a.id]!==builtinSource(a)})),cases:cases.map(c=>({...c,input:[...c.input]})),browser:navigator.userAgent,cores:navigator.hardwareConcurrency||'unknown'};
 state.run=run;state.rows=[];state.cancelled=false;setRunning(true);showView('lab');state.chartAlgorithm=run.algorithms[0].id;$('#chart-algorithm').innerHTML=run.algorithms.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');$('#run-progress').value=0;renderResults();
 let complete=0;const total=cases.length*selected.length;const failedAlgorithms=new Set();
 try{
 if(run.language==='c'){
   const missing=run.algorithms.filter(a=>!compiledCache.has(a.source));
   if(missing.length){
     const controller=new AbortController();state.cancelJob=()=>controller.abort();
     const compiled=await compileC(missing,{signal:controller.signal,onProgress:message=>status(message)});
     state.cancelJob=null;
     for(const a of missing){const result=compiled.get(a.id);if(result?.module)cacheModule(a.source,result.module);else{failedAlgorithms.add(a.id);state.rows.push({algorithm:a.id,n:run.cases[0].input.length,caseId:run.cases[0].id,repetition:0,ms:null,status:'compile-error',error:result?.error||'Compilation failed.'});}}
   }
 }
 for(let i=0;i<run.cases.length&&!state.cancelled;i++){
   const order=run.algorithms.slice(i%selected.length).concat(run.algorithms.slice(0,i%selected.length));
   for(const a of order){if(state.cancelled)break;const testCase=run.cases[i];
    if(failedAlgorithms.has(a.id)){state.rows.push({algorithm:a.id,n:testCase.input.length,caseId:testCase.id,repetition:0,ms:null,status:'skipped',error:'Skipped after an earlier failure in this algorithm.'});complete++;continue;}
    status(`Running ${a.name} · n = ${testCase.input.length.toLocaleString()} · ${complete+1}/${total}`);
    await runJob(a,testCase,run,compiledCache.get(a.source));if(state.rows.some(r=>r.algorithm===a.id&&['error','timeout'].includes(r.status)))failedAlgorithms.add(a.id);
    complete++;$('#run-progress').value=complete/total*100;renderResults();
   }
 }}catch(e){if(e.name==='AbortError')state.cancelled=true;else state.rows.push({algorithm:run.algorithms[0].id,n:run.cases[0].input.length,caseId:run.cases[0].id,repetition:0,ms:null,status:'error',error:e.message});}
 finally{setRunning(false);const issues=state.rows.filter(r=>r.status!=='valid');const count=state.rows.filter(r=>r.status==='valid').length;status(state.cancelled?`Stopped · ${count} validated measurements retained.`:issues.length?`Finished with ${issues.length} failed or skipped cases. See results for details.`:`Complete · ${count} validated measurements · ready to export.`,issues.length>0);$('#chart-badge').textContent=state.cancelled?'PARTIAL EXPERIMENT':issues.length?'COMPLETED WITH ISSUES':(run.language==='c'?'ANSI C · EXPERIMENT COMPLETE':'JS · EXPERIMENT COMPLETE');renderResults();}
 return {runId:run.id,measurements:state.rows.filter(r=>r.status==='valid').length,issues:state.rows.filter(r=>r.status!=='valid').length,cancelled:state.cancelled};
}
$('#run-button').onclick=runBenchmark;$('#cancel-button').onclick=()=>{state.cancelled=true;state.cancelJob?.();};document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&state.view==='lab'){e.preventDefault();runBenchmark();}});
function timeLabel(ms){if(ms===null||ms===undefined)return '—';return ms<.001?'< 0.001':ms.toFixed(3);}
function issueFor(id){return state.rows.find(r=>r.algorithm===id&&r.status!=='valid');}
function renderResults(){const list=state.run?.algorithms||selectedAlgorithms();const summary=list.map(a=>{const points=aggregate(state.rows,a.id);const fit=bestFit(points);return {a,points,last:points.at(-1),fit:fit&&fit.r2!==null&&fit.r2>=.7?fit:null,issue:issueFor(a.id)};});
 $('#summary-body').innerHTML=summary.map(({a,last,fit,issue})=>`<tr><td><span class="algo-name"><span class="algo-dot" style="background:${a.color}"></span>${a.name}${a.modified?'<span class="quiet">edited</span>':''}</span></td><td><span class="complexity" title="${a.modified?'Built-in reference; edited code may differ':'Typical average case'}">${a.complexity}${a.modified?'*':''}</span></td><td class="time-value">${last?timeLabel(last.time)+' <span class="quiet">ms</span>':'—'}</td><td>${fit?`<span class="complexity">${fit.label}</span> <span class="quiet" title="Empirical fit, not a complexity proof.">${fit.r2===null?'':`R² ${fit.r2.toFixed(2)}`}</span>`:'<span class="quiet">'+(last?'Insufficient signal':'Awaiting data')+'</span>'}</td><td>${issue?`<span class="invalid" title="${esc(issue.error)}">${esc(issue.status)}</span>`:last?'<span class="valid">✓ Validated</span>':'<span class="quiet">Not run</span>'}</td><td><button class="edit-link" data-edit="${a.id}">View code ↗</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-table">Select an algorithm to begin.</td></tr>';
 $$('[data-edit]').forEach(b=>b.onclick=()=>{openEditor(b.dataset.edit);showView('algorithms')});
 const valid=state.rows.filter(r=>r.status==='valid');const largest=state.run?Math.max(...state.run.cases.map(c=>c.input.length)):null;const candidates=summary.filter(s=>s.last?.n===largest&&!s.issue).sort((a,b)=>a.last.time-b.last.time);
 const tied=candidates.length>1&&Math.abs(candidates[0].last.time-candidates[1].last.time)<.001;$('#stat-fastest').textContent=tied?'Too close to call':candidates[0]?.a.name||(state.running?'Measuring…':'Awaiting a run');$('#stat-fastest-note').textContent=tied?'The leading timings are indistinguishable.':candidates.length>1&&candidates[0].last.time>0?`${(candidates.at(-1).last.time/candidates[0].last.time).toFixed(1)}× faster than ${candidates.at(-1).a.name.toLowerCase()}`:candidates.length?'At the largest measured input':'Let the measurements decide.';
 $('#stat-time').innerHTML=candidates.length?timeLabel(candidates[0].last.time)+' <small>ms</small>':'— <small>ms</small>';
 $('#stat-time-note').textContent=candidates.length?`Median at n = ${largest.toLocaleString()} · ${state.run.repetitions} runs per case`:'At the largest shared input size';$('#stat-samples').textContent=valid.length.toLocaleString();
 $('#stat-samples-note').textContent=state.run?`${state.run.algorithms.length} algorithms · ${state.run.cases.length} test cases`:'Across algorithms, sizes, and repetitions';
 $('#export-top').disabled=$('#export-results').disabled=!state.rows.length||state.running;
 $('#raw-body').innerHTML=state.rows.length?state.rows.map(r=>{const a=list.find(a=>a.id===r.algorithm);return `<tr><td><span class="algo-name"><span class="algo-dot" style="background:${a.color}"></span>${a.name}</span></td><td>${r.n.toLocaleString()}</td><td>${r.caseId}</td><td>${r.repetition||'—'}</td><td class="time-value">${timeLabel(r.ms)}</td><td><span class="${r.status==='valid'?'valid':'invalid'}">${esc(r.status)}</span>${r.error?` <span class="quiet">${esc(r.error)}</span>`:''}</td></tr>`}).join(''):'<tr><td colspan="6" class="empty-table">Your measurements will appear here after a benchmark.</td></tr>';
 if(state.run)$('#results-context').textContent=`${state.run.language==='c'?'ANSI C89 / WebAssembly (-O2)':'JavaScript'} · ${state.run.pattern} inputs · seed ${state.run.seed} · ${new Date(state.run.timestamp).toLocaleString()} · ${state.rows.length} records${state.running?' · running':''}${state.cancelled?' · partial':''}`;
 renderChart();
}
const chartEmpty=$('#chart').innerHTML;
function renderChart(){const list=state.run?.algorithms||selectedAlgorithms();$('#chart-algorithm').hidden=state.chartMode==='measured';let series=[];
 if(state.chartMode==='measured')series=list.map(a=>({name:a.name,color:a.color,points:aggregate(state.rows,a.id).map(p=>({x:p.n,y:p.time}))}));
 else{const a=list.find(a=>a.id===state.chartAlgorithm)||list[0];if(a){const points=aggregate(state.rows,a.id);const model=models.find(m=>m.id===a.theory);const fit=fitModel(points,model);const best=bestFit(points);const empirical=best&&best.r2!==null&&best.r2>=.7?best:null;if(state.chartMode==='theoretical'){series=[{name:a.name+' · measured',color:a.color,points:points.map(p=>({x:p.n,y:p.time}))},{name:a.complexity+' · scaled reference'+(a.modified?' (built-in)':''),color:'#b6b4c0',dash:true,points:points.map(p=>({x:p.n,y:fit.coefficient*model.fn(p.n)}))}];}else{const positive=points.filter(p=>p.n>0);const baseline=positive.find(p=>p.time>0);if(baseline){series=[{name:'Measured growth',color:a.color,points:positive.map(p=>({x:p.n,y:p.time/baseline.time}))},{name:a.complexity+' reference',color:'#b6b4c0',dash:true,points:positive.map(p=>({x:p.n,y:model.fn(p.n)/model.fn(baseline.n)}))}];if(empirical)series.push({name:empirical.label+' empirical fit',color:'#d3a16c',dash:true,points:positive.map(p=>({x:p.n,y:empirical.fn(p.n)/empirical.fn(baseline.n)}))});}}}}
 $('#chart-legend').innerHTML=series.map(s=>`<span class="legend-item"><i class="legend-line" style="background:${s.color};${s.dash?'background:repeating-linear-gradient(90deg,'+s.color+' 0 4px,transparent 4px 6px)':''}"></i>${s.name}</span>`).join('');
 const points=series.flatMap(s=>s.points);if(!points.length){$('#chart').innerHTML=chartEmpty;return;}
 const log=$('#log-scale').checked;const minValue=Math.min(...points.filter(p=>p.y>0).map(p=>p.y));const floor=Number.isFinite(minValue)?Math.max(1e-6,minValue/2):1e-6;const transform=y=>log?Math.log10(Math.max(floor,y)):y;const lo=log?Math.floor(Math.log10(floor)):0;let hi=log?Math.ceil(Math.log10(Math.max(...points.map(p=>p.y),floor))):Math.max(...points.map(p=>p.y),.001)*1.15;if(hi<=lo)hi=lo+1;
 const width=Math.max(300,$('#chart').clientWidth-42);const right=width-24;const xMax=Math.max(...points.map(p=>p.x),1);const X=x=>62+(x/xMax)*(right-62);const Y=y=>252-(transform(y)-lo)/(hi-lo)*206;let svg=`<svg viewBox="0 0 ${width} 300" role="img" aria-label="${state.chartMode==='growth'?'Normalized growth':'Execution time'} chart from actual benchmark measurements"><text x="12" y="18" class="axis-label">${state.chartMode==='growth'?'Growth relative to first positive sample (×)':'Execution time (ms)'}${log?' · log scale':''}</text>`;
 for(let i=0;i<=4;i++){const val=lo+(hi-lo)*i/4;const label=log?10**val:val;const y=252-i*206/4;svg+=`<path d="M62 ${y}H${right}" stroke="#ecebf2" stroke-dasharray="3 5"/><text x="49" y="${y+4}" text-anchor="end">${label>=100?label.toFixed(0):label>=1?label.toFixed(1):label.toFixed(3)}</text>`;}
 for(let i=0;i<=4;i++){const n=xMax*i/4;svg+=`<text x="${X(n)}" y="273" text-anchor="middle">${n>=1000?(n/1000).toFixed(n%1000?1:0)+'k':Math.round(n)}</text>`;}
 svg+=`<text x="${width/2}" y="298" text-anchor="middle" class="axis-label">Input size (n)</text>`;
 for(const s of [...series].reverse()){if(!s.points.length)continue;svg+=`<path d="${s.points.map((p,i)=>`${i?'L':'M'}${X(p.x).toFixed(2)} ${Y(p.y).toFixed(2)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.3" ${s.dash?'stroke-dasharray="6 5"':''}/>`;if(!s.dash)for(const p of s.points)svg+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${esc(s.name)} · n=${p.x.toLocaleString()} · ${p.y.toFixed(4)} ${state.chartMode==='growth'?'×':'ms'}</title></circle>`;}
 $('#chart').innerHTML=svg+'</svg>';
 const notes={measured:'Median of validated runs. Hover over a point for details. Very short timings are sensitive to timer resolution.',theoretical:'Dashed theory is scaled to measurements; Big O itself has no millisecond unit. Edited code may have different complexity.',growth:'Normalized to the first positive measurement. The best empirical fit describes this experiment; it does not prove Big O.'};$('#chart-footnote').innerHTML='<span>ⓘ</span>'+notes[state.chartMode]+(log?' Zero timings are plotted at the positive display floor.':'');
}
$$('[data-chart]').forEach(b=>b.onclick=()=>{state.chartMode=b.dataset.chart;$$('[data-chart]').forEach(x=>x.classList.toggle('active',x===b));renderChart();});$('#chart-algorithm').onchange=()=>{state.chartAlgorithm=$('#chart-algorithm').value;renderChart();};$('#log-scale').onchange=renderChart;
function exportCSV(){if(!state.run||state.running||!state.rows.length)return;const blob=new Blob([toCSV(state.rows,state.run)],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`benchmark-${state.run.timestamp.replace(/[:.]/g,'-')}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export-top').onclick=exportCSV;$('#export-results').onclick=exportCSV;
function highlight(){const text=$('#code-input').value;const regex=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(function|const|let|var|if|else|while|for|return|break|continue|throw|new|true|false|undefined|void|int|double|float|char|long|short|unsigned|signed|static|extern|struct|typedef|sizeof|switch|case|default|do|enum|union|volatile|auto|register|include|define|NULL)\b|\b(\d+(?:\.\d+)?)\b/g;let html='',index=0;for(const m of text.matchAll(regex)){html+=esc(text.slice(index,m.index));html+=`<span class="${m[1]?'comment':m[2]?'str':m[3]?'kw':'num'}">${esc(m[0])}</span>`;index=m.index+m[0].length;}$('#highlighted-code code').innerHTML=html+esc(text.slice(index))+'\n';}
const languageDrafts={javascript:Object.fromEntries(algorithms.map(a=>[a.id,a.source])),c:{...cSources}};
const drafts=()=>languageDrafts[state.language];
function openEditor(id){state.editor=id;$('#c-help').hidden=state.language!=='c';$('#editor-signature').textContent=state.language==='c'?'ANSI C89 · void sort(double input[], int n)':'JavaScript · sort(input) → number[]';$('#save-code').textContent=state.language==='c'?'Compile & apply':'Apply changes';$('#compiler-diagnostics').hidden=true;$('#editor-algorithm').value=id;$('#code-input').value=drafts()[id];highlight();const a=algorithms.find(a=>a.id===id);$('#code-state').textContent=drafts()[id]!==sources()[id]?'UNAPPLIED CHANGES':sources()[id]!==builtinSource(a)?'MODIFIED IMPLEMENTATION':'BUILT-IN IMPLEMENTATION';$('#editor-message').textContent=state.language==='c'?'Edit ANSI C89, then Compile & apply. Benchmark language is now ANSI C.':'Return a sorted array, or sort the input in place. Each timed run receives a fresh copy.';$('#editor-message').classList.remove('error-text');$('#algorithm-details').innerHTML=`<div><h3>AVERAGE / WORST CASE · BUILT-IN</h3><p>${a.complexity} / ${a.worst}</p></div><div><h3>AUXILIARY SPACE · BUILT-IN</h3><p>${a.space}</p></div><div><h3>THE IDEA</h3><p style="font-size:14px;color:#847c91">${a.description}</p></div>`;}
$('#editor-algorithm').innerHTML=algorithms.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');$('#editor-algorithm').onchange=()=>openEditor($('#editor-algorithm').value);$('#code-input').oninput=()=>{drafts()[state.editor]=$('#code-input').value;highlight();$('#code-state').textContent=drafts()[state.editor]===sources()[state.editor]?'APPLIED SOURCE':'UNAPPLIED CHANGES';};$('#code-input').onscroll=()=>{const pre=$('#highlighted-code'),input=$('#code-input');pre.scrollTop=input.scrollTop;pre.scrollLeft=input.scrollLeft;};$('#code-input').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();const el=e.target,start=el.selectionStart,end=el.selectionEnd;el.setRangeText('  ',start,end,'end');el.dispatchEvent(new Event('input'));}};
$('#save-code').onclick=async()=>{
  const source=$('#code-input').value;
  const id=state.editor;
  const language=state.language;
  try{
    if(!source.trim()||source.length>100000)throw Error('Keep source code between 1 and 100,000 characters.');
    if(language==='c'){
      setRunning(true);state.cancelled=false;$('#cancel-compile').hidden=false;
      const controller=new AbortController();state.cancelJob=()=>controller.abort();
      const result=(await compileC([{id,source}],{signal:controller.signal,onProgress:message=>{$('#editor-message').textContent=message;status(message);}})).get(id);
      if(!result?.module)throw Error(result?.error||'C compilation failed.');
      cacheModule(source,result.module);
      $('#compiler-diagnostics').textContent=result.diagnostics||'Compilation succeeded · ANSI C89 · -O2 · WebAssembly';
      $('#compiler-diagnostics').classList.add('success');$('#compiler-diagnostics').hidden=false;
    }else{
      new Function('"use strict";\n'+source+'\n;return sort;');
      if(!/\bsort\b/.test(source))throw Error('Define a function named sort(input).');
    }
    sources()[id]=source;$('#code-state').textContent='CHANGES APPLIED';
    $('#editor-message').textContent='Changes applied. Run a benchmark to validate and measure this code. Existing results retain their original source.';
    $('#editor-message').classList.remove('error-text');
  }catch(e){
    $('#editor-message').textContent=e.name==='AbortError'?'Compilation cancelled. Previously applied code is unchanged.':'Changes not applied. Fix the error and try again.';
    $('#editor-message').classList.add('error-text');
    $('#compiler-diagnostics').textContent=e.message;$('#compiler-diagnostics').classList.remove('success');$('#compiler-diagnostics').hidden=false;
  }finally{
    if(language==='c'){$('#cancel-compile').hidden=true;state.cancelJob=null;setRunning(false);$('#chart-badge').textContent=state.run?'PREVIOUS EXPERIMENT':'READY TO EXPLORE';status('Ready for the next experiment.');}
  }
};
$('#cancel-compile').onclick=()=>{state.cancelled=true;state.cancelJob?.();};
$('#reset-code').onclick=()=>{const a=algorithms.find(a=>a.id===state.editor);drafts()[a.id]=sources()[a.id]=builtinSource(a);openEditor(a.id);$('#editor-message').textContent='Built-in implementation restored. Run a new benchmark to measure it.';};openEditor('quick');
$('#load-sample').onclick=()=>{$('#case-input').value='[[5, 2, 9, 1, 3], [10, 8, 6, 4, 2], [3, 3, -1, 0, 3], [], [42]]';$('#case-message').textContent='Example loaded: random, reversed, duplicates, empty, and single-value cases.';};
$('#case-file').onchange=async()=>{const file=$('#case-file').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Choose a file smaller than 2 MB.');$('#case-input').value=await file.text();$('#case-message').textContent='Loaded '+file.name+'. Choose “Use these test cases” to validate.';$('#case-message').classList.remove('error-text');}catch(e){$('#case-message').textContent=e.message;$('#case-message').classList.add('error-text');}};
function applyCases(text){const parsed=parseCases(text);state.customCases=parsed;$('#case-input').value=text;$('#distribution').value='custom';$('#max-size').disabled=true;$('#size-output').textContent='Custom';$('#case-message').textContent=`${parsed.length} test cases validated and selected. Return to the lab to run your experiment.`;$('#case-message').classList.remove('error-text');$('#case-preview').innerHTML=parsed.map(c=>`<span>Case ${c.id} · ${c.input.length.toLocaleString()} elements</span>`).join('');status(`${parsed.length} custom test cases ready. Run benchmark to measure them.`);return{cases:parsed.length,sizes:parsed.map(c=>c.input.length)};}
$('#apply-cases').onclick=()=>{try{applyCases($('#case-input').value);}catch(e){$('#case-message').textContent=e.message;$('#case-message').classList.add('error-text');}};
renderResults();
const context=document.modelContext;
if(context?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};register({name:'read_benchmark_results',description:'Read the current experiment and aggregated validated results.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({running:state.running,language:state.run?.language||state.language,runId:state.run?.id||null,measurements:state.rows.length,algorithms:(state.run?.algorithms||[]).map(a=>({name:a.name,points:aggregate(state.rows,a.id),issue:issueFor(a.id)?.status||null}))})});register({name:'configure_custom_test_cases',description:'Validate and select custom numeric test cases for the next experiment.',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(state.running)throw Error('Wait for the running experiment.');if(typeof input?.text!=='string')throw Error('text must be a string.');return applyCases(input.text);}});register({name:'run_benchmark',description:'Run selected algorithms with the current configuration and await measurements.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:runBenchmark});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}

new ResizeObserver(()=>renderChart()).observe($('#chart'));
