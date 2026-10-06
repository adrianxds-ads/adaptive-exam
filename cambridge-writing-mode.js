(function(){
'use strict';
const INPUT='#paperHost input[data-n][data-ad-keyboard]';
let active=null,keyboardWasOpen=false,timers=[];
function clearTimers(){timers.forEach(clearTimeout);timers=[];}
function headerBottom(){const h=document.querySelector('#paperScreen:not(.hidden) .paper-head');return h?h.getBoundingClientRect().bottom:0;}
function keyboardTop(){const k=document.querySelector('.ad-keyboard.open');return k?Math.min(innerHeight,k.getBoundingClientRect().top):(window.visualViewport?.height||innerHeight);}
function contextFor(el){return el.closest('.transform')||el.closest('.worksheet-row')||el.closest('.scan-answer-row')||el.closest('.gap-wrap')||el;}
function positionActive(smooth=false){
  if(!active||!document.body.classList.contains('cambridge-writing')||!document.contains(active))return;
  const top=headerBottom()+8,bottom=keyboardTop()-10,available=bottom-top;
  if(available<120)return;
  const ctx=contextFor(active),cr=ctx.getBoundingClientRect(),ir=active.getBoundingClientRect();
  let delta=0;
  if(ctx.classList.contains('transform')&&cr.height<=available-14){
    const targetTop=top+Math.max(4,(available-cr.height)/2);delta=cr.top-targetTop;
  }else if((ctx.classList.contains('worksheet-row')||ctx.classList.contains('scan-answer-row'))&&cr.height<=available*.72){
    delta=((cr.top+cr.bottom)/2)-(top+available*.5);
  }else{
    delta=((ir.top+ir.bottom)/2)-(top+available*.52);
  }
  if(Math.abs(delta)>2)window.scrollBy({top:delta,left:0,behavior:smooth?'smooth':'auto'});
}
function settle(smooth=false){
  clearTimers();requestAnimationFrame(()=>positionActive(false));
  [90,190,330].forEach((ms,i)=>timers.push(setTimeout(()=>positionActive(smooth&&i===0),ms)));
}
function enter(el){active=el;keyboardWasOpen=document.body.classList.contains('ad-keyboard-open');document.body.classList.add('cambridge-writing');settle(false);}
function exit(){clearTimers();document.body.classList.remove('cambridge-writing');active=null;keyboardWasOpen=false;}
document.addEventListener('focusin',e=>{if(e.target?.matches?.(INPUT))enter(e.target);});
document.addEventListener('input',e=>{if(e.target===active)settle(false);});
new MutationObserver(()=>{
  const open=document.body.classList.contains('ad-keyboard-open');
  if(open){keyboardWasOpen=true;if(active)settle(false);}
  else if(keyboardWasOpen&&document.body.classList.contains('cambridge-writing'))exit();
}).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>active&&settle(false));
window.visualViewport?.addEventListener('resize',()=>active&&settle(false));
window.CambridgeWritingMode={
  settle:()=>settle(false),
  focus(el){if(!el)return;enter(el);el.focus({preventScroll:true});window.AdrianKeyboard?.open?.(el);settle(false);},
  close:exit
};
})();