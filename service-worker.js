const CACHE='adaptive-exam-v1.2.4-loadfix2';
const CAMBRIDGE_IMAGES=Array.from({length:10},(_,i)=>Array.from({length:4},(_,j)=>`./assets/cambridge/exam-${String(i+1).padStart(2,'0')}-part-${j+1}.webp`)).flat();
const ASSETS=['./','./index.html','./app.js','./data/cambridge-bank.js','./data/engexam-bank.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./adrian-visual-system.js','./adrian-achievements.js','./adaptive-language-dashboard.js',...CAMBRIDGE_IMAGES];
self.addEventListener('install',e=>e.waitUntil(warmCache().then(()=>self.skipWaiting())));
async function warmCache(){
  const c=await caches.open(CACHE);
  await Promise.all(ASSETS.map(async url=>{try{const req=new Request(new URL(url,self.registration.scope),{cache:'reload'});const r=await fetch(req);if(r&&r.ok)await c.put(req,r.clone());}catch(_){}}));
}
async function fetchAndStore(req){
  try{const r=await fetch(req,{cache:'no-cache'});if(r&&r.ok){const c=await caches.open(CACHE);await c.put(req,r.clone());}return r;}catch(_){return null;}
}
function criticalRequest(req,u){return req.mode==='navigate'||/\.(?:html|js|css|json|webmanifest)$/i.test(u.pathname);}
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('adaptive-exam-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
  const fresh=fetchAndStore(e.request);e.waitUntil(fresh.then(()=>{}));
  e.respondWith((async()=>{
    const c=await caches.open(CACHE),critical=criticalRequest(e.request,u);
    if(critical){const r=await fresh;if(r)return r;const hit=await c.match(e.request,{ignoreSearch:true});if(hit)return hit;}
    else{const hit=await c.match(e.request,{ignoreSearch:true});if(hit)return hit;const r=await fresh;if(r)return r;}
    if(e.request.mode==='navigate')return (await c.match('./index.html'))||(await c.match('./'))||Response.error();
    return Response.error();
  })());
});
