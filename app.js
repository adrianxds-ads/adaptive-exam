const PAPERS=window.ADAPTIVE_EXAM_PAPERS||[];
const $=id=>document.getElementById(id);
let activePart=null,activePaper=null,activeExerciseId=null,menuPart=null,answers={},checked=false;
const statsKey="cambridgeB2ExerciseStatsV3";
const BANK_SIZE=30;
const TARGET_EXERCISES=BANK_SIZE*4;
const PART_INFO={
  1:{name:"Multiple-choice cloze",desc:"Choose A, B, C or D for each gap."},
  2:{name:"Open cloze",desc:"Write the missing word in each gap."},
  3:{name:"Word formation",desc:"Transform the base word to fit each gap."},
  4:{name:"Key word transformations",desc:"Rewrite each sentence using the key word."}
};

function norm(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").trim().replace(/\s+/g," ");}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function showScreen(id){["startScreen","partScreen","paperScreen","resultScreen"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function exerciseId(paper,part){return paper.id+"-p"+part;}
function allExercises(){return PAPERS.flatMap(p=>Object.keys(p.parts||{}).map(k=>({paper:p,part:Number(k),data:p.parts[k],id:exerciseId(p,Number(k))})));}
function paperByNumber(n){return PAPERS.find(p=>Number(p.examNumber)===Number(n))||null;}
function currentPart(){return activePaper?.parts?.[activePart];}
function getSource(paper,part){return paper.parts?.[part]?.source||paper.source||{type:"unknown",label:"Fuente no especificada",detail:"No hay información de procedencia registrada."};}
function sourceLine(src){return [src.type,src.label].filter(Boolean).join(" · ");}

function loadStats(){try{const x=JSON.parse(localStorage.getItem(statsKey)),s=x&&Array.isArray(x.attempts)?x:{attempts:[]};let dirty=false;s.attempts.forEach(a=>{if("sec" in a){delete a.sec;dirty=true;}if("targetSec" in a){delete a.targetSec;dirty=true;}});if(dirty)localStorage.setItem(statsKey,JSON.stringify(s));return s;}catch(e){return{attempts:[]};}}
function saveAttempt(result,details){
  const s=loadStats(),src=getSource(activePaper,activePart);
  s.attempts.push({
    id:crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random(),
    exerciseId:activeExerciseId,paperId:activePaper.id,paperLabel:activePaper.label,
    part:activePart,title:currentPart().title,correct:result.correct,total:result.total,
    completedAt:new Date().toISOString(),
    source:{type:src.type||"",label:src.label||"",detail:src.detail||"",url:src.url||""},
    items:details
  });
  localStorage.setItem(statsKey,JSON.stringify(s));
}
function bankAttempts(){const ids=new Set(allExercises().map(x=>x.id));return loadStats().attempts.filter(a=>ids.has(a.exerciseId));}
function exerciseAttempts(id){return bankAttempts().filter(a=>a.exerciseId===id);}
function completedIds(){return new Set(bankAttempts().map(a=>a.exerciseId));}
function aggregate(attempts){
  const total=attempts.reduce((n,a)=>n+a.total,0),correct=attempts.reduce((n,a)=>n+a.correct,0);
  return {runs:attempts.length,total,correct,accuracy:total?Math.round(correct/total*100):0,errors:total-correct};
}

function renderHome(){
  const exercises=allExercises(),attempts=bankAttempts(),done=completedIds(),g=aggregate(attempts),loaded=PAPERS.length;
  $("bankProgress").textContent="Banco maestro: "+loaded+" de "+BANK_SIZE+" exámenes cargados · "+done.size+" de "+TARGET_EXERCISES+" Parts realizadas";
  $("globalStats").innerHTML=
    statCell(done.size+"/"+TARGET_EXERCISES,"REALIZADAS")+
    statCell(g.total?g.accuracy+"%":"—","ACIERTO GLOBAL")+
    statCell(g.runs,"INTENTOS TOTALES")+
    statCell(g.errors,"FALLOS REGISTRADOS");
  const host=$("partList");host.innerHTML="";
  [1,2,3,4].forEach(part=>{
    const list=exercises.filter(ex=>ex.part===part),partDone=list.filter(ex=>done.has(ex.id)).length;
    const a=aggregate(attempts.filter(x=>x.part===part)),info=PART_INFO[part];
    const b=document.createElement("button");b.className="part-card";
    b.innerHTML="<div class='exercise-top'><span class='exercise-part'>PART "+part+"</span><span class='part-count'>"+partDone+" / "+BANK_SIZE+"</span></div>"+
      "<b>"+esc(info.name)+"</b><span class='part-desc'>"+esc(info.desc)+"</span>"+
      "<span class='exercise-meta'>"+(a.runs?("Acierto "+a.accuracy+"% · "+a.runs+" intentos · "+a.errors+" fallos"):"Sin ejercicios realizados")+"</span>";
    b.onclick=()=>openPartMenu(part);host.appendChild(b);
  });
  $("phaseNote").classList.remove("hidden");
  $("phaseNote").innerHTML=loaded<BANK_SIZE
    ?"<b>Banco en carga: "+loaded+"/"+BANK_SIZE+".</b> Los exámenes 11–30 ya están disponibles. Los 01–10 permanecen visibles y se activarán tras su revisión visual."
    :"<b>Banco completo.</b> Los 30 exámenes están disponibles en las cuatro Parts.";
}
function statCell(value,label){return "<div class='stat'><b>"+value+"</b><span>"+label+"</span></div>";}

function openPartMenu(part){
  menuPart=Number(part);renderPartMenu();showScreen("partScreen");window.scrollTo(0,0);
}
function renderPartMenu(){
  const done=completedIds(),attempts=bankAttempts().filter(a=>a.part===menuPart),g=aggregate(attempts),info=PART_INFO[menuPart];
  const completed=Array.from({length:BANK_SIZE},(_,i)=>i+1).filter(n=>{const p=paperByNumber(n);return p&&done.has(exerciseId(p,menuPart));}).length;
  $("partMenuTitle").textContent="Part "+menuPart+" · "+info.name;
  $("partMenuSubtitle").textContent=completed+" de "+BANK_SIZE+" hechos · "+PAPERS.length+" disponibles ahora";
  $("partStats").innerHTML=statCell(completed+"/"+BANK_SIZE,"HECHOS")+statCell(g.total?g.accuracy+"%":"—","ACIERTO")+statCell(g.runs,"INTENTOS")+statCell(g.errors,"FALLOS");
  const host=$("exerciseList");host.innerHTML="";
  let nextMarked=false;
  for(let n=1;n<=BANK_SIZE;n++){
    const paper=paperByNumber(n),id=paper?exerciseId(paper,menuPart):null,at=id?exerciseAttempts(id):[],a=aggregate(at),last=at[at.length-1];
    const b=document.createElement("button"),available=!!paper,wasDone=!!at.length;
    b.className="exam-tile"+(wasDone?" done":"")+(!available?" unavailable":"");
    if(available&&!wasDone&&!nextMarked){b.classList.add("next");nextMarked=true;}
    b.disabled=!available;
    const source=paper?.source?.type||"PENDIENTE";
    b.innerHTML="<span class='bank-source'>"+esc(source)+"</span><span class='exam-no'>"+String(n).padStart(2,"0")+"</span>"+
      "<span class='exam-status'>"+(wasDone?"HECHO":available?"PENDIENTE":"POR CARGAR")+"</span>"+
      "<span class='exam-mini'>"+(wasDone?("Último "+last.correct+"/"+last.total+" · "+a.runs+" int. · "+a.errors+" fallos"):available?"Listo para hacer":"Escaneo en revisión")+"</span>";
    if(available)b.onclick=()=>startExercise(id);host.appendChild(b);
  }
}

function startExercise(id){
  const ex=allExercises().find(x=>x.id===id);if(!ex)return;
  activePaper=ex.paper;activePart=ex.part;activeExerciseId=id;answers={};checked=false;
  const src=getSource(activePaper,activePart);
  $("headPart").textContent="Exam "+String(activePaper.examNumber).padStart(2,"0")+" · Part "+activePart;
  $("headSource").textContent=sourceLine(src);
  showScreen("paperScreen");renderPart();window.scrollTo(0,0);
}
function renderPart(){
  const p=currentPart(),src=getSource(activePaper,activePart),host=$("paperHost"),a=aggregate(exerciseAttempts(activeExerciseId));
  host.innerHTML="<div class='part-label'>EXAM "+String(activePaper.examNumber).padStart(2,"0")+" · B2 FIRST · READING AND USE OF ENGLISH</div><h2>"+esc(p.title)+"</h2>"+
    "<div class='sub'>"+esc(p.subtitle)+"</div>"+
    "<div class='source-box'><b>ESTADÍSTICA DE ESTE EJERCICIO</b><span>"+(a.runs?(a.runs+" intentos · "+a.accuracy+"% acierto · "+a.errors+" fallos acumulados"):"Primer intento")+"</span></div>"+
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
function expected(it){return it.display||it.answers?.[0]||it.answer||"";}
function checkPart(){
  if(checked)return;checked=true;collectAnswers();
  const p=currentPart(),items=activePart===4?p.items:p.segments.filter(x=>typeof x==="object");
  let correct=0;
  const details=items.map(it=>{
    const valid=(it.answers&&it.answers.length?it.answers:[it.answer]),user=answers[it.n]||"",ok=valid.map(norm).includes(norm(user));if(ok)correct++;
    return {question:it.n,correct:ok,userAnswer:user,expected:expected(it),explanation:it.explanation||"Sin explicación específica registrada.",skill:it.skill||"sin clasificar",base:it.base||null,keyword:it.keyword||null};
  });
  saveAttempt({correct,total:items.length},details);renderCorrection({correct,total:items.length},details);
}
function renderCorrection(result,details){
  const src=getSource(activePaper,activePart),pct=Math.round(result.correct/result.total*100);
  $("resultTitle").textContent="Corrección · Part "+activePart;
  $("resultSource").textContent=sourceLine(src);
  $("reviewSummary").innerHTML="<div class='review-score'><b>"+result.correct+" / "+result.total+"</b><span>"+pct+"% de acierto</span></div>"+
    "<div class='source-box'><b>FUENTE DEL EJERCICIO</b><span>"+esc(sourceLine(src))+"</span><small>"+esc(src.detail||"")+"</small></div>";
  $("reviewHost").innerHTML=details.map(d=>"<article class='review-item "+(d.correct?"review-ok":"review-bad")+"'>"+
    "<div class='review-q'><b>Pregunta "+d.question+"</b><span>"+(d.correct?"CORRECTA":"FALLO")+"</span></div>"+
    "<div class='review-answer'><small>TU RESPUESTA</small><b>"+esc(d.userAnswer||"—")+"</b></div>"+
    "<div class='review-answer'><small>RESPUESTA CORRECTA</small><b>"+esc(d.expected)+"</b></div>"+
    "<p>"+esc(d.explanation)+"</p><div class='skill'>PATRÓN · "+esc(d.skill)+"</div></article>").join("");
  const next=nextPendingInPart(activePart);
  $("reviewActions").innerHTML=(next?"<button id='nextBtn' class='primary'>SIGUIENTE PENDIENTE DE ESTA PART</button>":"<button id='partBtn' class='primary'>VOLVER A PART "+activePart+"</button>")+
    "<button id='repeatBtn' class='secondary'>REPETIR EJERCICIO</button>";
  if(next)$("nextBtn").onclick=()=>startExercise(next.id);else $("partBtn").onclick=()=>openPartMenu(activePart);
  $("repeatBtn").onclick=()=>startExercise(activeExerciseId);
  showScreen("resultScreen");renderHome();window.scrollTo(0,0);
}
function nextPendingInPart(part){const done=completedIds();return allExercises().find(ex=>ex.part===part&&!done.has(ex.id))||null;}
function goHome(){closeSheet();renderHome();showScreen("startScreen");window.scrollTo(0,0);}
function backToPart(){closeSheet();openPartMenu(activePart||menuPart||1);}

$("backBtn").onclick=backToPart;$("resultBackBtn").onclick=backToPart;$("partBackBtn").onclick=goHome;$("sheetClose").onclick=closeSheet;
$("choiceSheet").addEventListener("click",e=>{if(e.target===$("choiceSheet"))closeSheet();});
renderHome();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
const requestedPart=new URLSearchParams(location.search).get("part");
if(["1","2","3","4"].includes(requestedPart))openPartMenu(Number(requestedPart));
