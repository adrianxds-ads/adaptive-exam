const PAPERS=window.ADAPTIVE_EXAM_PAPERS||[];
const $=id=>document.getElementById(id);
let activePart=null,activePaper=null,activeExerciseId=null,answers={},timerId=null,startMs=0,checked=false;
const statsKey="cambridgeB2ExerciseStatsV3";

function norm(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").trim().replace(/\s+/g," ");}
function fmt(sec){sec=Math.max(0,Math.round(sec));const m=Math.floor(sec/60),s=sec%60;return m+":"+String(s).padStart(2,"0");}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function showScreen(id){["startScreen","paperScreen","resultScreen"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function exerciseId(paper,part){return paper.id+"-p"+part;}
function allExercises(){return PAPERS.flatMap(p=>Object.keys(p.parts||{}).map(k=>({paper:p,part:Number(k),data:p.parts[k],id:exerciseId(p,Number(k))})));}
function currentPart(){return activePaper?.parts?.[activePart];}
function getSource(paper,part){return paper.parts?.[part]?.source||paper.source||{type:"unknown",label:"Fuente no especificada",detail:"No hay información de procedencia registrada."};}
function sourceLine(src){return [src.type,src.label].filter(Boolean).join(" · ");}

function loadStats(){try{const x=JSON.parse(localStorage.getItem(statsKey));return x&&Array.isArray(x.attempts)?x:{attempts:[]};}catch(e){return{attempts:[]};}}
function saveAttempt(result,details){
  const s=loadStats(),src=getSource(activePaper,activePart);
  s.attempts.push({
    id:crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random(),
    exerciseId:activeExerciseId,paperId:activePaper.id,paperLabel:activePaper.label,
    part:activePart,title:currentPart().title,correct:result.correct,total:result.total,
    sec:Math.round(result.sec),targetSec:currentPart().targetSec,completedAt:new Date().toISOString(),
    source:{type:src.type||"",label:src.label||"",detail:src.detail||"",url:src.url||""},
    items:details
  });
  localStorage.setItem(statsKey,JSON.stringify(s));
}
function exerciseAttempts(id){return loadStats().attempts.filter(a=>a.exerciseId===id);}
function completedIds(){return new Set(loadStats().attempts.map(a=>a.exerciseId));}
function aggregate(attempts){
  const total=attempts.reduce((n,a)=>n+a.total,0),correct=attempts.reduce((n,a)=>n+a.correct,0),sec=attempts.reduce((n,a)=>n+a.sec,0);
  return {runs:attempts.length,total,correct,accuracy:total?Math.round(correct/total*100):0,avgSec:attempts.length?sec/attempts.length:0,errors:total-correct};
}

function renderHome(){
  const exercises=allExercises(),attempts=loadStats().attempts,done=completedIds(),g=aggregate(attempts);
  $("bankProgress").textContent=done.size+" de "+exercises.length+" ejercicios completados";
  $("globalStats").innerHTML=
    statCell(done.size+"/"+exercises.length,"COMPLETADOS")+
    statCell(g.total?g.accuracy+"%":"—","ACIERTO GLOBAL")+
    statCell(g.runs?fmt(g.avgSec):"—","TIEMPO MEDIO")+
    statCell(g.errors,"FALLOS REGISTRADOS");
  const host=$("exerciseList");host.innerHTML="";
  exercises.forEach(ex=>{
    const at=exerciseAttempts(ex.id),a=aggregate(at),last=at[at.length-1],src=getSource(ex.paper,ex.part);
    const b=document.createElement("button");b.className="exercise-card";b.dataset.id=ex.id;
    b.innerHTML="<div class='exercise-top'><span class='exercise-part'>PART "+ex.part+"</span><span class='exercise-state "+(at.length?"done":"pending")+"'>"+(at.length?"HECHO":"PENDIENTE")+"</span></div>"+
      "<b>"+esc(ex.data.title.replace(/^Part \d+ · /,""))+"</b>"+
      "<span class='exercise-source'>Fuente: "+esc(sourceLine(src))+"</span>"+
      "<span class='exercise-meta'>"+(at.length?("Intentos "+a.runs+" · "+a.accuracy+"% acumulado · último "+last.correct+"/"+last.total+" · "+fmt(last.sec)):("Sin resultados · objetivo "+fmt(ex.data.targetSec)))+"</span>";
    b.onclick=()=>startExercise(ex.id);host.appendChild(b);
  });
  const complete=done.size===exercises.length&&exercises.length>0;
  $("phaseNote").classList.toggle("hidden",!complete);
}
function statCell(value,label){return "<div class='stat'><b>"+value+"</b><span>"+label+"</span></div>";}

function startExercise(id){
  const ex=allExercises().find(x=>x.id===id);if(!ex)return;
  activePaper=ex.paper;activePart=ex.part;activeExerciseId=id;answers={};checked=false;
  const p=currentPart(),src=getSource(activePaper,activePart);
  $("headPart").textContent="Part "+activePart;
  $("headSource").textContent=sourceLine(src);
  $("timerTarget").textContent="TARGET "+fmt(p.targetSec);
  showScreen("paperScreen");renderPart();startTimer(p.targetSec);window.scrollTo(0,0);
}
function startTimer(target){
  clearInterval(timerId);startMs=performance.now();$("timerBox").classList.remove("overtime");
  const tick=()=>{const elapsed=(performance.now()-startMs)/1000,remaining=target-elapsed;
    if(remaining>=0)$("timerText").textContent=fmt(remaining);
    else{$("timerText").textContent="+"+fmt(-remaining);$("timerBox").classList.add("overtime");}
  };tick();timerId=setInterval(tick,250);
}
function renderPart(){
  const p=currentPart(),src=getSource(activePaper,activePart),host=$("paperHost");
  host.innerHTML="<div class='part-label'>B2 FIRST · READING AND USE OF ENGLISH</div><h2>"+esc(p.title)+"</h2>"+
    "<div class='sub'>"+esc(p.subtitle)+"</div>"+
    "<div class='source-box'><b>FUENTE</b><span>"+esc(sourceLine(src))+"</span><small>"+esc(src.detail||"")+"</small></div>"+
    "<div class='instructions'>"+esc(p.instructions)+"</div>"+renderBody(p)+
    "<div class='paper-actions'><button id='checkBtn' class='primary'>CORREGIR EJERCICIO</button><button id='resetBtn' class='secondary'>REINICIAR</button></div>";
  $("checkBtn").onclick=checkPart;$("resetBtn").onclick=()=>startExercise(activeExerciseId);bindInputs();
}
function renderBody(p){
  if(activePart===4)return "<div class='transform-list'>"+p.items.map(it=>
    "<article class='transform'><div class='n'>QUESTION "+it.n+"</div><div class='first'>"+esc(it.first)+"</div><div class='keyword'>"+esc(it.keyword)+"</div>"+
    "<div class='second'>"+esc(it.secondBefore)+"<input class='transform-input' data-n='"+it.n+"' data-ad-keyboard='en' inputmode='none' autocomplete='off' autocorrect='off' autocapitalize='none' spellcheck='false'>"+esc(it.secondAfter)+"</div></article>"
  ).join("")+"</div>";
  return "<div class='exam-text'><p>"+p.segments.map(seg=>typeof seg==="string"?esc(seg):gapHtml(seg)).join("")+"</p></div>";
}
function gapHtml(seg){
  const val=answers[seg.n]||"";
  if(activePart===1)return "<span class='gap-wrap'><span class='gap-num'>"+seg.n+"</span><button class='gap-choice "+(val?"":"empty")+"' data-n='"+seg.n+"'>"+(val?esc(val):"choose")+" ▾</button></span>";
  const base=activePart===3?"<span class='base-pill'>"+esc(seg.base)+"</span>":"";
  return "<span class='gap-wrap'><span class='gap-num'>"+seg.n+"</span><input class='inline-input' data-n='"+seg.n+"' data-ad-keyboard='en' inputmode='none' value='"+esc(val)+"' autocomplete='off' autocorrect='off' autocapitalize='none' spellcheck='false'>"+base+"</span>";
}
function bindInputs(){
  if(activePart===1)document.querySelectorAll(".gap-choice").forEach(b=>b.onclick=()=>openChoices(Number(b.dataset.n)));
  else document.querySelectorAll("input[data-n]").forEach(inp=>inp.addEventListener("input",()=>answers[Number(inp.dataset.n)]=inp.value));
}
function openChoices(n){
  const seg=currentPart().segments.find(x=>typeof x==="object"&&x.n===n);if(!seg)return;
  $("sheetTitle").textContent="Question "+n;$("optionGrid").innerHTML="";
  seg.options.forEach((opt,i)=>{const b=document.createElement("button");b.className="option";b.innerHTML="<strong>"+String.fromCharCode(65+i)+"</strong>"+esc(opt);
    b.onclick=()=>{answers[n]=opt;closeSheet();renderPart();};$("optionGrid").appendChild(b);});
  $("choiceSheet").classList.remove("hidden");
}
function closeSheet(){$("choiceSheet").classList.add("hidden");}
function collectAnswers(){document.querySelectorAll("input[data-n]").forEach(inp=>answers[Number(inp.dataset.n)]=inp.value);}
function expected(it){return activePart===4?(it.display||it.answers?.[0]||""):it.answer;}
function checkPart(){
  if(checked)return;checked=true;clearInterval(timerId);collectAnswers();
  const p=currentPart(),items=activePart===4?p.items:p.segments.filter(x=>typeof x==="object");
  let correct=0;
  const details=items.map(it=>{
    const valid=activePart===4?it.answers:[it.answer],user=answers[it.n]||"",ok=valid.map(norm).includes(norm(user));if(ok)correct++;
    return {question:it.n,correct:ok,userAnswer:user,expected:expected(it),explanation:it.explanation||"Sin explicación específica registrada.",skill:it.skill||"sin clasificar",base:it.base||null,keyword:it.keyword||null};
  });
  const sec=(performance.now()-startMs)/1000;saveAttempt({correct,total:items.length,sec},details);renderCorrection({correct,total:items.length,sec},details);
}
function renderCorrection(result,details){
  const p=currentPart(),src=getSource(activePaper,activePart),pct=Math.round(result.correct/result.total*100);
  $("resultTitle").textContent="Corrección · Part "+activePart;
  $("resultSource").textContent=sourceLine(src);
  $("reviewSummary").innerHTML="<div class='review-score'><b>"+result.correct+" / "+result.total+"</b><span>"+pct+"% · "+fmt(result.sec)+" · "+(result.sec<=p.targetSec?"dentro del objetivo":"fuera del objetivo")+"</span></div>"+
    "<div class='source-box'><b>FUENTE DEL EJERCICIO</b><span>"+esc(sourceLine(src))+"</span><small>"+esc(src.detail||"")+"</small></div>";
  $("reviewHost").innerHTML=details.map(d=>"<article class='review-item "+(d.correct?"review-ok":"review-bad")+"'>"+
    "<div class='review-q'><b>Pregunta "+d.question+"</b><span>"+(d.correct?"CORRECTA":"FALLO")+"</span></div>"+
    "<div class='review-answer'><small>TU RESPUESTA</small><b>"+esc(d.userAnswer||"—")+"</b></div>"+
    "<div class='review-answer'><small>RESPUESTA CORRECTA</small><b>"+esc(d.expected)+"</b></div>"+
    "<p>"+esc(d.explanation)+"</p><div class='skill'>PATRÓN · "+esc(d.skill)+"</div></article>").join("");
  const next=nextPendingExercise();
  $("reviewActions").innerHTML=(next?"<button id='nextBtn' class='primary'>SIGUIENTE PENDIENTE</button>":"<button id='homeBtn' class='primary'>VOLVER AL RESUMEN</button>")+
    "<button id='repeatBtn' class='secondary'>REPETIR EJERCICIO</button>";
  if(next)$("nextBtn").onclick=()=>startExercise(next.id);else $("homeBtn").onclick=goHome;
  $("repeatBtn").onclick=()=>startExercise(activeExerciseId);
  showScreen("resultScreen");renderHome();window.scrollTo(0,0);
}
function nextPendingExercise(){const done=completedIds();return allExercises().find(ex=>!done.has(ex.id))||null;}
function goHome(){clearInterval(timerId);closeSheet();renderHome();showScreen("startScreen");window.scrollTo(0,0);}

$("backBtn").onclick=goHome;$("resultBackBtn").onclick=goHome;$("sheetClose").onclick=closeSheet;
$("choiceSheet").addEventListener("click",e=>{if(e.target===$("choiceSheet"))closeSheet();});
renderHome();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
const requestedPart=new URLSearchParams(location.search).get("part");
if(["1","2","3","4"].includes(requestedPart)){const ex=allExercises().find(x=>x.part===Number(requestedPart));if(ex)startExercise(ex.id);}
