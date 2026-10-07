const APP_VERSION="1.2.9";
let pendingStats=null;
function safeDecoration(run,fallback=""){try{return run()??fallback;}catch(e){console.warn("Decoration unavailable",e);return fallback;}}
const PAPERS=[...(window.ADAPTIVE_EXAM_CAMBRIDGE_PAPERS||[]),...(window.ADAPTIVE_EXAM_PAPERS||[])].sort((a,b)=>(Number(a.examNumber)||99)-(Number(b.examNumber)||99));
const $=id=>document.getElementById(id);
let activePart=null,activePaper=null,activeExerciseId=null,menuPart=null,answers={},checked=false,exerciseStartedAt=0;
const statsKey="cambridgeB2ExerciseStatsV3";
const BANK_SIZE=30;
const OCR_END=10;
const PRACTICE_START=11;
const PRACTICE_COUNT=20;
const OCR_COUNT=10;
const TARGET_EXERCISES=BANK_SIZE*4;
const TARGET_PRACTICE=PRACTICE_COUNT*4;
const TARGET_OCR=OCR_COUNT*4;
const PART_INFO={
  1:{name:"Multiple-choice cloze",desc:"Choose A, B, C or D for each gap."},
  2:{name:"Open cloze",desc:"Write the missing word in each gap."},
  3:{name:"Word formation",desc:"Transform the base word to fit each gap."},
  4:{name:"Key word transformations",desc:"Rewrite each sentence using the key word."}
};

function norm(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").trim().replace(/\s+/g," ");}
function expandAnswerSpec(value){
  const raw=String(value||"").trim();if(!raw)return [];
  const full=/\s+\/\s+/.test(raw)?raw.split(/\s+\/\s+/):[raw];
  const optional=s=>{const m=s.match(/\(([^()]*)\)/);if(!m)return [s];const a=s.slice(0,m.index),b=s.slice(m.index+m[0].length);return [...optional(a+b),...optional(a+m[1]+b)];};
  const slash=s=>{const m=s.match(/([^\s/]+)\/([^\s/]+)/);if(!m)return [s];const a=s.slice(0,m.index),b=s.slice(m.index+m[0].length);return [...slash(a+m[1]+b),...slash(a+m[2]+b)];};
  return [...new Set(full.flatMap(optional).flatMap(slash).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean))];
}
function validAnswers(it){const specs=it.answers&&it.answers.length?it.answers:[it.answer];return [...new Set(specs.flatMap(expandAnswerSpec).map(norm).filter(Boolean))];}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function showScreen(id){["startScreen","partScreen","paperScreen","resultScreen"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function exerciseId(paper,part){return paper.id+"-p"+part;}
function allExercises(){return PAPERS.flatMap(p=>Object.keys(p.parts||{}).map(k=>({paper:p,part:Number(k),data:p.parts[k],id:exerciseId(p,Number(k))})));}
function practiceExercises(){return allExercises().filter(ex=>!ex.data?.scanImage);}
function ocrExercises(){return allExercises().filter(ex=>!!ex.data?.scanImage);}
function attemptsForExercises(exercises,rows=bankAttempts()){const ids=new Set(exercises.map(x=>x.id));return rows.filter(a=>ids.has(a.exerciseId));}
function completedForExercises(exercises,rows=bankAttempts()){return new Set(attemptsForExercises(exercises,rows).map(a=>a.exerciseId));}
function paperByNumber(n){return PAPERS.find(p=>Number(p.examNumber)===Number(n))||null;}
function currentPart(){return activePaper?.parts?.[activePart];}
function getSource(paper,part){return paper.parts?.[part]?.source||paper.source||{type:"unknown",label:"Fuente no especificada",detail:"No hay información de procedencia registrada."};}
function sourceLine(src){return [src.type,src.label].filter(Boolean).join(" · ");}

function partItems(p=currentPart()){
  if(!p)return [];
  return Array.isArray(p.items)?p.items:(p.segments||[]).filter(x=>typeof x==="object");
}
function answeredCount(){return partItems().filter(it=>norm(answers[it.n])).length;}
function updateAnswerProgress(message=""){
  const el=$("answerProgress");if(!el)return;
  const total=partItems().length,done=answeredCount(),left=Math.max(0,total-done);
  el.classList.toggle("warning",!!message);
  el.innerHTML="<span>"+(message||("PART "+activePart+" · progreso"))+"</span><strong>"+done+" / "+total+(left?" · faltan "+left:" · completa")+"</strong>";
}
function firstMissingQuestion(){
  const it=partItems().find(x=>!norm(answers[x.n]));
  return it?it.n:null;
}
function focusQuestion(n){
  if(n==null)return;
  const choice=document.querySelector(".worksheet-choice[data-n='"+n+"'],.scan-choice[data-n='"+n+"']");
  if(choice){choice.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>choice.focus({preventScroll:true}),180);return;}
  if(activePart===1){openChoices(n);return;}
  const el=document.querySelector("input[data-n='"+n+"']");
  if(!el)return;
  focusExamInput(el);
}
function choiceContext(n){
  const segs=currentPart()?.segments||[],i=segs.findIndex(x=>typeof x==="object"&&Number(x.n)===Number(n));
  if(i<0)return "";
  const before=typeof segs[i-1]==="string"?segs[i-1]:"",after=typeof segs[i+1]==="string"?segs[i+1]:"";
  const left=before.replace(/\s+/g," ").trim().slice(-95),right=after.replace(/\s+/g," ").trim().slice(0,95);
  return (left?left+" ":"")+"[…]"+(right?" "+right:"");
}
function openScanViewer(src){
  if(!$("scanViewer")||!src)return;
  window.AdrianKeyboard?.close?.();
  $("scanViewerImg").src=src;$("scanViewer").classList.remove("hidden");$("scanViewer").setAttribute("aria-hidden","false");document.body.classList.add("cambridge-scan-open");
}
function closeScanViewer(){
  if(!$("scanViewer"))return;
  $("scanViewer").classList.add("hidden");$("scanViewer").setAttribute("aria-hidden","true");$("scanViewerImg").removeAttribute("src");document.body.classList.remove("cambridge-scan-open");
}

let lastExamInput=null;
function ensureExamInputVisible(){
 if(window.CambridgeWritingMode&&document.body.classList.contains('cambridge-writing')){window.CambridgeWritingMode.settle();return;}
 const el=lastExamInput,kb=document.querySelector('.ad-keyboard.open');
 if(!el?.isConnected||!kb)return;
 const rect=el.getBoundingClientRect(),bottom=kb.getBoundingClientRect().top-18;
 const headers=[...document.querySelectorAll('.adrian-tools,#paperScreen .paper-head')].map(x=>x.getBoundingClientRect()).filter(r=>r.top<=80&&r.bottom>0&&r.bottom<bottom);
 const top=Math.max(8,...headers.map(r=>r.bottom))+8;
 const delta=rect.bottom>bottom?rect.bottom-bottom:rect.top<top?rect.top-top:0;
 if(Math.abs(delta)>1)window.scrollBy({top:delta,left:0,behavior:'instant'});
}
function focusExamInput(el){
 lastExamInput=el;if(window.CambridgeWritingMode?.focus)window.CambridgeWritingMode.focus(el);else{el.focus({preventScroll:true});window.AdrianKeyboard?.open?.(el);}
 requestAnimationFrame(ensureExamInputVisible);setTimeout(ensureExamInputVisible,200);
}
window.addEventListener('resize',()=>requestAnimationFrame(ensureExamInputVisible));
window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(ensureExamInputVisible));
function examInputs(){return Array.from(document.querySelectorAll("#paperHost input[data-n]"));}
function moveExamInput(delta){
  const list=examInputs();if(!list.length)return;
  let i=Math.max(0,list.indexOf(lastExamInput));i=Math.max(0,Math.min(list.length-1,i+delta));
  const next=list[i];if(!next)return;
  focusExamInput(next);
}
function insertExamText(text){
  const el=lastExamInput;if(!el)return;
  const s=el.selectionStart??el.value.length,e=el.selectionEnd??s;
  el.value=el.value.slice(0,s)+text+el.value.slice(e);const p=s+text.length;el.setSelectionRange?.(p,p);
  el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));
  el.focus({preventScroll:true});
}
function decorateCambridgeKeyboard(){
  const root=document.querySelector(".ad-keyboard"),controls=root?.querySelector(".ad-keyboard-controls");
  if(!controls||controls.dataset.cambridgeReady)return;
  controls.dataset.cambridgeReady="1";
  const make=(cls,label,fn)=>{
    const b=document.createElement("button");b.type="button";b.className="ad-key control "+cls;b.textContent=label;
    b.addEventListener("pointerdown",e=>e.preventDefault());b.addEventListener("click",()=>{try{navigator.vibrate?.(7);}catch(e){}fn();});
    return b;
  };
  const space=controls.querySelector('[data-action="space"]'),back=controls.querySelector('[data-action="back"]');
  const prev=make("cambridge-prev","←",()=>moveExamInput(-1));
  const apos=make("cambridge-apos","'",()=>insertExamText("'"));
  const next=make("cambridge-next","→",()=>moveExamInput(1));
  controls.insertBefore(prev,space||controls.firstChild);controls.insertBefore(apos,space||null);controls.insertBefore(next,back||null);
}
document.addEventListener("focusin",e=>{if(e.target?.matches?.("#paperHost input[data-n]")){lastExamInput=e.target;requestAnimationFrame(ensureExamInputVisible);setTimeout(ensureExamInputVisible,200);}});
const keyboardObserver=new MutationObserver(()=>queueMicrotask(decorateCambridgeKeyboard));
keyboardObserver.observe(document.documentElement,{childList:true,subtree:true});

function loadStats(){try{const raw=localStorage.getItem(statsKey),x=pendingStats||JSON.parse(raw),s=x&&Array.isArray(x.attempts)?{...x,attempts:x.attempts.filter(a=>a&&typeof a==="object"&&typeof a.exerciseId==="string"&&Number.isFinite(a.correct)&&Number.isFinite(a.total)&&a.total>0)}:{attempts:[]};if(raw&&x?.attempts?.length!==s.attempts.length)localStorage.setItem(statsKey+"_recovery_"+Date.now(),raw);let dirty=false;s.attempts.forEach(a=>{if("sec" in a){delete a.sec;dirty=true;}if("targetSec" in a){delete a.targetSec;dirty=true;}});if(dirty)localStorage.setItem(statsKey,JSON.stringify(s));return s;}catch(e){try{const raw=localStorage.getItem(statsKey);if(raw)localStorage.setItem(statsKey+"_recovery_"+Date.now(),raw);}catch(_){}return pendingStats||{attempts:[]};}}
function saveAttempt(result,details){
  const s=loadStats(),src=getSource(activePaper,activePart);
  s.attempts.push({
    id:crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random(),
    exerciseId:activeExerciseId,paperId:activePaper.id,paperLabel:activePaper.label,
    part:activePart,title:currentPart().title,correct:result.correct,total:result.total,
    completedAt:new Date().toISOString(),durationSec:exerciseStartedAt?Math.max(0,(Date.now()-exerciseStartedAt)/1000):null,
    source:{type:src.type||"",label:src.label||"",detail:src.detail||"",url:src.url||""},
    items:details
  });
  pendingStats=s;try{localStorage.setItem(statsKey,JSON.stringify(s));pendingStats=null;return true;}catch(e){console.warn("Progress retained in memory",e);return false;}
}
function bankAttempts(){const ids=new Set(allExercises().map(x=>x.id));return loadStats().attempts.filter(a=>ids.has(a.exerciseId));}
function exerciseAttempts(id){return bankAttempts().filter(a=>a.exerciseId===id);}
function completedIds(){return new Set(bankAttempts().map(a=>a.exerciseId));}
function aggregate(attempts){
  const total=attempts.reduce((n,a)=>n+a.total,0),correct=attempts.reduce((n,a)=>n+a.correct,0);
  return {runs:attempts.length,total,correct,accuracy:total?Math.round(correct/total*100):0,errors:total-correct};
}

function cambridgeMedalCounts(){return window.AdrianAchievements?.countsFromHistory?.(bankAttempts())||{blue:0,violet:0,gold:0};}
function renderHome(){
  const practice=practiceExercises(),ocr=ocrExercises(),attempts=bankAttempts(),practiceAttempts=attemptsForExercises(practice,attempts),practiceDone=completedForExercises(practice,attempts),ocrDone=completedForExercises(ocr,attempts),g=aggregate(practiceAttempts);
  $("bankProgress").textContent="Practice Bank: 20 tests nativos · "+practiceDone.size+" / "+TARGET_PRACTICE+" Parts hechas · OCR Originals: "+ocrDone.size+" / "+TARGET_OCR;
  $("startMedals").innerHTML=safeDecoration(()=>window.AdrianAchievements?.medalStripHtml?.(cambridgeMedalCounts(),{context:"summary"}));
  $("globalStats").innerHTML=statCell(practiceDone.size+"/"+TARGET_PRACTICE,"PRACTICE PARTS")+statCell(g.total?g.accuracy+"%":"—","ACIERTO PRACTICE")+statCell(g.runs,"INTENTOS PRACTICE")+statCell(g.errors,"FALLOS PRACTICE");
  const host=$("partList");host.innerHTML="";
  [1,2,3,4].forEach(part=>{const list=practice.filter(ex=>ex.part===part),partDone=list.filter(ex=>practiceDone.has(ex.id)).length,ids=new Set(list.map(x=>x.id)),a=aggregate(practiceAttempts.filter(x=>ids.has(x.exerciseId))),info=PART_INFO[part],b=document.createElement("button");b.className="part-card";b.innerHTML="<div class='exercise-top'><span class='exercise-part'>PART "+part+"</span><span class='part-count'>"+partDone+" / "+PRACTICE_COUNT+"</span></div><b>"+esc(info.name)+"</b><span class='part-desc'>"+esc(info.desc)+"</span><span class='exercise-meta'>"+(a.runs?("Practice 11–30 · Acierto "+a.accuracy+"% · "+a.runs+" intentos · "+a.errors+" fallos"):"Practice 11–30 · Sin ejercicios realizados")+"</span>";b.onclick=()=>openPartMenu(part);host.appendChild(b);});
  const ocrCard=document.createElement("button");ocrCard.className="part-card ocr-library-card";ocrCard.innerHTML="<div class='exercise-top'><span class='exercise-part'>OCR ORIGINALS</span><span class='part-count'>"+ocrDone.size+" / "+TARGET_OCR+"</span></div><b>Cambridge 01–10 · Original scans</b><span class='part-desc'>Biblioteca separada de exámenes originales en imagen. Pantalla grande recomendada.</span><span class='exercise-meta'>Resultados guardados aparte del Practice Bank · 10 tests × 4 Parts</span>";ocrCard.onclick=openOcrMenu;host.appendChild(ocrCard);
  $("phaseNote").classList.remove("hidden");$("phaseNote").innerHTML="<b>Practice Bank · tests 11–30.</b> Formato nativo optimizado para móvil y ordenador; estas 80 Parts forman la estadística principal.<br><b>OCR Originals · tests 01–10.</b> Se conservan completos con sus imágenes y claves, separados dentro de cada Part y con pantalla grande recomendada.";
}
function statCell(value,label){return "<div class='stat'><b>"+value+"</b><span>"+label+"</span></div>";}

function openPartMenu(part){
  menuPart=Number(part);renderPartMenu();showScreen("partScreen");window.scrollTo(0,0);
}
function renderPartMenu(){
  const done=completedIds(),practice=practiceExercises().filter(ex=>ex.part===menuPart),practiceIds=new Set(practice.map(x=>x.id)),practiceAttempts=bankAttempts().filter(a=>a.part===menuPart&&practiceIds.has(a.exerciseId)),g=aggregate(practiceAttempts),info=PART_INFO[menuPart],practiceDone=practice.filter(ex=>done.has(ex.id)).length;
  $("partMenuTitle").textContent="Part "+menuPart+" · "+info.name;$("partMenuSubtitle").textContent=practiceDone+" de "+PRACTICE_COUNT+" Practice hechos · tests 11–30";$("partStats").innerHTML=statCell(practiceDone+"/"+PRACTICE_COUNT,"PRACTICE")+statCell(g.total?g.accuracy+"%":"—","ACIERTO")+statCell(g.runs,"INTENTOS")+statCell(g.errors,"FALLOS");
  const host=$("exerciseList");host.innerHTML="";let nextMarked=false;
  for(let n=PRACTICE_START;n<=BANK_SIZE;n++){const paper=paperByNumber(n),id=paper?exerciseId(paper,menuPart):null,at=id?exerciseAttempts(id):[],a=aggregate(at),last=at[at.length-1],b=document.createElement("button"),available=!!paper,wasDone=!!at.length;b.className="exam-tile"+(wasDone?" done":"")+(!available?" unavailable":"");if(available&&!wasDone&&!nextMarked){b.classList.add("next");nextMarked=true;}b.disabled=!available;const source=paper?.source?.type||"PENDIENTE";b.innerHTML="<span class='bank-source'>"+esc(source)+"</span><span class='exam-no'>"+String(n).padStart(2,"0")+"</span><span class='exam-status'>"+(wasDone?"HECHO":available?"PENDIENTE":"POR CARGAR")+"</span><span class='exam-mini'>"+(wasDone?("Último "+last.correct+"/"+last.total+" · "+a.runs+" int. · "+a.errors+" fallos"):available?"Listo para hacer":"No disponible")+"</span>";if(available)b.onclick=()=>startExercise(id);host.appendChild(b);}
}
function openOcrMenu(){
  const attempts=attemptsForExercises(ocrExercises()),done=completedForExercises(ocrExercises()),g=aggregate(attempts);menuPart=null;$("partMenuTitle").textContent="OCR Originals · Cambridge 01–10";$("partMenuSubtitle").textContent="10 exámenes originales · 40 Parts · pantalla grande recomendada";$("partStats").innerHTML=statCell(done.size+"/"+TARGET_OCR,"OCR PARTS")+statCell(g.total?g.accuracy+"%":"—","ACIERTO")+statCell(g.runs,"INTENTOS")+statCell(g.errors,"FALLOS");
  const host=$("exerciseList");host.innerHTML="<div class='ocr-library-note'><b>ORIGINALES EN IMAGEN</b><span>Se conservan tal como fueron preparados. Puedes ampliarlos y responder debajo; sus estadísticas no modifican la cobertura del Practice Bank.</span></div>";
  for(let n=1;n<=OCR_END;n++){const paper=paperByNumber(n),card=document.createElement("section");card.className="ocr-exam-card";const head=document.createElement("div");head.className="ocr-exam-head";head.innerHTML="<span>CAMBRIDGE ORIGINAL</span><b>TEST "+String(n).padStart(2,"0")+"</b>";card.appendChild(head);const parts=document.createElement("div");parts.className="ocr-part-grid";for(let part=1;part<=4;part++){const id=paper?exerciseId(paper,part):null,at=id?exerciseAttempts(id):[],a=aggregate(at),last=at.at(-1),b=document.createElement("button");b.type="button";b.className="ocr-part-btn"+(at.length?" done":"");b.innerHTML="<b>PART "+part+"</b><span>"+(at.length?(last.correct+"/"+last.total+" · "+a.runs+" int."):"PENDIENTE")+"</span>";b.disabled=!paper;if(paper)b.onclick=()=>startExercise(id);parts.appendChild(b);}card.appendChild(parts);host.appendChild(card);}showScreen("partScreen");window.scrollTo(0,0);
}

function startExercise(id){
  const ex=allExercises().find(x=>x.id===id);if(!ex)return;
  activePaper=ex.paper;activePart=ex.part;activeExerciseId=id;answers={};checked=false;exerciseStartedAt=Date.now();lastExamInput=null;
  const src=getSource(activePaper,activePart);
  $("headPart").textContent="Exam "+String(activePaper.examNumber).padStart(2,"0")+" · Part "+activePart;
  $("headSource").textContent=sourceLine(src);
  showScreen("paperScreen");renderPart();window.scrollTo(0,0);
}
function renderPart(){
  const p=currentPart(),src=getSource(activePaper,activePart),host=$("paperHost"),a=aggregate(exerciseAttempts(activeExerciseId));
  host.innerHTML="<div class='part-label'>EXAM "+String(activePaper.examNumber).padStart(2,"0")+" · B2 FIRST · READING AND USE OF ENGLISH</div><h2>"+esc(p.title)+"</h2>"+
    "<div class='sub'>"+esc(p.subtitle)+"</div>"+
    "<details class='exercise-meta-fold'><summary>DETALLES DEL EJERCICIO</summary>"+
      "<div class='source-box'><b>ESTADÍSTICA</b><span>"+(a.runs?(a.runs+" intentos · "+a.accuracy+"% acierto · "+a.errors+" fallos acumulados"):"Primer intento")+"</span></div>"+
      "<div class='source-box'><b>FUENTE</b><span>"+esc(sourceLine(src))+"</span><small>"+esc(src.detail||"")+"</small></div>"+
    "</details>"+
    "<div class='instructions'>"+esc(p.instructions)+"</div>"+
    "<div id='answerProgress' class='answer-progress'></div>"+renderBody(p)+
    "<div class='paper-actions'><button id='checkBtn' class='primary'>CORREGIR EJERCICIO</button><button id='resetBtn' class='secondary'>REINICIAR</button></div>";
  $("checkBtn").onclick=checkPart;$("resetBtn").onclick=()=>startExercise(activeExerciseId);bindInputs();updateAnswerProgress();
}
function renderBody(p){
  if(p.layout==="worksheet")return renderWorksheetBody(p);
  if(p.scanImage)return renderScanBody(p);
  if(activePart===4)return "<div class='transform-list'>"+p.items.map(it=>
    "<article class='transform'><div class='n'>QUESTION "+it.n+"</div><div class='first'>"+esc(it.first)+"</div><div class='keyword'>"+esc(it.keyword)+"</div>"+
    "<div class='second'>"+esc(it.secondBefore)+"<input class='transform-input' data-n='"+it.n+"' data-ad-keyboard='en' inputmode='none' autocomplete='off' autocorrect='off' autocapitalize='none' spellcheck='false'>"+esc(it.secondAfter)+"</div></article>"
  ).join("")+"</div>";
  return "<div class='exam-text'><p>"+p.segments.map(seg=>typeof seg==="string"?esc(seg):gapHtml(seg)).join("")+"</p></div>";
}
function renderWorksheetBody(p){
  const rows=(p.items||[]).map(it=>{
    if(activePart===1){
      const opts=["A","B","C","D"];
      return "<div class='worksheet-row'><div class='worksheet-qn'>"+it.n+"</div><div class='worksheet-choices'>"+opts.map(v=>"<button type='button' class='worksheet-choice "+(answers[it.n]===v?"selected":"")+"' data-n='"+it.n+"' data-val='"+v+"'>"+v+"</button>").join("")+"</div></div>";
    }
    return "<div class='worksheet-row'><div class='worksheet-qn'>"+it.n+"</div><input class='worksheet-input' data-n='"+it.n+"' data-ad-keyboard='en' inputmode='none' value='"+esc(answers[it.n]||"")+"' autocomplete='off' autocorrect='off' autocapitalize='none' spellcheck='false'></div>";
  }).join("");
  return "<div class='worksheet-wrap'><div class='worksheet-prompt'>"+esc(p.prompt||"").replace(/\n/g,"<br>")+"</div><div class='worksheet-answer-panel'><h3>RESPUESTAS</h3>"+rows+"</div></div>";
}
function renderScanBody(p){
  const rows=(p.items||[]).map(it=>{
    if(it.options)return "<div class='scan-answer-row'><div class='scan-qn'>"+it.n+"</div><div class='scan-choices'>"+it.options.map(v=>"<button type='button' class='scan-choice "+(answers[it.n]===v?"selected":"")+"' data-n='"+it.n+"' data-val='"+esc(v)+"'>"+esc(v)+"</button>").join("")+"</div></div>";
    return "<div class='scan-answer-row'><div class='scan-qn'>"+it.n+"</div><input class='scan-input' data-n='"+it.n+"' data-ad-keyboard='en' inputmode='none' value='"+esc(answers[it.n]||"")+"' autocomplete='off' autocorrect='off' autocapitalize='none' spellcheck='false'></div>";
  }).join("");
  return "<div class='scan-wrap'><img class='scan-page' src='"+esc(p.scanImage)+"' alt='Original Cambridge exam page'><div class='scan-answer-panel'><h3>RESPUESTAS</h3>"+rows+"</div></div>";
}
function gapHtml(seg){
  const val=answers[seg.n]||"";
  if(activePart===1)return "<span class='gap-wrap'><span class='gap-num'>"+seg.n+"</span><button class='gap-choice "+(val?"":"empty")+"' data-n='"+seg.n+"'>"+(val?esc(val):"choose")+" ▾</button></span>";
  const base=activePart===3?"<span class='base-pill'>"+esc(seg.base)+"</span>":"";
  return "<span class='gap-wrap'><span class='gap-num'>"+seg.n+"</span><input class='inline-input' data-n='"+seg.n+"' data-ad-keyboard='en' inputmode='none' value='"+esc(val)+"' autocomplete='off' autocorrect='off' autocapitalize='none' spellcheck='false'>"+base+"</span>";
}
function bindInputs(){
  if(currentPart()?.layout==="worksheet"){
    document.querySelectorAll(".worksheet-choice").forEach(b=>b.onclick=()=>{
      const n=Number(b.dataset.n);answers[n]=b.dataset.val;
      b.parentElement.querySelectorAll(".worksheet-choice").forEach(x=>x.classList.toggle("selected",x===b));
      updateAnswerProgress();
    });
    document.querySelectorAll(".worksheet-input").forEach(inp=>inp.addEventListener("input",()=>{answers[Number(inp.dataset.n)]=inp.value;updateAnswerProgress();}));
    return;
  }
  if(currentPart()?.scanImage){
    document.querySelector(".scan-page")?.addEventListener("click",e=>openScanViewer(e.currentTarget.getAttribute("src")));
    document.querySelectorAll(".scan-choice").forEach(b=>b.onclick=()=>{
      const n=Number(b.dataset.n);answers[n]=b.dataset.val;
      b.parentElement.querySelectorAll(".scan-choice").forEach(x=>x.classList.toggle("selected",x===b));
      updateAnswerProgress();
    });
    document.querySelectorAll("input[data-n]").forEach(inp=>inp.addEventListener("input",()=>{answers[Number(inp.dataset.n)]=inp.value;updateAnswerProgress();}));
    return;
  }
  if(activePart===1)document.querySelectorAll(".gap-choice").forEach(b=>b.onclick=()=>openChoices(Number(b.dataset.n)));
  else document.querySelectorAll("input[data-n]").forEach(inp=>inp.addEventListener("input",()=>{answers[Number(inp.dataset.n)]=inp.value;updateAnswerProgress();}));
}
function openChoices(n){
  const seg=currentPart()?.segments?.find(x=>typeof x==="object"&&x.n===n);if(!seg)return;
  $("sheetTitle").textContent="Question "+n;$("optionGrid").innerHTML="";
  const ctx=choiceContext(n);$("sheetContext").textContent=ctx;$("sheetContext").classList.toggle("hidden",!ctx);
  seg.options.forEach((opt,i)=>{const b=document.createElement("button");b.className="option";b.innerHTML="<strong>"+String.fromCharCode(65+i)+"</strong>"+esc(opt);
    b.onclick=()=>{
      answers[n]=opt;closeSheet();
      const gap=document.querySelector(".gap-choice[data-n='"+n+"']");
      if(gap){gap.innerHTML=esc(opt)+" ▾";gap.classList.remove("empty");}
      updateAnswerProgress();
    };$("optionGrid").appendChild(b);});
  $("choiceSheet").classList.remove("hidden");
}
function closeSheet(){$("choiceSheet").classList.add("hidden");}
function collectAnswers(){document.querySelectorAll("input[data-n]").forEach(inp=>answers[Number(inp.dataset.n)]=inp.value);}
function expected(it){return it.display||it.answers?.[0]||it.answer||"";}
function microfocusExpected(user,correct){
  const u=String(user||""),c=String(correct||"");
  if(!u||!c)return esc(c);
  const ul=u.toLowerCase(),cl=c.toLowerCase(),limit=Math.min(ul.length,cl.length);
  let pre=0;while(pre<limit&&ul[pre]===cl[pre])pre++;
  let suf=0;while(suf<limit-pre&&ul[ul.length-1-suf]===cl[cl.length-1-suf])suf++;
  const shared=pre+suf,near=Math.abs(u.length-c.length)<=3&&shared>=Math.max(2,Math.floor(Math.min(u.length,c.length)*.35));
  if(!near)return esc(c);
  const a=c.slice(0,pre),mid=c.slice(pre,c.length-suf),z=suf?c.slice(c.length-suf):"";
  return esc(a)+"<span class='ortho-risk'>"+esc(mid||c.slice(pre,pre+1))+"</span>"+esc(z);
}
function reviewCard(d){
  return "<article class='review-item "+(d.correct?"review-ok":"review-bad")+"'>"+
    "<div class='review-q'><b>Pregunta "+d.question+"</b><span>"+(d.correct?"CORRECTA":"FALLO")+"</span></div>"+
    "<div class='review-answer'><small>TU RESPUESTA</small><b>"+esc(d.userAnswer||"—")+"</b></div>"+
    "<div class='review-answer'><small>RESPUESTA CORRECTA</small><b>"+(d.correct?esc(d.expected):microfocusExpected(d.userAnswer,d.expected))+"</b></div>"+
    "<p>"+esc(d.explanation)+"</p><div class='skill'>PATRÓN · "+esc(d.skill)+"</div></article>";
}
function checkPart(){
  if(checked)return;collectAnswers();
  const items=partItems(),missing=items.filter(it=>!norm(answers[it.n]));
  if(missing.length){
    updateAnswerProgress("FALTAN "+missing.length+" RESPUESTA"+(missing.length===1?"":"S"));
    focusQuestion(missing[0].n);
    return;
  }
  checked=true;
  let correct=0;
  const details=items.map(it=>{
    const valid=validAnswers(it),user=answers[it.n]||"",ok=valid.includes(norm(user));if(ok)correct++;
    return {question:it.n,correct:ok,userAnswer:user,expected:expected(it),explanation:it.explanation||"Sin explicación específica registrada.",skill:it.skill||"sin clasificar",base:it.base||null,keyword:it.keyword||null};
  });
  const saved=saveAttempt({correct,total:items.length},details);try{window.HubPathGame?.resolve?.({appId:"cambridge",correct,total:items.length,eventId:`cambridge:${activeExerciseId}:${Date.now()}`});}catch(e){console.warn("Hub Oca unavailable",e);}try{renderCorrection({correct,total:items.length},details);}finally{showScreen("resultScreen");}if(!saved){const note=document.createElement("p"),backup=document.createElement("button");note.className="exercise-meta";note.textContent="Resultado conservado en memoria. El almacenamiento no está disponible.";backup.className="secondary";backup.textContent="GUARDAR COPIA DEL PROGRESO";backup.onclick=()=>{const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(pendingStats)],{type:"application/json"}));a.href=url;a.download="cambridge-progress-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$("reviewSummary").append(note,backup);}
}
function renderCorrection(result,details){
  const src=getSource(activePaper,activePart),pct=Math.round(result.correct/result.total*100),bad=details.filter(d=>!d.correct),ok=details.filter(d=>d.correct);
  $("resultTitle").textContent="Corrección · Part "+activePart;
  $("resultSource").textContent=sourceLine(src);
  $("reviewSummary").innerHTML="<div class='review-score'><b>"+result.correct+" / "+result.total+"</b><span>"+pct+"% de acierto</span></div>"+
    (safeDecoration(()=>window.AdrianAchievements?.medalStripHtml?.(cambridgeMedalCounts(),{context:"summary"})))+
    "<details class='exercise-meta-fold'><summary>FUENTE DEL EJERCICIO</summary><div class='source-box'><span>"+esc(sourceLine(src))+"</span><small>"+esc(src.detail||"")+"</small></div></details>";
  const achievement=safeDecoration(()=>window.AdrianAchievements?.badgeHtml?.(result.correct,result.total,cambridgeMedalCounts()));if(achievement){$("reviewSummary").insertAdjacentHTML("beforeend",achievement);safeDecoration(()=>window.AdrianAchievements?.play?.(null,result.correct,result.total));}
  $("reviewHost").innerHTML=(bad.length?"<div class='review-errors-title'>"+bad.length+" FALLO"+(bad.length===1?"":"S")+" · REVISA ESTO PRIMERO</div>"+bad.map(reviewCard).join(""):"<div class='review-errors-title' style='color:#147747'>TODO CORRECTO</div>")+
    (ok.length?"<details class='review-correct'><summary>"+ok.length+" CORRECTA"+(ok.length===1?"":"S")+" · ver</summary><div class='review-list'>"+ok.map(reviewCard).join("")+"</div></details>":"");
  const next=nextPendingInPart(activePart);
  $("reviewActions").innerHTML=(next?"<button id='nextBtn' class='primary'>SIGUIENTE PENDIENTE DE ESTA PART</button>":"<button id='partBtn' class='primary'>VOLVER A PART "+activePart+"</button>")+
    "<button id='repeatBtn' class='secondary'>REPETIR EJERCICIO</button>";
  if(next)$("nextBtn").onclick=()=>startExercise(next.id);else $("partBtn").onclick=()=>openPartMenu(activePart);
  $("repeatBtn").onclick=()=>startExercise(activeExerciseId);
  showScreen("resultScreen");renderHome();window.scrollTo(0,0);
}
function nextPendingInPart(part){const done=completedIds();return allExercises().filter(ex=>ex.part===part&&!done.has(ex.id)).sort((a,b)=>(a.paper.examNumber||99)-(b.paper.examNumber||99))[0]||null;}
function goHome(){closeSheet();closeScanViewer();window.AdrianKeyboard?.close?.();renderHome();showScreen("startScreen");window.scrollTo(0,0);}
function backToPart(){closeSheet();closeScanViewer();window.AdrianKeyboard?.close?.();if(activePaper?.parts?.[activePart]?.scanImage)openOcrMenu();else openPartMenu(activePart||menuPart||1);}

$("backBtn").onclick=backToPart;$("resultBackBtn").onclick=backToPart;$("partBackBtn").onclick=goHome;$("sheetClose").onclick=closeSheet;
$("choiceSheet").addEventListener("click",e=>{if(e.target===$("choiceSheet"))closeSheet();});
$("scanViewerClose").onclick=closeScanViewer;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSheet();closeScanViewer();}});
renderHome();
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=performance-20261006b",{updateViaCache:"none"}).then(r=>r.update()).catch(()=>{}));
const requestedPart=new URLSearchParams(location.search).get("part");
if(["1","2","3","4"].includes(requestedPart))openPartMenu(Number(requestedPart));