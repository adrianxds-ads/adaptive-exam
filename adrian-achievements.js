(()=>{"use strict";
const TIERS=Object.freeze({
  blue:{key:"blue",label:"BLUE MEDAL",short:"BLUE",score:13,color:"#7AA5EC",text:"#B2CBF4"},
  violet:{key:"violet",label:"VIOLET MEDAL",short:"VIOLET",score:14,color:"#BB9EF0",text:"#D8C7F6"},
  gold:{key:"gold",label:"GOLD MEDAL",short:"GOLD",score:15,color:"#E7BF57",text:"#F1DA9E"}
});
function tier(correct,total=15){
  const c=Number(correct),t=Number(total);if(!Number.isFinite(c)||!Number.isFinite(t)||t<=0)return null;
  const r=c/t;if(r>=1-1e-9)return TIERS.gold;if(r>=14/15-1e-9)return TIERS.violet;if(r>=13/15-1e-9)return TIERS.blue;return null;
}
function normalizeCounts(x={}){return{blue:Math.max(0,Number(x.blue)||0),violet:Math.max(0,Number(x.violet)||0),gold:Math.max(0,Number(x.gold)||0)};}
function countsFromHistory(rows=[]){
  const out={blue:0,violet:0,gold:0};
  for(const r of rows||[]){
    const c=Number(r?.correct??r?.score),t=Number(r?.total??15),x=tier(c,t);
    if(x)out[x.key]++;
  }
  return out;
}
function medalStripHtml(counts={},opts={}){
  const c=normalizeCounts(counts),context=opts.context||"summary",compact=opts.compact!==false;
  const items=Object.values(TIERS).map(x=>{const n=c[x.key]||0,earned=n>0;return '<span class="ad-medal-stat '+(earned?"earned ":"locked ")+'ad-medal-stat-'+x.key+'" style="--ach:'+x.color+';--ach-text:'+x.text+'" title="'+x.short+' · '+n+' veces conseguida"><i>'+n+'</i><b>'+x.short+'</b></span>';}).join("");
  return '<div class="ad-medal-strip '+(compact?"compact ":"")+'context-'+context+'" aria-label="Medallas acumuladas">'+items+'</div>';
}
function legendHtml(counts={}){return medalStripHtml(counts,{context:"target",compact:true});}
function badgeHtml(correct,total=15){
  const x=tier(correct,total);if(!x)return"";const eq=15*Number(correct)/Number(total);
  return '<div class="ad-achievement ad-achievement-'+x.key+'" style="--ach:'+x.color+';--ach-text:'+x.text+'"><span class="ad-medal"><i>'+x.score+'</i></span><div><small>ACHIEVEMENT UNLOCKED</small><b>'+x.label+'</b><em>'+Number(correct)+'/'+Number(total)+(Number(total)===15?'':' · '+eq.toFixed(1)+'/15 equivalent')+'</em></div></div>';
}
function play(toneFn,correct,total=15){
  const x=tier(correct,total);if(!x)return false;
  const notes=x.key==="blue"?[523.25,659.25,783.99]:x.key==="violet"?[587.33,739.99,880,1174.66]:[659.25,783.99,1046.5,1318.5,1567.98];
  if(typeof toneFn==="function"){notes.forEach((f,i)=>toneFn(f,i===notes.length-1?.20:.09,x.key==="gold"?.028:.022,i%2?"sine":"triangle",.38+i*.075));return true;}
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;const a=window.__adAchievementAudio||(window.__adAchievementAudio=new AC());if(a.state==="suspended")a.resume();
    notes.forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+.18+i*.075;o.type=i%2?"sine":"triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(x.key==="gold"?.028:.022,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+.16)});return true;
  }catch{return false;}
}
function inject(){
  if(document.getElementById("ad-achievement-style"))return;
  const s=document.createElement("style");s.id="ad-achievement-style";s.textContent=`
.ad-achievement{display:flex;align-items:center;justify-content:center;gap:14px;margin:14px auto;padding:12px 16px;width:min(420px,100%);border:1px solid color-mix(in srgb,var(--ach) 62%,white 10%);border-radius:16px;background:radial-gradient(circle at 18% 50%,color-mix(in srgb,var(--ach) 26%,transparent),transparent 38%),rgba(0,0,0,.18);box-shadow:0 0 28px color-mix(in srgb,var(--ach) 24%,transparent);animation:adMedalPop .65s cubic-bezier(.2,.9,.25,1.2)}
.ad-achievement small,.ad-achievement b,.ad-achievement em{display:block}.ad-achievement small{font-size:10px;font-weight:950;letter-spacing:.12em;color:var(--ach-text)}.ad-achievement b{font-size:20px;line-height:1.1;color:#fff}.ad-achievement em{margin-top:3px;font-size:11px;font-style:normal;font-weight:850;color:#c9d8d0}
.ad-medal{position:relative;display:grid;place-items:center;width:58px;height:58px;flex:0 0 58px;border-radius:50%;border:5px solid var(--ach);background:radial-gradient(circle,#18241d 46%,color-mix(in srgb,var(--ach) 35%,#121915));box-shadow:0 0 22px color-mix(in srgb,var(--ach) 42%,transparent)}.ad-medal:before,.ad-medal:after{content:"";position:absolute;z-index:-1;bottom:-18px;width:18px;height:30px;background:var(--ach);clip-path:polygon(0 0,100% 0,78% 100%,50% 76%,22% 100%)}.ad-medal:before{left:7px;transform:rotate(9deg)}.ad-medal:after{right:7px;transform:rotate(-9deg)}.ad-medal i{font-style:normal;font-size:22px;font-weight:1000;color:var(--ach-text)}
.ad-medal-strip{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin:10px 0 4px}.ad-medal-stat{--dim:.34;position:relative;display:flex;align-items:center;gap:8px;min-width:94px;padding:7px 10px;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:rgba(5,12,9,.24);filter:saturate(.35);opacity:.55;transition:opacity .22s ease,filter .22s ease,border-color .22s ease,box-shadow .22s ease}.ad-medal-stat i{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:50%;border:2px solid color-mix(in srgb,var(--ach) 32%,#5a625e);background:#18201c;color:#89918d;font:1000 13px/1 system-ui,sans-serif}.ad-medal-stat b{font:950 10px/1.05 system-ui,sans-serif;letter-spacing:.07em;color:#87928c}.ad-medal-stat.earned{opacity:1;filter:none;border-color:color-mix(in srgb,var(--ach) 50%,transparent);background:color-mix(in srgb,var(--ach) 10%,rgba(7,14,11,.60));box-shadow:0 0 16px color-mix(in srgb,var(--ach) 16%,transparent)}.ad-medal-stat.earned i{border-color:var(--ach);background:color-mix(in srgb,var(--ach) 20%,#17201b);color:var(--ach-text);box-shadow:0 0 11px color-mix(in srgb,var(--ach) 34%,transparent)}.ad-medal-stat.earned b{color:#edf4ef}
.medal-summary-host{margin:8px 0 14px}.medal-summary-host .ad-medal-strip{gap:11px;margin:10px 0 5px}.medal-summary-host .ad-medal-stat{min-width:112px;padding:9px 12px;gap:9px;border-radius:15px}.medal-summary-host .ad-medal-stat i{width:34px;height:34px;flex-basis:34px;border-width:3px;font-size:15px}.medal-summary-host .ad-medal-stat b{font-size:10.5px}
.mission-overlay .ad-medal-strip{margin-top:15px}.mission-overlay .ad-medal-stat{background:rgba(5,10,8,.42)}
@keyframes adMedalPop{0%{opacity:0;transform:scale(.58) rotate(-5deg)}65%{opacity:1;transform:scale(1.07) rotate(2deg)}100%{transform:scale(1) rotate(0)}}
@media(max-width:520px){.ad-achievement{gap:11px;padding:11px 12px}.ad-medal{width:52px;height:52px;flex-basis:52px}.ad-achievement b{font-size:18px}.ad-medal-strip{gap:6px}.ad-medal-stat{min-width:88px;padding:6px 8px;gap:6px}.ad-medal-stat i{width:28px;height:28px;flex-basis:28px;font-size:12px}.ad-medal-stat b{font-size:8.5px}.medal-summary-host .ad-medal-stat{min-width:98px;padding:8px 9px}.medal-summary-host .ad-medal-stat i{width:31px;height:31px;flex-basis:31px;font-size:14px}}
.level-title-row{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:4px 0 8px}.level-title-row h1{margin:0!important}.level-next-shortcut{min-width:108px;height:46px;padding:0 13px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#eef6f1;font:950 10px/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);transition:transform .12s ease,background .12s ease,border-color .12s ease}.level-next-shortcut:hover,.level-next-shortcut:focus-visible{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.28);outline:none}.level-next-shortcut:active{transform:scale(.97)}@media(max-width:520px){.level-title-row{gap:9px}.level-next-shortcut{min-width:96px;height:42px;padding:0 10px;font-size:9px}}
`;document.head.appendChild(s);
}
inject();
window.AdrianAchievements=Object.freeze({tier,badgeHtml,legendHtml,medalStripHtml,countsFromHistory,play,tiers:TIERS});
})();