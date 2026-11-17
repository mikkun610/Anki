const CACHE='kanbun-memorize-v1-17';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
const urls=CORE.map(p=>new URL(p,self.registration.scope).href);
function isAppHtml(response){return response.ok&&!response.redirected&&(response.headers.get('content-type')||'').includes('text/html')}
async function refresh(request){
 const response=await fetch(request);
 if(response.ok&&!response.redirected){
  const html=(response.headers.get('content-type')||'').includes('text/html');
  if(!html||(await response.clone().text()).includes('<script id="seed"')){
   const cache=await caches.open(CACHE);await cache.put(request,response.clone());
  }
 }
 return response;
}
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.all(CORE.map(async p=>{
  const request=new Request(new URL(p,self.registration.scope),{cache:'reload'}),response=await fetch(request);
  if(!response.ok||response.redirected)throw Error('App download failed');
  if((p==='./'||p==='./index.html')&&(!isAppHtml(response)||!(await response.clone().text()).includes('<script id="seed"')))throw Error('App HTML unavailable');
  await cache.put(request,response);
 }));await self.skipWaiting();
})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kanbun-memorize-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||!urls.some(u=>new URL(u).pathname===url.pathname))return;
 // Local app first. Refresh the cached copy in the background without reloading the screen.
 const network=refresh(e.request);e.waitUntil(network.then(()=>{},()=>{}));
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(e.request,{ignoreSearch:true});
  if(cached)return cached;
  try{return await network}catch(error){if(e.request.mode==='navigate'){const home=await cache.match('./index.html');if(home)return home}throw error}
 })());
});
