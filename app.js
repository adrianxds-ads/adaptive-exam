const BANK=window.ADAPTIVE_EXAM_BANK||[];
const TARGET={1:25,2:30,3:30,4:75};
const $=id=>document.getElementById(id);
let session=null,timerId=null,lastMode="1";
function norm(v){return String(v||"").toLowerCase().replace(/[’‘]/g,"'").trim().replace(/\s+/g," ");}
function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function screen(id){["startScreen","gameScreen","resultScreen"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function modeItems(mode){
  if(mode==="mixed")return shuffle(BANK);
  if(mode==="paper")return [1,2,3,4].flatMap(p=>BANK.filter(q=>q.part===p));
  return shuffle(BANK.filter(q=>q.part===Number(mode)));
}
function start(mode){
  lastMode=String(mode);const items=modeItems(lastMode);
  session={mode:lastMode,items,index:0,records:[],locked:false,start:Date.now()};
  screen("gameScreen");renderQuestion();
}
function renderQuestion(){
  clearInterval(timerId);session.locked=false;
  const q=session.items[session.index],target=TARGET[q.part];
  session.questionStart=performance.now();
  $("qNumber").textContent=session.index+1;$("qTotal").textContent="/ "+session.items.length;
  $("partName").textContent="PART "+q.part;$("targetLabel").textContent=target+" s target";
  $("progressFill").style.width=((session.index/session.items.length)*100)+"%";
  $("sourceLabel").textContent=q.source||"";
  const card=$("questionCard"),host=$("answerHost");
  if(q.part===4)card.innerHTML="<h2>"+q.prompt+"</h2><div class='keyword'>"+q.keyword+"</div><div class='stem'>"+q.second+"</div>";
  else if(q.part===3)card.innerHTML="<h2>"+q.prompt+"</h2><div class='keyword'>"+q.base+"</div>";
  else card.innerHTML="<h2>"+q.prompt+"</h2>";
  host.innerHTML="";
  if(q.part===1)renderOptions(q,host);else renderInput(q,host);
  startTimer(target);
}
function renderOptions(q,host){
  const wrap=document.createElement("div");wrap.className="answers";
  q.options.forEach((opt,i)=>{const b=document.createElement("button");b.className="answer";b.textContent=String.fromCharCode(65+i)+". "+opt;b.onclick=()=>submit(q,opt,b);wrap.appendChild(b);});
  host.appendChild(wrap);
}
function renderInput(q,host){
  const wrap=document.createElement("div");wrap.className="typebox";
  const input=document.createElement("input");input.autocomplete="off";input.autocapitalize="none";input.spellcheck=false;
  input.placeholder=q.part===4?"Type the missing words":"Type the missing word";
  const b=document.createElement("button");b.className="submit";b.textContent="CHECK";
  b.onclick=()=>submit(q,input.value,input);
  input.addEventListener("keydown",e=>{if(e.key==="Enter")submit(q,input.value,input);});
  wrap.append(input,b);host.appendChild(wrap);
  const hint=document.createElement("div");hint.className="hint";
  hint.textContent=q.part===4?"Keep the given key word unchanged.":"Spelling counts.";
  host.appendChild(hint);setTimeout(()=>input.focus(),40);
}
function startTimer(target){
  const timer=$("timer"),label=$("timerText");timer.classList.remove("overtime");
  const tick=()=>{const elapsed=(performance.now()-session.questionStart)/1000,remaining=target-elapsed;
    if(remaining>=0){label.textContent=Math.ceil(remaining);timer.style.setProperty("--timer-angle",Math.max(0,remaining/target*360)+"deg");}
    else{label.textContent="+"+Math.floor(-remaining);timer.classList.add("overtime");timer.style.setProperty("--timer-angle","360deg");}
  };
  tick();timerId=setInterval(tick,100);
}
function validAnswers(q){return (q.alt&&q.alt.length?q.alt:[q.answer]).map(norm);}
function submit(q,value,control){
  if(session.locked)return;session.locked=true;clearInterval(timerId);
  const sec=(performance.now()-session.questionStart)/1000;
  const correct=validAnswers(q).includes(norm(value)),overtime=sec>TARGET[q.part];
  session.records.push({id:q.id,part:q.part,correct,sec,overtime,answer:value,expected:q.answer});
  if(q.part===1){
    [...document.querySelectorAll(".answer")].forEach(b=>{
      const txt=norm(b.textContent.replace(/^[A-D]\.\s*/,""));
      b.disabled=true;
      if(txt===norm(q.answer))b.classList.add("good");
      else if(b===control&&!correct)b.classList.add("bad");
      else b.classList.add("dim");
    });
  }else{
    control.disabled=true;
    control.style.borderColor=correct?"#27925c":"#c74253";
  }
  showFeedback(correct,q.answer,overtime);
  setTimeout(nextQuestion,correct?650:1050);
}
function showFeedback(correct,answer,overtime){
  const f=$("feedback");f.className="feedback "+(correct?"ok":"no")+" show";
  f.innerHTML=(correct?"CORRECT":"NOT QUITE")+"<small>"+(correct?(overtime?"Correct · overtime":"Within target"):"Answer: "+answer)+"</small>";
  setTimeout(()=>f.classList.remove("show"),correct?520:900);
}
function nextQuestion(){
  session.index++;
  if(session.index>=session.items.length)return finish();
  renderQuestion();
}
function finish(){
  clearInterval(timerId);saveLifetime(session.records);screen("resultScreen");
  const n=session.records.length,c=session.records.filter(r=>r.correct).length;
  const avg=session.records.reduce((s,r)=>s+r.sec,0)/Math.max(1,n);
  const over=session.records.filter(r=>r.overtime).length;
  $("scoreResult").textContent=Math.round(c/n*100)+"%";
  $("timeResult").textContent=avg.toFixed(1)+"s";
  $("overResult").textContent=over;
  $("resultSubtitle").textContent=c+" / "+n+" correct · "+labelMode(session.mode);
  renderLifetime();
}
function labelMode(m){
  if(m==="mixed")return"Mixed Practice";
  if(m==="paper")return"Paper Mode";
  return"Part "+m;
}
function loadLifetime(){
  try{return JSON.parse(localStorage.getItem("adaptiveExamStats"))||{};}
  catch(e){return{};}
}
function saveLifetime(records){
  const s=loadLifetime();
  records.forEach(r=>{
    const k="p"+r.part,o=s[k]||{attempts:0,correct:0,totalSec:0,overtime:0};
    o.attempts++;o.correct+=r.correct?1:0;o.totalSec+=r.sec;o.overtime+=r.overtime?1:0;s[k]=o;
  });
  localStorage.setItem("adaptiveExamStats",JSON.stringify(s));
}
function renderLifetime(){
  const s=loadLifetime(),host=$("lifetimeStats");host.innerHTML="";
  [1,2,3,4].forEach(p=>{
    const o=s["p"+p]||{attempts:0,correct:0,totalSec:0};
    const acc=o.attempts?Math.round(o.correct/o.attempts*100):0;
    const avg=o.attempts?(o.totalSec/o.attempts).toFixed(1):"—";
    const d=document.createElement("div");d.className="stat";
    d.innerHTML="<b>"+acc+"%</b><span>PART "+p+" · "+avg+"s AVG</span>";
    host.appendChild(d);
  });
}
document.querySelectorAll(".mode").forEach(b=>b.addEventListener("click",()=>start(b.dataset.part)));
$("againBtn").onclick=()=>start(lastMode);
$("homeBtn").onclick=()=>{screen("startScreen");renderLifetime();};
renderLifetime();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
