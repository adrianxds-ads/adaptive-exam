const CACHE='adaptive-exam-v1.2.4-loadfix1';
const CAMBRIDGE_IMAGES=Array.from({length:10},(_,i)=>Array.from({length:4},(_,j)=>`./assets/cambridge/exam-${String(i+1).padStart(2,'0')}-part-${j+1}.webp`)).flat();
const ASSETS=['./','./index.html','./app.js','./data/cambridge-bank.js','./data/engexam-bank.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./adrian-visual-system.js','./adrian-achievements.js','./adaptive-language-dashboard.js',...CAMBRIDGE_IMAGES];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('adaptive-exam-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
  const update=fetch(e.request,{cache:'no-store'}).then(async r=>{if(r&&r.ok){const c=await caches.open(CACHE);await c.put(e.request,r.clone());}return r;}).catch(()=>null);
  e.waitUntil(update.then(()=>{}));
  e.respondWith((async()=>{
    const c=await caches.open(CACHE),hit=await c.match(e.request,{ignoreSearch:true});
    if(hit)return hit;
    const fresh=await update;if(fresh)return fresh;
    if(e.request.mode==='navigate')return (await c.match('./index.html'))||(await c.match('./'))||Response.error();
    return Response.error();
  })());
});
