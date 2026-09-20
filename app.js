const PARTS=window.ADAPTIVE_EXAM_PARTS||[];
const $=id=>document.getElementById(id);
const LABELS={1:"MULTIPLE-CHOICE CLOZE",2:"OPEN CLOZE",3:"WORD FORMATION",4:"KEY WORD TRANSFORMATIONS"};
let run=null,timerId=null,lastMode="1";

function norm(v){
  return String(v||"").toLowerCase().replace(/[’‘]/g,"'").trim().replace(/\s+/g," ");
}
function screen(id){
  ["startScreen","gameScreen","resultScreen"].forEach(x=>$(x).classList.toggle("hidden",x!==id));
}
function getPart(n){
  return PARTS.find(p=>p.part===Number(n));
}
function formatTime(sec){
  sec=Math.max(0,Math.floor(sec));
  return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
}
function start(mode){
  lastMode=String(mode);
  const sequence=mode==="paper"?[1,2,3,4]:[Number(mode)];
  run={mode:String(mode),sequence,position:0,records:[],partStart:0,checked:false};
  screen("gameScreen");
  loadCurrentPart();
}
function loadCurrentPart(){
  clearInterval(timerId);
  run.checked=false;
  const part=getPart(run.sequence[run.position]);
  run.current=part;
  run.partStart=performance.now();
  $("partTitle").textContent="Part "+part.part;
  $("partSubtitle").textContent=LABELS[part.part];
  $("targetText").textContent=Math.round(part.targetSec/60)+" min target";
  $("paperProgress").textContent=(run.position+1)+" / "+run.sequence.length;
  $("instruction").textContent=part.instruction;
  $("progressFill").style.width=(run.position/run.sequence.length*100)+"%";
  $("partSummary").classList.add("hidden");
  $("partSummary").innerHTML="";
  $("checkBtn").classList.remove("hidden");
  $("nextBtn").classList.add("hidden");
  renderPart(part);
  startTimer(part.targetSec);
}
function renderPart(part){
  const host=$("exerciseHost");
  if(part.part===4)renderTransformations(part,host);
  else renderPassage(part,host);
}
function renderPassage(part,host){
  host.innerHTML="";
  const passage=document.createElement("div");
  passage.className="passage";
  const gapMap=new Map(part.gaps.map(g=>[g.n,g]));
  const chunks=part.text.split(/(\[\[\d+\]\])/g);
  chunks.forEach(chunk=>{
    const match=chunk.match(/^\[\[(\d+)\]\]$/);
    if(!match){passage.append(document.createTextNode(chunk));return;}
    const n=Number(match[1]),gap=gapMap.get(n);
    const wrap=document.createElement("span");
    wrap.className=part.part===3?"word-gap":"gap";
    wrap.dataset.n=n;
    const num=document.createElement("span");
    num.className="gap-number";num.textContent=n;
    wrap.appendChild(num);
    if(part.part===1)wrap.appendChild(makeSelect(gap));
    else wrap.appendChild(makeInput(gap));
    if(part.part===3){
      const base=document.createElement("span");
      base.className="baseword";base.textContent=gap.base;
      wrap.appendChild(base);
    }
    passage.appendChild(wrap);
  });
  host.appendChild(passage);
}
function makeSelect(gap){
  const s=document.createElement("select");
  s.className="gap-select";s.dataset.n=gap.n;
  const blank=document.createElement("option");
  blank.value="";blank.textContent="—";s.appendChild(blank);
  gap.options.forEach((opt,i)=>{
    const o=document.createElement("option");
    o.value=opt;o.textContent=String.fromCharCode(65+i)+" · "+opt;s.appendChild(o);
  });
  return s;
}
function makeInput(gap){
  const i=document.createElement("input");
  i.className="gap-input";i.dataset.n=gap.n;i.autocomplete="off";i.autocapitalize="none";i.spellcheck=false;
  i.setAttribute("aria-label","Question "+gap.n);
  return i;
}
function renderTransformations(part,host){
  host.innerHTML="";
  const list=document.createElement("div");list.className="transform-list";
  part.items.forEach(item=>{
    const card=document.createElement("div");card.className="transform";card.dataset.n=item.n;
    card.innerHTML="<div class='transform-head'><span class='qbadge'>"+item.n+"</span><div><div class='first-sentence'>"+item.first+"</div><div class='keyword'>"+item.keyword+"</div><div class='second-sentence'>"+item.secondBefore+"<input data-n='"+item.n+"' autocomplete='off' autocapitalize='none' spellcheck='false'>"+item.secondAfter+"</div></div></div>";
    list.appendChild(card);
  });
  host.appendChild(list);
}
function startTimer(target){
  const timer=$("timer"),label=$("timerText");
  timer.classList.remove("overtime");
  const tick=()=>{
    const elapsed=(performance.now()-run.partStart)/1000;
    const remaining=target-elapsed;
    if(remaining>=0){
      label.textContent=formatTime(remaining);
      timer.style.setProperty("--timer-angle",Math.max(0,remaining/target*360)+"deg");
    }else{
      label.textContent="+"+formatTime(-remaining);
      timer.classList.add("overtime");
      timer.style.setProperty("--timer-angle","360deg");
    }
  };
  tick();timerId=setInterval(tick,250);
}
function collectAnswers(part){
  if(part.part===4){
    return part.items.map(item=>{
      const input=document.querySelector(".transform input[data-n='"+item.n+"']");
      return {n:item.n,value:input?input.value:"",answers:item.answers};
    });
  }
  return part.gaps.map(gap=>{
    const control=document.querySelector("[data-n='"+gap.n+"'].gap-select, [data-n='"+gap.n+"'].gap-input");
    return {n:gap.n,value:control?control.value:"",answers:[gap.answer]};
  });
}
function gradeCurrentPart(){
  if(run.checked)return;
  run.checked=true;clearInterval(timerId);
  const part=run.current,answers=collectAnswers(part);
  let correct=0;const misses=[];
  answers.forEach(row=>{
    const ok=row.answers.map(norm).includes(norm(row.value));
    if(ok)correct++;else misses.push({n:row.n,answer:row.answers[0]});
    markAnswer(part.part,row.n,ok);
  });
  const elapsed=(performance.now()-run.partStart)/1000;
  const overtime=elapsed>part.targetSec;
  run.records.push({part:part.part,correct,total:answers.length,elapsed,overtime});
  showPartSummary(correct,answers.length,elapsed,overtime,misses);
  $("checkBtn").classList.add("hidden");
  const hasNext=run.position<run.sequence.length-1;
  if(hasNext)$("nextBtn").classList.remove("hidden");
  else setTimeout(finishRun,350);
}
function markAnswer(part,n,ok){
  if(part===4){
    const card=document.querySelector(".transform[data-n='"+n+"']");
    const input=card&&card.querySelector("input");
    if(card)card.classList.add(ok?"correct":"wrong");
    if(input){input.disabled=true;input.style.outline="4px solid "+(ok?"#27925c":"#c74253");}
    return;
  }
  const control=document.querySelector("[data-n='"+n+"'].gap-select, [data-n='"+n+"'].gap-input");
  const wrap=control&&control.closest(".gap,.word-gap");
  if(wrap)wrap.classList.add(ok?"correct":"wrong");
  if(control)control.disabled=true;
}
function showPartSummary(correct,total,elapsed,overtime,misses){
  const box=$("partSummary");
  const correction=misses.length?"<br><span>Check: "+misses.map(x=>x.n+" → <b>"+x.answer+"</b>").join(" · ")+"</span>":"";
  box.innerHTML="<b>"+correct+" / "+total+" correct</b> · "+formatTime(elapsed)+(overtime?" · overtime":" · within target")+correction;
  box.classList.remove("hidden");
}
function nextPart(){
  if(run.position>=run.sequence.length-1)return finishRun();
  run.position++;
  loadCurrentPart();
  window.scrollTo({top:0,behavior:"smooth"});
}
function finishRun(){
  clearInterval(timerId);
  saveLifetime(run.records);
  screen("resultScreen");
  const correct=run.records.reduce((s,r)=>s+r.correct,0);
  const total=run.records.reduce((s,r)=>s+r.total,0);
  const seconds=run.records.reduce((s,r)=>s+r.elapsed,0);
  const over=run.records.filter(r=>r.overtime).length;
  $("scoreResult").textContent=total?Math.round(correct/total*100)+"%":"0%";
  $("timeResult").textContent=formatTime(seconds);
  $("overResult").textContent=over;
  $("resultSubtitle").textContent=correct+" / "+total+" correct · "+(run.mode==="paper"?"Parts 1–4":"Part "+run.sequence[0]);
  renderLifetime();
}
function loadLifetime(){
  try{return JSON.parse(localStorage.getItem("adaptiveExamV2Stats"))||{};}
  catch(e){return{};}
}
function saveLifetime(records){
  const state=loadLifetime();
  records.forEach(r=>{
    const key="p"+r.part;
    const x=state[key]||{runs:0,correct:0,total:0,totalSec:0,overtime:0};
    x.runs++;x.correct+=r.correct;x.total+=r.total;x.totalSec+=r.elapsed;x.overtime+=r.overtime?1:0;
    state[key]=x;
  });
  localStorage.setItem("adaptiveExamV2Stats",JSON.stringify(state));
}
function renderLifetime(){
  const state=loadLifetime(),host=$("lifetimeStats");
  host.innerHTML="";
  [1,2,3,4].forEach(p=>{
    const x=state["p"+p]||{runs:0,correct:0,total:0,totalSec:0};
    const acc=x.total?Math.round(x.correct/x.total*100):0;
    const avg=x.runs?formatTime(x.totalSec/x.runs):"—";
    const d=document.createElement("div");
    d.className="stat";
    d.innerHTML="<b>"+acc+"%</b><span>PART "+p+" · "+avg+" AVG</span>";
    host.appendChild(d);
  });
}
document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>start(btn.dataset.mode)));
$("checkBtn").addEventListener("click",gradeCurrentPart);
$("nextBtn").addEventListener("click",nextPart);
$("homeGameBtn").addEventListener("click",()=>{clearInterval(timerId);screen("startScreen");renderLifetime();});
$("homeBtn").addEventListener("click",()=>{screen("startScreen");renderLifetime();});
$("againBtn").addEventListener("click",()=>start(lastMode));
renderLifetime();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}
const deepPart=new URLSearchParams(location.search).get("part");
if(["1","2","3","4","paper"].includes(deepPart))start(deepPart);
