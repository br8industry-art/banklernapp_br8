const V='bank-lern-v3',FILES=['./','index.html','style.css','app.js','content-lp1.js','cards-lp1.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&e.request.url.startsWith(self.location.origin)){const c=res.clone();caches.open(V).then(x=>x.put(e.request,c))}return res}).catch(()=>caches.match('index.html'))))});
