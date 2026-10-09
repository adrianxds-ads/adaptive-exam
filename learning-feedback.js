/* XDS Lab learning feedback, due rules and local history. v1.0.0 */
(function(root){
'use strict';
const HOLD_MS=1100,DAY=86400000;
function inject(){
 if(document.getElementById('ql-style'))return;
 const s=document.createElement('style');s.id='ql-style';s.textContent=
 '.ql-answer{color:#382500!important;background:#ffe19a!important;box-shadow:0 0 0 2px #d7a844;border-radius:.28em;padding:.04em .18em;box-decoration-break:clone;font-weight:800}.ql-correction{color:#382500;background:#ffe6aa;border:2px solid #cda451;border-radius:12px;padding:10px 14px;margin:8px 0;font-size:clamp(20px,5vw,30px);font-weight:750;line-height:1.3;overflow-wrap:anywhere}.ql-correction small{display:block;font-size:14px;letter-spacing:.04em}.ql-production{width:100%;min-height:60px;border:2px solid #b8913c;border-radius:12px;padding:12px;font:inherit;font-size:26px;box-sizing:border-box}.ql-submit{min-height:48px;margin:10px 0;font:inherit;padding:8px 18px;border-radius:12px}.ql-history{font:inherit;margin:12px;padding:10px;border-radius:10px}';
 document.head.append(s);
}
function clear(){document.querySelectorAll('.ql-correction').forEach(x=>x.remove());}
function show(host,prompt,answer,label='Respuesta correcta'){
 if(typeof host==='string')host=document.querySelector(host);if(!host)return;inject();clear();
 const p=String(prompt||''),a=String(answer??''),gap=p.match(/_{2,}/);
 if(gap){host.replaceChildren(document.createTextNode(p.slice(0,gap.index)));const m=document.createElement('mark');m.className='ql-answer';m.textContent=a;host.append(m,document.createTextNode(p.slice(gap.index+gap[0].length)));host.setAttribute('aria-live','polite');m.scrollIntoView({block:'nearest',behavior:'instant'});}
 else {const box=document.createElement('div'),small=document.createElement('small'),strong=document.createElement('strong');box.className='ql-correction';box.setAttribute('role','status');small.textContent=label;strong.textContent=a;box.append(small,strong);host.before(box);box.scrollIntoView({block:"nearest",behavior:"instant"});}
}
function gap(host,answer){if(!host)return;inject();host.replaceChildren(document.createTextNode(String(answer??'')));host.classList.add('ql-answer');host.setAttribute('aria-label','Respuesta correcta: '+answer);}
function ready(info,level,now=Date.now()){
 if(!info)return false;const ts=Number(info.lastTs||info.lastSeen)||0,elapsed=(now-ts)/DAY;
 if(info.lastCorrect===false)return (Number.isFinite(info.lastLevel)&&level-info.lastLevel>=4)||elapsed>=.25;
 return now>=Number(info.nextDueTs||ts+(Number(info.intervalDays)||1)*DAY);
}
function space(info,ok,fast=false,now=Date.now()){
 const last=Number(info.lastTs||info.lastSeen)||0,old=Math.max(1,Number(info.intervalDays)||1);
 const interval=ok?((last&&now-last<DAY/2)?old:Math.min(30,Math.max(1,Math.round(old*(fast?2:1.6))))):.25;
 return {lastTs:now,lastCorrect:!!ok,intervalDays:interval,nextDueTs:now+interval*DAY};
}
function normalize(v){return String(v??'').toLocaleLowerCase().normalize('NFC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();}
function production(q,host,done){inject();const input=document.createElement('input'),button=document.createElement('button');input.className='ql-production';input.autocomplete='off';input.dataset.adKeyboard=q.lemma?'ca':'en';input.spellcheck=false;input.setAttribute('aria-label','Escribe la respuesta');button.className='ql-submit';button.type='button';button.textContent='Comprobar';let locked=false;
 const submit=()=>{if(locked||!input.value.trim())return;locked=true;input.disabled=true;button.disabled=true;q.productionAnswer=input.value.trim();const valid=(q.acceptedForms?.length?q.acceptedForms:[q.a[q.c]]).some(x=>normalize(x)===normalize(q.productionAnswer));done(valid?q.correctPos:-1);};
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();submit();}});button.onclick=submit;host.replaceChildren(input,button);q.retrievalMode='PRODUCTION';return input;
}
let dbPromise=null;const archived=new Map(),pending=new Map(),sets=new Map();
function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{if(!root.indexedDB){reject(Error('History archive unavailable'));return;}const req=indexedDB.open('xds-learning-history-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('records',{keyPath:'key'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}));}
function identity(row,i){return [row.eventId||'',row.ts||row.at||row.timestamp||row.completedAt||0,row.qid||row.id||row.level||row.questionCount||i,row.sessionId||row.mode||''].join('|');}
function archive(rows,bucket){
 if(!Array.isArray(rows)||!rows.length)return;
 let known=sets.get(bucket);if(!known){known=new Set();sets.set(bucket,known);}
 const fresh=rows.map((row,i)=>({key:bucket+':'+identity(row,i),bucket,row})).filter(x=>!known.has(x.key));if(!fresh.length)return;
 fresh.forEach(x=>known.add(x.key));
 const job=(pending.get(bucket)||Promise.resolve()).then(async()=>{const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('records','readwrite');fresh.forEach(x=>tx.objectStore('records').put(x));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});archived.set(bucket,true);});
 pending.set(bucket,job.catch(e=>{archived.set(bucket,false);fresh.forEach(x=>known.delete(x.key));console.warn('History retained in progress; archive unavailable',e);}));
}
function retain(rows,limit,bucket){archive(rows,bucket);return archived.get(bucket)?rows.slice(-limit):rows;}
function preserve(rows,bucket){archive(rows,bucket);return rows;}
async function exportHistory(){
 await Promise.all([...pending.values()]);const d=await db(),rows=await new Promise((resolve,reject)=>{const req=d.transaction('records').objectStore('records').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({schema:'XDS_LEARNING_HISTORY_V1',exportedAt:new Date().toISOString(),records:rows},null,2)],{type:'application/json'}));a.href=url;a.download='xds-historial-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportButton(){const footer=document.querySelector('footer,.app-footer');if(!footer||document.querySelector('.ql-history'))return;const b=document.createElement('button');b.className='ql-history';b.textContent='Exportar historial';b.onclick=()=>exportHistory().catch(()=>{b.textContent='No se pudo exportar; el progreso sigue conservado';});footer.append(b);}

function evidence(rows,selector='#statsScreen'){
 const host=document.querySelector(selector);if(!host)return;inject();let panel=host.querySelector('.ql-evidence');if(!panel){panel=document.createElement('section');panel.className='ql-evidence';panel.style.cssText='padding:14px;margin:12px 0;border:1px solid #b8913c;border-radius:12px;font-size:18px;line-height:1.5';host.append(panel);}
 const valid=(rows||[]).filter(r=>typeof r.correct==='boolean'||typeof r.ok==='boolean'),production=valid.filter(r=>(r.retrievalMode||r.mode)==='PRODUCTION'),recognition=valid.filter(r=>(r.retrievalMode||r.mode)!=='PRODUCTION'),delayed=[],last=new Map();
 for(const row of valid){const key=row.qid||row.id||row.sourceKey,at=Number(row.ts||row.at||row.timestamp)||Date.parse(row.completedAt||''),prior=key&&last.get(key);if(row.delayedRecall===true||(prior&&Number.isFinite(at)&&at-prior>=DAY))delayed.push(row);if(key&&Number.isFinite(at))last.set(key,at);}
 const line=(title,data)=>title+': '+(data.length?Math.round(100*data.filter(r=>r.correct??r.ok).length/data.length)+'% · '+data.length+' respuestas':'sin evidencia todavía');
 panel.replaceChildren();const title=document.createElement('strong');title.textContent='Cómo estamos recordando';panel.append(title);
 for(const text of [line('Con opciones',recognition),line('Respuesta escrita',production),line('Repaso tras al menos un día',delayed)]){const p=document.createElement('p');p.style.margin='4px 0';p.textContent=text;panel.append(p);}
 const note=document.createElement('small');note.textContent='Respuestas disponibles. La rapidez se mide por separado.';panel.append(note);
}

root.QuizLearning=Object.freeze({version:'1.0.0',HOLD_MS,show,gap,clear,ready,space,normalize,production,archive,retain,preserve,exportHistory,evidence});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',exportButton);else exportButton();
})(window);
