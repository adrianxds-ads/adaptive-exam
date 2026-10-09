'use strict';
const {spawn}=require('child_process');
const assert=require('assert');
const port=9378;
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profile=(process.env.TEMP||'C:\\Temp')+'\\cambridge-guide-test-'+process.pid;
const online=process.argv.includes('--online');
const url=(online?'https://adrianxds-ads.github.io/adaptive-exam/cambridge-quiz.html':'file:///C:/Users/adria/adaptive-exam/cambridge-quiz.html')+'?part=3&test=20261009-base';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser,ws;
(async()=>{
 browser=spawn(edge,['--headless','--disable-gpu','--disable-extensions','--no-first-run','--allow-file-access-from-files','--remote-debugging-port='+port,'--user-data-dir='+profile,'--window-size=390,844',url],{stdio:'ignore'});
 let page;
 for(let i=0;i<120;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');const pages=await r.json();page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);if(page)break;}catch{}await sleep(200);}
 assert(page,'Edge CDP unavailable');
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 const requests=new Map();let serial=0;
 ws.addEventListener('message',e=>{const a=JSON.parse(e.data),p=requests.get(a.id);if(!p)return;requests.delete(a.id);a.error?p.reject(Error(a.error.message)):p.resolve(a.result);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(requests.has(id)){requests.delete(id);reject(Error('Timeout '+method));}},16000);});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result?.value;};
 for(let i=0;i<130;i++){if(await ev('!!window.CambridgeQuizDebug && !!document.querySelector("#quizInput")'))break;await sleep(180);}
 assert(await ev('!!document.querySelector("#quizInput")'),'Question did not load '+url);
 const outcomes=[];
 for(const [width,height] of [[390,844],[390,700],[430,932],[360,640],[390,600]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await ev('(()=>{window.AdrianKeyboard?.close?.();window.scrollTo(0,0);document.querySelector("#quizInput").focus();return true;})()');
  await sleep(670);
  const v=await ev('(()=>{const b=document.querySelector("#quizBase"),t=document.querySelector("#quizContext"),i=document.querySelector("#quizInput"),k=document.querySelector(".ad-keyboard.open"),a=document.querySelector("#submitQuiz"),rc=x=>{const r=x.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right)}};return {screen:[innerWidth,innerHeight],word:b.textContent,wordVisible:!b.classList.contains("hidden"),beforePassage:!!(b.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING),root:rc(b),input:rc(i),keyboard:k?rc(k):null,submit:rc(a),scrollY:Math.round(scrollY),focussed:document.activeElement===i}})()');
  outcomes.push(v);
  assert(v.wordVisible&&v.beforePassage,'Base not above passage: '+JSON.stringify(v));
  assert(v.keyboard,'Keyboard did not open: '+JSON.stringify(v));
  assert(v.root.top>=-1&&v.root.bottom<v.keyboard.top-5,'Yellow guide obscured by keyboard: '+JSON.stringify(v));
  assert(v.input.bottom<v.submit.top+2,'Answer obscured by submit control: '+JSON.stringify(v));
 }
 const typed=await ev('(()=>{const i=document.querySelector("#quizInput");i.value="DISCOVERIES";i.dispatchEvent(new Event("input",{bubbles:true}));return {input:i.value,root:document.querySelector("#quizBase").textContent,keyboard:!!document.querySelector(".ad-keyboard.open"),progressKey:"cambridgeB2ExerciseStatsV3"}})()');
 await sleep(250);
 const afterTyping=await ev('(()=>{const a=document.querySelector("#quizBase").getBoundingClientRect(),k=document.querySelector(".ad-keyboard.open").getBoundingClientRect();return {top:a.top,bottom:a.bottom,keyboardTop:k.top}})()');
 assert(typed.input==="DISCOVERIES" && typed.root==="DISCOVER" && typed.keyboard && afterTyping.bottom<afterTyping.keyboardTop-5,'Word guide disappeared after typing');
 console.log(JSON.stringify({result:'PASS',online,outcomes,typed,afterTyping}));
 await send('Browser.close');
})().catch(e=>{console.error('FAIL',e.stack||e);process.exitCode=1;}).finally(()=>{try{ws?.close();}catch{}try{browser?.kill();}catch{}setTimeout(()=>process.exit(),700);});
