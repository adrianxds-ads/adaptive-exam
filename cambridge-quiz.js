(()=>{
"use strict";
const $=id=>document.getElementById(id);
const KEY="cambridgeB2ExerciseStatsV3";
const QUESTION_COUNT=15;
let quizKind="mixed";
const LIMIT={1:53,2:53,3:45};
const TIME_KEY="cambridgeQuizTimingV1";
let timingMode="recommended";
try{const saved=localStorage.getItem(TIME_KEY);if(["recommended","exam","untimed"].includes(saved))timingMode=saved;}catch(_){}
const questionLimit=part=>timingMode==="untimed"?null:timingMode==="exam"?LIMIT[part]:180;
function updateTiming(){
 document.querySelectorAll("[name=quizTiming]").forEach(x=>x.checked=x.value===timingMode);
 document.querySelectorAll("#quizModes [data-part]").forEach(b=>{
 const part=Number(b.dataset.part),limit=questionLimit(part);
 b.querySelector("small").textContent=(quizKind==="exam"?"8 preguntas en orden":"15 preguntas mezcladas")+" · "+({1:"4 opciones",2:"Escribe una palabra",3:"Transforma la palabra"})[part]+" · "+(limit===null?"Sin tiempo":limit===180?"3 minutos":limit+" segundos*");
 });
}
const AUTO_SEC={1:6,2:12,3:12};
const LABEL={1:"Multiple Choice",2:"Open Cloze",3:"Word Formation"};
const EXAMS=[...(window.ADAPTIVE_EXAM_TRANSCRIBED_CAMBRIDGE_PAPERS||[]),...(window.ADAPTIVE_EXAM_PAPERS||[])].filter(x=>Number(x.examNumber)>=1&&Number(x.examNumber)<=30);
const ALL=[1,2,3].flatMap(part=>EXAMS.flatMap(p=>{
 const d=p.parts&&p.parts[String(part)];
 if(!d||!Array.isArray(d.segments))return [];
 return d.segments.filter(x=>x&&typeof x==="object"&&Number.isFinite(Number(x.n))).map(it=>({
  key:p.id+":p"+part+":q"+it.n,part,paper:p,item:it,segments:d.segments
 }));
}));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const uid=()=>globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():"q"+Date.now()+"-"+Math.random().toString(36).slice(2);
let session=null;
let timerId=null;

function loadStore(){
 try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");return x&&Array.isArray(x.attempts)?x:{attempts:[]};}
 catch(e){console.warn("Cambridge progress read failed",e);return {attempts:[]};}
}
function quizAttempts(){
 return loadStore().attempts.filter(a=>String(a.exerciseId||"").startsWith("quiz-p")&&a.items?.[0]?.sourceKey);
}
function historyMap(part){
 const m=new Map();
 for(const a of quizAttempts().filter(a=>Number(a.part)===part)){
  const item=a.items[0],k=item.sourceKey,st=m.get(k)||{n:0,errors:0,fast:0};
  st.n++;if(!item.correct)st.errors++;if(item.correct&&Number(item.responseSec)<=AUTO_SEC[part])st.fast++;
  m.set(k,st);
 }
 return m;
}
function drawQuestions(part){
 const stats=historyMap(part);
 const pool=ALL.filter(q=>q.part===part).map(q=>({q,weight:1}));
 for(const p of pool){
  const s=stats.get(p.q.key);
  p.weight=!s?3:clamp(1+2*s.errors/(s.n||1)+Math.max(0,5-s.n)*.25,1,5);
 }
 const chosen=[];
 while(pool.length&&chosen.length<QUESTION_COUNT){
  const sum=pool.reduce((n,x)=>n+x.weight,0);
  let roll=Math.random()*sum,index=0;
  for(;index<pool.length-1;index++){roll-=pool[index].weight;if(roll<=0)break;}
  chosen.push(pool.splice(index,1)[0].q);
 }
 return chosen;
}
function show(id){
 for(const x of ["quizHome","quizPlay","quizFinish"])$(x).classList.toggle("hidden",x!==id);
 window.scrollTo(0,0);
}
function metric(value,name){return "<div class='metric'><b>"+esc(value)+"</b><span>"+esc(name)+"</span></div>";}
function historySessions(attempts){
 const m=new Map();
 for(const a of attempts){
  const id=a.sessionId||a.id;
  const row=m.get(id)||{id,part:a.part,at:Date.parse(a.completedAt)||Date.now(),total:0,correct:0,points:0,auto:0,roundSize:Number(a.roundSize)||QUESTION_COUNT,quizKind:a.quizKind||"mixed",paperId:a.paperId,timingMode:a.timingMode||"legacy"};
  row.total++;row.correct+=Number(a.correct)||0;row.points+=Number(a.quizPoints)||0;
  const detail=a.items?.[0];if(detail?.correct&&Number(detail.responseSec)<=AUTO_SEC[a.part])row.auto++;
  row.at=Math.max(row.at,Date.parse(a.completedAt)||0);m.set(id,row);
 }
 return [...m.values()].sort((a,b)=>a.at-b.at);
}
function chart(rows,title,key,max=100){
 if(!window.HubCharts?.chart||!rows.length)return "";
 const data=rows.slice(-30).map(r=>({at:r.at,value:r[key]}));
 return "<div class='chart-shell'><h3>"+esc(title)+"</h3>"+window.HubCharts.chart(data,{max,title})+"</div>";
}
function examPapers(){
 return [...new Map(ALL.map(q=>[q.paper.id,q.paper])).values()].sort((a,b)=>Number(a.examNumber)-Number(b.examNumber));
}
function completedExamRuns(part=null){
 return historySessions(quizAttempts()).filter(r=>r.quizKind==="exam"&&r.total>=r.roundSize&&(part===null||Number(r.part)===part));
}
function renderExamTable(){
 const part=Number($("examListPart").value),runs=completedExamRuns(part);
 $("examTableBody").innerHTML=examPapers().map(p=>{
  const own=runs.filter(r=>r.paperId===p.id),last=own[own.length-1],best=own.length?Math.max(...own.map(r=>r.correct)):null;
  const game=own.length?Math.max(...own.map(r=>r.points)):null;
  return "<tr data-exam-row='"+esc(p.id)+"'><th scope='row'>Exam "+String(p.examNumber).padStart(2,"0")+"</th><td><span class='"+(own.length?"exam-done":"exam-pending")+"' aria-label='"+(own.length?"Completado":"Pendiente")+"'>"+(own.length?"✓":"✗")+"</span></td><td>"+own.length+"</td><td>"+(last?last.total-last.correct:"—")+"</td><td>"+(best===null?"—":"<b>"+best+"/8</b><small>"+game+" GP</small>")+"</td><td><button class='exam-play' data-exam-play='"+esc(p.id)+"' type='button' aria-label='"+(own.length?"Repetir":"Empezar")+" Exam "+String(p.examNumber).padStart(2,"0")+" · "+esc(LABEL[part])+"'>"+(own.length?"Repetir":"Jugar")+"</button></td></tr>";
 }).join("");
 $("examTableBody").querySelectorAll("[data-exam-play]").forEach(b=>b.addEventListener("click",()=>{
  $("quizExam").value=b.dataset.examPlay;startQuiz(part,b.dataset.examPlay);
 }));
 const done=new Set(runs.map(r=>r.paperId)).size;
 $("examListSummary").textContent=done+" / 30 completados · "+runs.length+" intentos · "+LABEL[part];
 const history=completedExamRuns().map(r=>({...r,score:100*r.correct/r.total}));
 $("examProgressChart").innerHTML=(window.HubCharts?.chart&&history.length?window.HubCharts.chart(history.map(r=>({at:r.at,value:r.score,label:"Exam "+String(examPapers().find(p=>p.id===r.paperId)?.examNumber||"").padStart(2,"0")+" · "+LABEL[r.part],weight:r.total})),{max:100,title:"Quiz por examen · histórico completo",note:"Cada punto corresponde a una parte completada. Incluye todos los intentos y los tres tiempos."}):"")||(history.length?"<p class='bank-note'>"+history.length+" rondas completadas · "+Math.round(100*history.reduce((n,r)=>n+r.correct,0)/history.reduce((n,r)=>n+r.total,0))+"% de acierto.</p>":"<p class='bank-note'>La evolución aparecerá al completar nuestro primer quiz por examen.</p>");
}
function chooseExam(){
 const part=session?.part||Number($("examListPart").value);
 session=null;quizKind="exam";
 document.querySelectorAll("[name=quizKind]").forEach(x=>x.checked=x.value==="exam");
 $("examListPart").value=String(part);
 renderHome();updateQuizKind();show("quizHome");
 $("examListSection").scrollIntoView({block:"start",behavior:"smooth"});
}
function nextExamPaper(){
 if(!session?.sourcePaperId)return null;
 const papers=examPapers(),i=papers.findIndex(p=>p.id===session.sourcePaperId);
 return i>=0?papers[i+1]||null:null;
}
function renderHome(){
 const attempts=quizAttempts(),runs=historySessions(attempts).filter(s=>s.total>=s.roundSize);
 const correct=attempts.filter(a=>a.correct).length,fast=attempts.filter(a=>a.correct&&Number(a.items[0].responseSec)<=AUTO_SEC[a.part]).length;
 const coverage=new Set(attempts.map(a=>a.items[0].sourceKey)).size;
 $("quizHomeStats").innerHTML=metric(attempts.length?" "+Math.round(correct/attempts.length*100)+"%":"—","Acierto")
  +metric(coverage+"/"+ALL.length,"Preguntas vistas")+metric(runs.length,"Rondas")
  +metric(attempts.length?Math.round(fast/attempts.length*100)+"%":"—","Automatismo");
 const scores=runs.map(r=>({...r,score:100*r.correct/r.total,automaticity:100*r.auto/r.total}));
 $("quizHistory").innerHTML=chart(scores,"Línea de aprendizaje","score")+chart(scores,"Automatismo","automaticity");
 renderExamTable();
}

function renderExamPicker(){
 const papers=[...new Map(ALL.map(q=>[q.paper.id,q.paper])).values()].sort((a,b)=>Number(a.examNumber)-Number(b.examNumber));
 $("quizExam").innerHTML=papers.map(p=>"<option value='"+esc(p.id)+"'>Exam "+String(p.examNumber).padStart(2,"0")+"</option>").join("");
}
function updateQuizKind(){
 $("quizExamPicker").classList.toggle("hidden",quizKind!=="exam");
 $("examListSection").classList.toggle("hidden",quizKind!=="exam");
 if(quizKind==="exam")renderExamTable();
 $("quizRouteHint").textContent=quizKind==="exam"?"Elige el examen y la parte. Sus 8 preguntas originales aparecen en orden, con corrección después de cada respuesta.":"15 preguntas de distintos exámenes, seleccionadas para practicar.";
 updateTiming();
}
function renderScores(){
 $("quizExamScore").textContent="Exam points: "+session.correct+" / "+session.questions.length;
 $("quizScore").textContent="Game points: "+session.points;
}
function startQuiz(part,paperId=null){
 if(!LIMIT[part])return;
 const sourcePaperId=paperId||(quizKind==="exam"?$("quizExam").value:null);
 const questions=sourcePaperId?ALL.filter(q=>q.part===part&&q.paper.id===sourcePaperId).sort((a,b)=>Number(a.item.n)-Number(b.item.n)):drawQuestions(part);
 if(!questions.length){alert("Esta modalidad aún no contiene preguntas estructuradas.");return;}
 if(sourcePaperId){$("quizExam").value=sourcePaperId;$("examListPart").value=String(part);}
 session={id:uid(),part,quizKind:sourcePaperId?"exam":"mixed",sourcePaperId,timingMode,limitSec:questionLimit(part),questions,index:0,points:0,correct:0,answers:[],answered:false,started:0};
 show("quizPlay");renderQuestion();
}
function contextHTML(q){
 return "<p>"+q.segments.map(seg=>{
  if(typeof seg==="string")return esc(seg);
  if(seg.n===q.item.n)return "<mark id='targetGap' aria-label='Hueco actual'>____</mark>";
  return "<span class='other-gap' aria-label='Otro hueco'> […] </span>";
 }).join("")+"</p>";
}
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}}
function tick(){
 if(!session||session.answered)return;
 const limit=session.limitSec;
 if(limit===null){$("quizCountdown").textContent="∞";$("quizClock").style.setProperty("--fill","100%");return;}
 const seconds=Math.max(0,limit-(performance.now()-session.started)/1000);
 $("quizCountdown").textContent=String(Math.ceil(seconds));
 $("quizClock").style.setProperty("--fill",(seconds/limit*100).toFixed(1)+"%");
 if(seconds<=0)acceptAnswer("timeout");
}
function renderQuestion(){
 stopTimer();
 const part=session.part,q=session.questions[session.index];
 session.answered=false;
 $("quizPosition").textContent=(session.index+1)+" / "+session.questions.length;
 $("quizModeTitle").textContent=LABEL[part]+(session.quizKind==="exam"?" · Exam "+String(q.paper.examNumber).padStart(2,"0"):" · Mixed quiz");
 renderScores();
 $("quizProgressBar").style.width=100*session.index/session.questions.length+"%";
 $("quizOrigin").textContent="EXAM "+String(q.paper.examNumber).padStart(2,"0")+" · QUESTION "+q.item.n;
 $("quizContext").innerHTML=contextHTML(q);
 $("quizBase").classList.toggle("hidden",part!==3);
 if(part===3)$("quizBase").textContent=q.item.base||"Palabra base no disponible";
 $("quizFeedback").className="feedback hidden";
 $("quizFeedback").textContent="";
 $("skipQuiz").classList.remove("hidden");
 $("nextQuiz").classList.add("hidden");
 $("submitQuiz").classList.toggle("hidden",part===1);
 const host=$("quizAnswerArea");host.className="answer-area"+(part===1?"":" typing");
 if(part===1){
  host.innerHTML=(q.item.options||[]).map((opt,i)=>"<button class='option-btn' data-opt='"+i+"' type='button'><span>"+String.fromCharCode(65+i)+"</span>"+esc(opt)+"</button>").join("");
  host.querySelectorAll(".option-btn").forEach(b=>b.addEventListener("click",()=>acceptAnswer("answer",q.item.options[Number(b.dataset.opt)],b)));
 }else{
  host.innerHTML="<input id='quizInput' class='answer-input' type='text' data-ad-keyboard='en' inputmode='none' autocomplete='off' autocapitalize='none' autocorrect='off' spellcheck='false' aria-label='Escribe la respuesta'>"+
    "<p class='answer-tip'>Escribe una sola palabra y pulsa Comprobar. Puedes usar tu teclado habitual.</p>";
  const inp=$("quizInput");
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();acceptAnswer("answer",inp.value);}});
  inp.addEventListener("focus",()=>{window.AdrianKeyboard?.open?.(inp);setTimeout(()=>inp.scrollIntoView({block:"center",behavior:"smooth"}),80);});
 }
 requestAnimationFrame(()=>{
  const box=$("quizContext"),gap=$("targetGap");
  if(gap)box.scrollTop=clamp(gap.offsetTop-box.offsetTop-box.clientHeight/2+gap.clientHeight/2,0,box.scrollHeight-box.clientHeight);
 });
 $("quizClock").setAttribute("aria-label",session.limitSec===null?"Sin límite de tiempo":"Tiempo restante en segundos");
 $("quizClock").querySelector("small").textContent=session.limitSec===null?"sin límite":"s";
 session.started=performance.now();
 tick();if(session.limitSec!==null)timerId=setInterval(tick,100);
}
function saveAnswer(q,correct,raw,sec,points,reason){
 const state=loadStore();
 const stamp=new Date().toISOString();
 state.attempts.push({
  id:uid(),exerciseId:"quiz-p"+session.part+"-"+q.key,
  paperId:session.sourcePaperId||"cambridge-quiz",paperLabel:session.quizKind==="exam"?"Exam "+String(q.paper.examNumber).padStart(2,"0"):"Mixed Cambridge Quiz",part:session.part,
  quizKind:session.quizKind,roundSize:session.questions.length,examPoints:correct?1:0,examMaxPoints:1,
  timingMode:session.timingMode,timeLimitSec:session.limitSec,
  title:LABEL[session.part],source:{type:q.paper.source?.type||"Exam bank",label:q.paper.label||"",detail:""},
  correct:correct?1:0,total:1,learning:correct?100:0,completedAt:stamp,
  durationSec:sec,sessionId:session.id,quizPoints:points,
  items:[{question:q.item.n,sourceKey:q.key,correct,userAnswer:raw||"",expected:q.item.answers?.[0]||q.item.answer||"",
    responseSec:sec,reason,base:q.item.base||null,skill:"Part "+session.part,explanation:q.item.explanation||""}]
 });
 try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
 catch(e){console.error("Unable to persist quiz progress",e);return false;}
}
function acceptAnswer(reason,raw="",button=null){
 if(!session||session.answered)return;
 const q=session.questions[session.index],limit=session.limitSec;
 const sec=clamp((performance.now()-session.started)/1000,0,limit===null?Infinity:limit);
 const allowed=(q.item.answers||[q.item.answer]).map(norm);
 if(reason==="answer"&&!norm(raw)){if($("quizInput"))$("quizInput").focus();return;}
 const ok=reason==="answer"&&allowed.includes(norm(raw));
 const points=ok?100+(limit===null?0:Math.round(50*(limit-sec)/limit)):0;
 session.answered=true;stopTimer();
 const saved=saveAnswer(q,ok,raw,sec,points,reason);
 session.correct+=Number(ok);session.points+=points;
 session.answers.push({q,correct:ok,sec,raw,points,reason});
 window.AdrianKeyboard?.close?.();
 const buttons=$("quizAnswerArea").querySelectorAll("button,input");
 buttons.forEach(el=>{el.disabled=true;if(el===button)el.classList.add("chosen");});
 const good=q.item.answers?.[0]||q.item.answer||"—";
 const expl=q.item.explanation||"Respuesta del banco original.";
 const message=ok?"Correcto. +1 Exam point · +"+points+" Game points":"Respuesta correcta: "+good+" · +0 Exam points · +0 Game points";
 const f=$("quizFeedback");
 f.className="feedback"+(ok?" ok":"");
 f.innerHTML="<strong>"+esc(message)+"</strong><div>"+esc(expl)+"</div>"+(saved?"":"<small>No se ha podido guardar el progreso en este dispositivo.</small>");
 $("skipQuiz").classList.add("hidden");$("submitQuiz").classList.add("hidden");
 $("nextQuiz").classList.remove("hidden");
 $("nextQuiz").textContent=session.index===session.questions.length-1?"Ver resultado →":"Siguiente →";
 renderScores();
}
function nextQuestion(){
 if(!session||!session.answered)return;
 if(++session.index>=session.questions.length){finishQuiz();return;}
 renderQuestion();
}

function finishQuiz(){
 stopTimer();window.AdrianKeyboard?.close?.();
 const count=session.questions.length,fast=session.answers.filter(a=>a.correct&&a.sec<=AUTO_SEC[session.part]).length;
 $("finishTitle").textContent=session.correct+" / "+count+" correctas";
 $("finishExamLabel").textContent=session.quizKind==="exam"?"Exam "+String(session.questions[0].paper.examNumber).padStart(2,"0")+" · "+LABEL[session.part]:"Mixed quiz · "+LABEL[session.part];
 $("repeatQuiz").textContent=session.quizKind==="exam"?"Repetir examen":"Otra ronda";
 $("finishHome").textContent=session.quizKind==="exam"?"Elegir examen":"Cambiar modalidad";
 const following=nextExamPaper();
 $("nextExamQuiz").classList.toggle("hidden",session.quizKind!=="exam");
 $("nextExamQuiz").disabled=!following;
 $("nextExamQuiz").textContent=following?"Siguiente · Exam "+String(following.examNumber).padStart(2,"0"):"Exam 30 · último de la lista";
 $("finishSummary").innerHTML=metric(session.correct+" / "+count,"Exam points")+metric(session.points,"Game points")+metric(Math.round(100*session.correct/count)+"%","Acierto")
  +metric(fast+"/"+count,"Automatismo")+metric(session.answers.length,"Preguntas");
 const achievement=window.AdrianAchievements;
 const completed=historySessions(quizAttempts()).filter(x=>x.total>=x.roundSize);
 const originalAttempts=loadStore().attempts.filter(a=>/^exam-\d+-p[1-4]$/.test(String(a.exerciseId||"")));
 const counts=achievement?.countsFromHistory?.([...originalAttempts,...completed.map(r=>({correct:r.correct,total:r.total}))])||{blue:0,violet:0,gold:0};
 $("finishBadge").innerHTML=(achievement?.medalStripHtml?.(counts,{context:"summary"})||"")+(achievement?.badgeHtml?.(session.correct,count,counts)||"");
 achievement?.play?.(null,session.correct,count);
 const hist=completed.filter(x=>x.part===session.part&&x.quizKind===session.quizKind).map(r=>({...r,score:100*r.correct/r.total,automaticity:100*r.auto/r.total}));
 $("finishChart").innerHTML=chart(hist,"Acierto · evolución","score")+chart(hist,"Automatismo · evolución","automaticity");
 show("quizFinish");
}
document.querySelectorAll("#quizModes [data-part]").forEach(b=>b.addEventListener("click",()=>startQuiz(Number(b.dataset.part))));
$("skipQuiz").addEventListener("click",()=>acceptAnswer("skip"));
$("submitQuiz").addEventListener("click",()=>acceptAnswer("answer",$("quizInput")?.value||""));
$("nextQuiz").addEventListener("click",nextQuestion);
$("quitQuiz").addEventListener("click",()=>{stopTimer();window.AdrianKeyboard?.close?.();session=null;renderHome();show("quizHome");});
$("finishHome").addEventListener("click",()=>{if(session?.quizKind==="exam"){chooseExam();return;}session=null;renderHome();show("quizHome");});
$("nextExamQuiz").addEventListener("click",()=>{const p=nextExamPaper();if(p)startQuiz(session.part,p.id);});
$("examListPart").addEventListener("change",renderExamTable);
$("repeatQuiz").addEventListener("click",()=>{if(session)startQuiz(session.part,session.sourcePaperId);});
window.addEventListener("pagehide",stopTimer);
window.addEventListener("storage",e=>{if(e.key===KEY&&!session)renderHome();});
document.querySelectorAll("[name=quizTiming]").forEach(x=>x.addEventListener("change",()=>{
 timingMode=x.value;try{localStorage.setItem(TIME_KEY,timingMode);}catch(_){}updateTiming();
}));
renderExamPicker();
document.querySelectorAll("[name=quizKind]").forEach(x=>x.addEventListener("change",()=>{quizKind=x.value;updateQuizKind();}));
updateQuizKind();
renderHome();
const requestedPart=Number(new URLSearchParams(location.search).get("part"));
if(LIMIT[requestedPart])startQuiz(requestedPart);
window.CambridgeQuizDebug={questionCountByPart:Object.fromEntries([1,2,3].map(x=>[x,ALL.filter(q=>q.part===x).length]))};
})();
