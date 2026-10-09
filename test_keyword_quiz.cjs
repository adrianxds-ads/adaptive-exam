'use strict';
const {spawn}=require('child_process'),assert=require('assert'),path=require('path');
const port=9379,edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profile=path.join(process.env.TEMP||'C:\\Temp','keyword-quiz-acceptance-'+process.pid);
const online=process.argv.includes('--online');
const url=online?'https://adrianxds-ads.github.io/adaptive-exam/keyword-quiz.html?probe=20261009':'file:///C:/Users/adria/adaptive-exam/keyword-quiz.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let browser,ws;
(async()=>{
 browser=spawn(edge,['--headless','--disable-gpu','--disable-extensions','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'--window-size=390,844',url],{stdio:'ignore'});
 let page;
 for(let i=0;i<120;i++){try{const resp=await fetch('http://127.0.0.1:'+port+'/json/list');page=(await resp.json()).find(p=>p.type==='page'&&p.webSocketDebuggerUrl);if(page)break;}catch{}await sleep(200);}
 assert(page,'Cannot start Edge debugging');ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let sid=0;const waiting=new Map();
 ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data),p=waiting.get(m.id);if(!p)return;waiting.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sid;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(waiting.has(id)){waiting.delete(id);reject(Error('CDP timeout '+method));}},20000);});
 const run=async exp=>{const r=await send('Runtime.evaluate',{expression:exp,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 for(let i=0;i<100;i++){if(await run('!!window.KeywordQuizPilot'))break;await sleep(180);}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const initial=await run('(()=>{const a=window.KeywordQuizPilot.bank;const valid=a.every(q=>q.distractors.length===5&&[q.correct,...q.distractors].every(t=>t.trim().split(/\\s+/).length>=2&&t.trim().split(/\\s+/).length<=5&&t.trim().split(/\\s+/).some(s=>s.toUpperCase()===q.keyword)));return {length:a.length,valid,unique:new Set(a.map(q=>q.id)).size,label:document.querySelector("#kqBankLabel").textContent,keyboard:!!document.querySelector(".ad-keyboard"),oldStorage:localStorage.getItem("cambridgeB2ExerciseStatsV3")}})()');
 assert(initial.length===24&&initial.valid&&initial.unique===24,'Invalid card bank '+JSON.stringify(initial));
 await run('document.querySelector("#kqStart").click();true');
 const reading=await run('({visible:!document.querySelector("#kqPlay").classList.contains("hidden"),hidden:document.querySelector("#kqChoices").classList.contains("hidden"),clock:document.querySelector("#kqSeconds").textContent,word:document.querySelector("#kqKeyword").textContent})');
 assert(reading.visible&&reading.hidden&&reading.clock==='…','Read first malfunction '+JSON.stringify(reading));
 await run('document.querySelector("#kqReveal").click();true');
 const initialRound=await run('(()=>{const q=window.KeywordQuizPilot.bank.find(x=>x.id===window.KeywordQuizPilot.status.questionId),word=x=>x.toUpperCase().trim().split(/\\s+/).findIndex(w=>w===q.keyword),positions=[...document.querySelectorAll(".kq-choice span")].map(b=>word(b.textContent)),canMove=q.distractors.some(x=>word(x)!==word(q.correct));return {count:positions.length,positions,canMove,visible:!document.querySelector("#kqChoices").classList.contains("hidden"),clock:document.querySelector("#kqSeconds").textContent,overflow:document.documentElement.scrollWidth-innerWidth,mode:window.KeywordQuizPilot.status.mode,noTricky:document.querySelectorAll("[name=kqDifficulty]").length===0}})()');
 assert(initialRound.count===4&&initialRound.visible&&Number(initialRound.clock)<=15&&initialRound.overflow<=1&&initialRound.mode==="normal"&&initialRound.noTricky,'Four-option mode malfunction '+JSON.stringify(initialRound));
 if(initialRound.canMove)assert(new Set(initialRound.positions).size>=2,'Keyword position did not vary '+JSON.stringify(initialRound));
 const first=await run('(()=>{const st=window.KeywordQuizPilot;const current=st.bank.find(q=>q.id===st.status.questionId),buttons=[...document.querySelectorAll(".kq-choice")],b=buttons.find(x=>x.querySelector("span")?.textContent.trim()===current.correct);if(!b)throw Error("Correct missing");b.click();return {attempts:JSON.parse(localStorage.getItem("cambridgeKeywordQuizPilotV1")).attempts.length,inline:document.querySelector("#kqSecond").textContent,original:current.correct,feedback:document.querySelector("#kqFeedback").textContent,legacy:localStorage.getItem("cambridgeB2ExerciseStatsV3")}})()');
 assert(first.attempts===1&&first.inline.includes(first.original),'Answer failed '+JSON.stringify(first));
 await sleep(1750);
 const advanced=await run('({position:document.querySelector("#kqPosition").textContent,attempts:window.KeywordQuizPilot.status.attempts})');
 assert(advanced.position.startsWith('2 /')&&advanced.attempts===1,'Auto advance failed '+JSON.stringify(advanced));
 await run('document.querySelector("#kqQuit").click();document.querySelector("#kqReadFirst").click();document.querySelector("#kqStart").click();true');
 const normal=await run('({count:document.querySelectorAll(".kq-choice").length,clock:document.querySelector("#kqSeconds").textContent,mode:window.KeywordQuizPilot.status.mode,readFirst:window.KeywordQuizPilot.status.readFirst,overflow:document.documentElement.scrollWidth-innerWidth,stored:window.KeywordQuizPilot.status.attempts})');
 assert(normal.count===4&&normal.mode==='normal'&&normal.readFirst===false&&Number(normal.clock)<=15&&normal.stored===1&&normal.overflow<=1,'Normal malfunction '+JSON.stringify(normal));
 // Complete the entire round: answers, automatic transitions, medals and persisted session.
 for(let i=0;i<15;i++){
  const check=await run('(()=>{const st=window.KeywordQuizPilot;const q=st.bank.find(x=>x.id===st.status.questionId);const b=[...document.querySelectorAll(".kq-choice")].find(x=>x.querySelector("span")?.textContent.trim()===q.correct);if(!b)throw Error("Correct option missing on question "+st.status.questionId);b.click();return document.querySelector("#kqSecond").textContent.includes(q.correct)})()');
  assert(check,'Correct answer not shown inline at step '+i);
  await sleep(1750);
 }
 const finished=await run('(()=>{const db=JSON.parse(localStorage.getItem("cambridgeKeywordQuizPilotV1"));return {visible:!document.querySelector("#kqFinish").classList.contains("hidden"),title:document.querySelector("#kqFinishTitle").textContent,total:db.attempts.length,sessions:db.sessions.length,correct:db.sessions.at(-1).correct,medal:document.querySelector("#kqMedals").textContent}})()');
 assert(finished.visible&&finished.title==="15 / 15 correctas"&&finished.total===16&&finished.sessions===1&&finished.correct===15,'Full round malfunction '+JSON.stringify(finished));
 // Existing tricky preferences must migrate to the four-option game without deleting history.
 await run('localStorage.setItem("cambridgeKeywordQuizPreferencesV1",JSON.stringify({difficulty:"tricky",readFirst:true}));true');
 await send('Page.reload',{ignoreCache:true});
 for(let i=0;i<60;i++){if(await run('!!window.KeywordQuizPilot && !!document.querySelector("#kqHomeStats")'))break;await sleep(160);}
 const preserved=await run('({mode:window.KeywordQuizPilot.status.mode,attempts:window.KeywordQuizPilot.status.attempts,sessions:window.KeywordQuizPilot.status.sessions,optionsAvailable:document.querySelectorAll("[name=kqDifficulty]").length})');
 assert(preserved.mode==="normal"&&preserved.attempts===16&&preserved.sessions===1&&preserved.optionsAvailable===0,'Progress or preferences migration failed '+JSON.stringify(preserved));
 console.log(JSON.stringify({result:'PASS',initial,reading,initialRound,first,advanced,normal,finished,preserved}));
 await send('Browser.close');
})().catch(e=>{console.error('FAIL',e.stack||e);process.exitCode=1;}).finally(()=>{try{ws?.close();}catch{}try{browser?.kill();}catch{}setTimeout(()=>process.exit(),600);});
