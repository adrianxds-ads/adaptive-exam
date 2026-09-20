const PAPERS=window.ADAPTIVE_EXAM_PAPERS||[];
const $=id=>document.getElementById(id);
let activePart=null,activePaper=PAPERS[0]||null,answers={},timerId=null,startMs=0,checked=false;
const statsKey="adaptiveExamPaperStatsV2";

function norm(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").trim().replace(/\s+/g," ");}
function fmt(sec){sec=Math.max(0,Math.round(sec));const m=Math.floor(sec/60),s=sec%60;return m+":"+String(s).padStart(2,"0");}
function showScreen(id){["startScreen","paperScreen"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function partData(){return activePaper?.parts?.[activePart];}
function loadStats(){try{return JSON.parse(localStorage.getItem(statsKey))||{};}catch(e){return{};}}
function saveStats(result){
  const s=loadStats(),k="p"+activePart,o=s[k]||{runs:0,correct:0,total:0,totalSec:0,overtime:0};
  o.runs++;o.correct+=result.correct;o.total+=result.total;o.totalSec+=result.sec;if(result.sec>partData().targetSec)o.overtime++;
  s[k]=o;localStorage.setItem(statsKey,JSON.stringify(s));
}
function renderStats(){
  const s=loadStats(),host=$("lifetimeStats");host.innerHTML="";
  [1,2,3,4].forEach(p=>{
    const o=s["p"+p]||{runs:0,correct:0,total:0,totalSec:0};
    const acc=o.total?Math.round(o.correct/o.total*100):0,avg=o.runs?fmt(o.totalSec/o.runs):"—";
    const d=document.createElement("div");d.className="stat";d.innerHTML="<b>"+acc+"%</b><span>PART "+p+" · "+avg+" AVG</span>";host.appendChild(d);
  });
}
function startPart(p){
  activePart=Number(p);answers={};checked=false;const part=partData();if(!part)return;
  $("headPart").textContent="Part "+activePart;$("headSource").textContent=activePaper.label;$("timerTarget").textContent="TARGET "+fmt(part.targetSec);
  showScreen("paperScreen");renderPart();startTimer(part.targetSec);window.scrollTo(0,0);
}
function startTimer(target){
  clearInterval(timerId);startMs=performance.now();$("timerBox").classList.remove("overtime");
  const tick=()=>{const elapsed=(performance.now()-startMs)/1000,remaining=target-elapsed;
    if(remaining>=0){$("timerText").textContent=fmt(remaining);}
    else{$("timerText").textContent="+"+fmt(-remaining);$("timerBox").classList.add("overtime");}
  };tick();timerId=setInterval(tick,250);
}
function renderPart(){
  const p=partData(),host=$("paperHost");
  host.innerHTML="<div class='part-label'>B2 FIRST · READING AND USE OF ENGLISH</div><h2>"+p.title+"</h2><div class='sub'>"+p.subtitle+"</div><div class='instructions'>"+p.instructions+"</div>"+renderBody(p)+"<div class='paper-actions'><button id='checkBtn' class='primary'>CHECK PART</button><button id='resetBtn' class='secondary'>RESET</button></div><div id='resultNote' class='answer-note hidden'></div>";
  $("checkBtn").onclick=checkPart;$("resetBtn").onclick=()=>startPart(activePart);
  bindInputs();
}
function renderBody(p){
  if(activePart===4){
    return "<div class='transform-list'>"+p.items.map(it=>"<article class='transform'><div class='n'>QUESTION "+it.n+"</div><div class='first'>"+it.first+"</div><div class='keyword'>"+it.keyword+"</div><div class='second'>"+it.secondBefore+"<input class='transform-input' data-n='"+it.n+"' autocomplete='off' spellcheck='false' aria-label='Question "+it.n+"'>"+it.secondAfter+"</div></article>").join("")+"</div>";
  }
  return "<div class='exam-text'><p>"+p.segments.map(seg=>typeof seg==="string"?seg:gapHtml(seg)).join("")+"</p></div>";
}
function gapHtml(seg){
  const val=answers[seg.n]||"";
  if(activePart===1){
    const label=val?escapeHtml(val):"choose";
    return "<span class='gap-wrap'><span class='gap-num'>"+seg.n+"</span><button class='gap-choice "+(val?"":"empty")+"' data-n='"+seg.n+"'>"+label+" ▾</button></span>";
  }
  const base=activePart===3?"<span class='base-pill'>"+seg.base+"</span>":"";
  return "<span class='gap-wrap'><span class='gap-num'>"+seg.n+"</span><input class='inline-input' data-n='"+seg.n+"' value='"+escapeAttr(val)+"' autocomplete='off' spellcheck='false'>"+base+"</span>";
}
function bindInputs(){
  if(activePart===1){
    document.querySelectorAll(".gap-choice").forEach(b=>b.onclick=()=>openChoices(Number(b.dataset.n)));
  }else{
    document.querySelectorAll("input[data-n]").forEach(inp=>inp.addEventListener("input",()=>{answers[Number(inp.dataset.n)]=inp.value;}));
  }
}
function openChoices(n){
  const seg=partData().segments.find(x=>typeof x==="object"&&x.n===n);if(!seg)return;
  $("sheetTitle").textContent="Question "+n;$("optionGrid").innerHTML="";
  seg.options.forEach((opt,i)=>{
    const b=document.createElement("button");b.className="option";b.innerHTML="<strong>"+String.fromCharCode(65+i)+"</strong>"+escapeHtml(opt);
    b.onclick=()=>{answers[n]=opt;closeSheet();renderPart();};$("optionGrid").appendChild(b);
  });
  $("choiceSheet").classList.remove("hidden");
}
function closeSheet(){$("choiceSheet").classList.add("hidden");}
function collectAnswers(){
  document.querySelectorAll("input[data-n]").forEach(inp=>answers[Number(inp.dataset.n)]=inp.value);
}
function checkPart(){
  if(checked)return;checked=true;clearInterval(timerId);collectAnswers();
  const p=partData(),items=activePart===4?p.items:p.segments.filter(x=>typeof x==="object");
  let correct=0;
  items.forEach(it=>{
    const valid=activePart===4?it.answers:[it.answer],ok=valid.map(norm).includes(norm(answers[it.n]||""));if(ok)correct++;
    const el=document.querySelector("[data-n='"+it.n+"']");
    if(el){el.classList.remove("correct","wrong");el.classList.add(ok?"correct":"wrong");el.disabled=true;}
  });
  const sec=(performance.now()-startMs)/1000,total=items.length;saveStats({correct,total,sec});
  const note=$("resultNote");note.classList.remove("hidden");note.classList.add(correct===total?"good":"bad");
  note.innerHTML="<strong>"+correct+" / "+total+" correct</strong><br>Time: "+fmt(sec)+" · target "+fmt(p.targetSec)+(sec>p.targetSec?" · overtime":" · within target")+"<div class='result-strip'><div class='result-cell'><b>"+Math.round(correct/total*100)+"%</b><span>ACCURACY</span></div><div class='result-cell'><b>"+fmt(sec)+"</b><span>TIME</span></div><div class='result-cell'><b>"+fmt(Math.max(0,sec-p.targetSec))+"</b><span>OVERTIME</span></div></div>";
  const actions=document.querySelector(".paper-actions");
  actions.innerHTML="<button id='againAfter' class='primary'>TRY AGAIN</button><button id='homeAfter' class='secondary'>HOME</button>";
  $("againAfter").onclick=()=>startPart(activePart);$("homeAfter").onclick=goHome;
  renderStats();
}
function goHome(){clearInterval(timerId);closeSheet();showScreen("startScreen");renderStats();window.scrollTo(0,0);}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function escapeAttr(s){return escapeHtml(s);}
document.querySelectorAll(".mode").forEach(b=>b.addEventListener("click",()=>startPart(b.dataset.part)));
$("backBtn").onclick=goHome;$("sheetClose").onclick=closeSheet;$("choiceSheet").addEventListener("click",e=>{if(e.target===$("choiceSheet"))closeSheet();});
renderStats();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
const requestedPart=new URLSearchParams(location.search).get('part');if(['1','2','3','4'].includes(requestedPart))startPart(requestedPart);
