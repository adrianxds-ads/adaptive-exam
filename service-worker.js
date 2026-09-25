const CACHE='adaptive-exam-v1.0.0-complete-bank';
const CAMBRIDGE_IMAGES=Array.from({length:10},(_,i)=>Array.from({length:4},(_,j)=>`./assets/cambridge/exam-${String(i+1).padStart(2,'0')}-part-${j+1}.webp`)).flat();
const ASSETS=['./','./index.html','./app.js','./data/cambridge-bank.js','./data/engexam-bank.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./adrian-visual-system.js',...CAMBRIDGE_IMAGES];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('adaptive-exam-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true})));});
