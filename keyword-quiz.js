(()=>{
'use strict';
const $=id=>document.getElementById(id);
const STORE='cambridgeKeywordQuizPilotV1',PREF='cambridgeKeywordQuizPreferencesV1';
const ROUND=15,READ_MS=2800,HOLD_MS=1650;
const sources=window.ADAPTIVE_EXAM_PAPERS||[];
const drafts=window.KEYWORD_QUIZ_PILOT||{};
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const normalise=s=>String(s||'').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
const words=s=>String(s).trim().split(/\s+/).filter(Boolean);
const canonical=s=>String(s).replace(/\(([^)]+)\)/g,'').replace(/\s+/g,' ').trim();
const shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
function valid(o,keyword){
 const count=words(o).length;
 return count>=2&&count<=5&&words(o).some(w=>w.replace(/^[^a-z]+|[^a-z]+$/gi,'').toUpperCase()===keyword.toUpperCase());
}
const bank=[];
for(const p of sources){
 if(!p.parts?.['4']||p.examNumber<11||p.examNumber>30)continue;
 for(const item of p.parts['4'].items||[]){
  const id=p.examNumber+':'+item.n;
  if(!Object.hasOwn(drafts,id))continue;
  const correct=canonical(item.answers?.[0]||item.display||'');
  const raw=drafts[id];
  const options=[correct,...raw];
  if(!item.first||!item.keyword||!item.secondBefore||item.secondAfter===undefined||raw.length!==5||options.some(o=>!valid(o,item.keyword))||new Set(options.map(normalise)).size!==6){
   console.warn('Invalid Keyword Quiz item',id,{correct,options});continue;
  }
  // Alternative official keys must never be displayed as false distractors.
  const accepted=(item.answers||[]).map(canonical).map(normalise);
  if(raw.some(d=>accepted.includes(normalise(d)))){console.warn('Official alternative in distractors',id);continue;}
  bank.push({id,paper:Number(p.examNumber),number:Number(item.n),first:item.first,keyword:item.keyword,before:item.secondBefore,after:item.secondAfter,correct,distractors:raw,accepted,explanation:item.explanation||''});
 }
}
function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch{return fallback;}}
const stats=readJSON(STORE,{attempts:[],sessions:[]});
const pref=readJSON(PREF,{difficulty:'normal',readFirst:true});
// Earlier six-option sessions remain in progress history, but all new rounds use four options.
pref.difficulty='normal';
const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(stats));}catch(e){console.warn('Keyword progress save failed',e);}};
const savePref=()=>{try{localStorage.setItem(PREF,JSON.stringify(pref));}catch(_){}};
let state=null,interval=null,delay=null,nextDelay=null;
const stop=()=>{clearInterval(interval);clearTimeout(delay);clearTimeout(nextDelay);interval=delay=nextDelay=null;};
const show=id=>{['kqHome','kqPlay','kqFinish'].forEach(x=>$(x).classList.toggle('hidden',x!==id));window.scrollTo(0,0);};
const nfmt=n=>Number(n||0).toLocaleString('es-ES');
function questionStats(id){
 const all=stats.attempts.filter(a=>a.id===id);
 return {tries:all.length,errors:all.filter(a=>!a.correct).length,last:all.at(-1),recent:all.slice(-4)};
}
function choose(){
 const pool=bank.map(q=>{
  const s=questionStats(q.id),last=s.last,miss=s.recent.filter(a=>!a.correct).length;
  const since=last?stats.sessions.length-(last.sessionOrdinal||0):999;
  let weight=!s.tries?5:since<2&&last?.correct?0.6:2.2+miss*1.5;
  if(s.tries>=3&&!miss)weight*=.42;
  return {q,weight};
 });
 const result=[];
 while(pool.length&&result.length<ROUND){
  let value=Math.random()*pool.reduce((v,x)=>v+x.weight,0),i=0;
  for(;i<pool.length-1;i++){value-=pool[i].weight;if(value<=0)break;}
  result.push(pool.splice(i,1)[0].q);
 }
 return result;
}
function renderHome(){
 $('kqBankLabel').textContent=bank.length+' transformaciones piloto · Exámenes 11–14 · 4 opciones con posiciones variables';
 const total=stats.attempts.length,correct=stats.attempts.filter(x=>x.correct).length,unique=new Set(stats.attempts.map(x=>x.id)).size;
 const medals=stats.sessions.reduce((acc,s)=>{if(s.correct===15)acc.gold++;else if(s.correct===14)acc.violet++;else if(s.correct===13)acc.blue++;return acc;},{gold:0,violet:0,blue:0});
 $('kqHomeStats').innerHTML=[
  [''+unique+' / '+bank.length,'Vistas'],
  [total?Math.round(correct/total*100)+'%':'—','Acierto'],
  [stats.sessions.length,'Rondas'],
  [Math.floor(medals.gold/5)+' ★','Estrellas · 5 oros']
 ].map(([v,k])=>'<div class="metric"><b>'+esc(v)+'</b><span>'+esc(k)+'</span></div>').join('');
 $('kqStart').disabled=bank.length<ROUND;
}
function persistSettings(){
 pref.difficulty='normal';
 pref.readFirst=$('kqReadFirst').checked;
 savePref();
}
function begin(){
 persistSettings();if(bank.length<ROUND)return;
 stop();state={sessionId:'keyword-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
   questions:choose(),index:0,correct:0,points:0,answered:false,difficulty:pref.difficulty,readFirst:pref.readFirst};
 show('kqPlay');renderQuestion();
}
function question(){
 return state?.questions[state.index];
}
function keywordPosition(value,keyword){
 return words(value).findIndex(w=>w.replace(/^[^a-z]+|[^a-z]+$/gi,'').toUpperCase()===keyword.toUpperCase());
}
function choices(q){
 // One distractor moves the mandatory word where a reviewed alternative exists.
 // This prevents the learner from guessing by the fixed position of the keyword.
 const originalPosition=keywordPosition(q.correct,q.keyword);
 const shifted=shuffle(q.distractors.filter(d=>keywordPosition(d,q.keyword)!==originalPosition));
 const first=shifted[0]||null;
 const others=shuffle(q.distractors.filter(d=>d!==first)).slice(0,first?2:3);
 const picked=first?[first,...others]:others;
 return shuffle([q.correct,...picked].map(value=>({value,correct:value===q.correct})));
}
function secondText(q,answer='',result=''){
 const gap=answer||'________';
 return esc(q.before)+'<mark class="kq-hole '+(result||'')+'">'+esc(gap)+'</mark>'+esc(q.after);
}
function renderQuestion(){
 stop();state.answered=false;
 const q=question(),limit=15;
 state.limit=limit;state.selected=null;state.options=choices(q);
 $('kqPosition').textContent=(state.index+1)+' / '+state.questions.length;
 $('kqMode').textContent='KEYWORD QUIZ · 4 OPCIONES';
 $('kqScore').textContent=state.points+' puntos';
 $('kqBar').style.width=(state.index/state.questions.length*100)+'%';
 $('kqSource').textContent='EXAM '+String(q.paper).padStart(2,'0')+' · PREGUNTA '+q.number+' · PART 4';
 $('kqOriginal').textContent=q.first;
 $('kqKeyword').textContent=q.keyword;
 $('kqSecond').innerHTML=secondText(q);
 $('kqFeedback').className='kq-feedback hidden';
 $('kqFeedback').textContent='';
 const host=$('kqChoices');
 host.classList.add('hidden');host.innerHTML=state.options.map((o,i)=>
  '<button class="kq-choice" type="button" data-answer="'+i+'"><b>'+String.fromCharCode(65+i)+'</b><span>'+esc(o.value)+'</span></button>').join('');
 host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>answer(Number(b.dataset.answer))));
 $('kqReveal').classList.toggle('hidden',!state.readFirst);
 $('kqSeconds').textContent=state.readFirst?'…':String(limit);
 $('kqClock').style.setProperty('--fill','100%');
 if(state.readFirst)delay=setTimeout(reveal,READ_MS);else reveal();
}
function reveal(){
 if(!state||state.answered||!$('kqChoices').classList.contains('hidden'))return;
 clearTimeout(delay);delay=null;
 $('kqChoices').classList.remove('hidden');$('kqReveal').classList.add('hidden');
 state.started=performance.now();
 const tick=()=>{
  if(!state||state.answered)return;
  const left=Math.max(0,state.limit-(performance.now()-state.started)/1000);
  $('kqSeconds').textContent=String(Math.ceil(left));
  $('kqClock').style.setProperty('--fill',(left/state.limit*100).toFixed(2)+'%');
  if(left<=0)answer(-1);
 };
 tick();interval=setInterval(tick,90);
}
function answer(index){
 if(!state||state.answered||$('kqChoices').classList.contains('hidden'))return;
 const q=question(),o=state.options[index],ok=!!o?.correct;
 const secs=Math.min(state.limit,(performance.now()-state.started)/1000);
 const points=ok?100+Math.round(50*Math.max(0,(state.limit-secs)/state.limit)):0;
 state.answered=true;clearInterval(interval);interval=null;
 state.correct+=Number(ok);state.points+=points;
 const record={id:q.id,paper:q.paper,number:q.number,mode:state.difficulty,correct:ok,chosen:o?.value||'',seconds:+secs.toFixed(2),
   at:new Date().toISOString(),sessionId:state.sessionId,sessionOrdinal:stats.sessions.length+1};
 stats.attempts.push(record);save();
 $('kqScore').textContent=state.points+' puntos';
 const buttons=$('kqChoices').querySelectorAll('.kq-choice');
 buttons.forEach((b,i)=>{b.disabled=true;if(i===index)b.classList.add('selected',ok?'correct':'wrong');});
 $('kqSecond').innerHTML=secondText(q,q.correct,ok?'kq-correct':'kq-wrong');
 const f=$('kqFeedback');f.className='kq-feedback'+(ok?'':' bad');
 const trap=o&&!ok?'Elegiste: '+o.value+'. ':'';
 f.innerHTML='<strong>'+(ok?'✓ Correcto · +'+points+' puntos':index<0?'Tiempo agotado':'✕ Incorrecto')+'</strong>'+
  esc(trap+(q.explanation||'La transformación debe conservar el significado y respetar la palabra obligatoria.'));
 nextDelay=setTimeout(()=>{nextDelay=null;if(!state)return;if(++state.index>=state.questions.length)finish();else renderQuestion();},HOLD_MS);
}
function finish(){
 stop();
 stats.sessions.push({id:state.sessionId,mode:state.difficulty,total:state.questions.length,correct:state.correct,points:state.points,at:new Date().toISOString()});
 save();
 $('kqFinishTitle').textContent=state.correct+' / '+state.questions.length+' correctas';
 $('kqResultStats').innerHTML=[[''+state.correct+' / '+state.questions.length,'Aciertos'],[nfmt(state.points),'Puntos'],
  [Math.round(100*state.correct/state.questions.length)+'%','Precisión'],['4','Opciones']].map(([v,label])=>'<div class="metric"><b>'+esc(v)+'</b><span>'+label+'</span></div>').join('');
 const medal=state.correct===15?'🥇 Oro':state.correct===14?'🥈 Violeta':state.correct===13?'🥉 Azul':'';
 $('kqMedals').textContent=medal?medal+' · '+state.correct+' / 15':'';
 $('kqMedals').style.fontWeight='900';$('kqMedals').style.fontSize='22px';
 show('kqFinish');renderHome();
}
$('kqReadFirst').checked=pref.readFirst!==false;
$('kqReadFirst').addEventListener('change',persistSettings);
$('kqStart').addEventListener('click',begin);
$('kqReveal').addEventListener('click',reveal);
$('kqQuit').addEventListener('click',()=>{stop();state=null;renderHome();show('kqHome');});
$('kqAgain').addEventListener('click',begin);
$('kqBack').addEventListener('click',()=>{state=null;renderHome();show('kqHome');});
window.addEventListener('pagehide',stop);
window.addEventListener('storage',e=>{if(e.key===STORE&&!state){const updated=readJSON(STORE,{attempts:[],sessions:[]});stats.attempts=updated.attempts||[];stats.sessions=updated.sessions||[];renderHome();}});
renderHome();
window.KeywordQuizPilot={get status(){return {bank:bank.length,mode:pref.difficulty,readFirst:pref.readFirst,attempts:stats.attempts.length,sessions:stats.sessions.length,questionId:question()?.id||null};},bank};
})();
