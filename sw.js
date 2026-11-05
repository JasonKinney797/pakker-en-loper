/* Pakker En Loper: bewaart het spel op je toestel. Eerst het net (dan heb je altijd de nieuwste versie), zonder net uit de opslag. */
const CACHE='pel-53c9e88354';
const ASSETS=["./", "index.html", "manifest.webmanifest", "css/style.css", "js/01-regels.js", "js/02-computer-plannen.js", "js/03-computer-gedrag.js", "js/04-bevelen-rollen.js", "js/05-simulatie.js", "js/06-tekenen.js", "js/07-invoer.js", "js/08-scherm.js", "js/09-geluid.js", "js/10-unit-possession.js", "js/11-statistieken.js", "js/12-online.js", "js/13-oefenen.js", "js/14-mobiel.js", "js/15-nieuwe-look.js", "js/16-god-mode.js", "js/17-lus.js", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/icon.svg"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  const same=u.origin===location.origin,cdn=/peerjs|fonts\.(googleapis|gstatic)\.com/.test(u.href);
  if(!same&&!cdn)return;
  e.respondWith(fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):undefined))));
});
