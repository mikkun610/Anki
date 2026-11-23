const CACHE='anki-v1-2';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./decks/index.json'];
const APP_MARK='<meta name="anki-app"';
const scope=()=>new URL(self.registration.scope);
const coreUrls=CORE.map(p=>new URL(p,self.registration.scope).href);
function isHtml(response){return (response.headers.get('content-type')||'').includes('text/html')}
// Cache the app shell, deck list, every deck file and the images the decks use.
function isCached(url){const base=scope().pathname;return coreUrls.some(u=>new URL(u).pathname===url.pathname)||url.pathname.startsWith(base+'decks/')||url.pathname.startsWith(base+'icons/')}
async function okToCache(response){
 if(!response.ok||response.redirected)return false;
 return !isHtml(response)||(await response.clone().text()).includes(APP_MARK);
}
async function refresh(request){
 const response=await fetch(request);
 if(await okToCache(response))await (await caches.open(CACHE)).put(request,response.clone());
 return response;
}
function deckAssets(deck){
 const imageKeys=(deck.fields||[]).filter(f=>f.type==='image').map(f=>f.key),out=new Set();
 for(const card of deck.cards||[])for(const k of imageKeys){const v=card[k];if(typeof v==='string'&&v&&!v.startsWith('data:')&&!/^[a-z]+:/i.test(v))out.add(v)}
 return [...out];
}
async function put(cache,path,required){
 const request=new Request(new URL(path,self.registration.scope),{cache:'reload'});
 try{const response=await fetch(request);if(!(await okToCache(response)))throw Error('bad response: '+path);await cache.put(request,response.clone());return response}
 catch(error){if(required)throw error;return null}
}
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const [,,,,,list]=await Promise.all(CORE.map(p=>put(cache,p,true)));
 const decks=(await list.json()).decks||[];
 await Promise.all(decks.map(async d=>{
  const response=await put(cache,'./decks/'+d.file,true);
  const deck=await response.json();
  await Promise.all(deckAssets(deck).map(p=>put(cache,'./'+p.replace(/^\.\//,''),false)));
 }));
 await self.skipWaiting();
})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('kanbun-memorize-')||k.startsWith('anki-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||!isCached(url))return;
 // Local copy first. Refresh it in the background without reloading the screen.
 const network=refresh(e.request);e.waitUntil(network.then(()=>{},()=>{}));
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(e.request,{ignoreSearch:true});
  if(cached)return cached;
  try{return await network}catch(error){if(e.request.mode==='navigate'){const home=await cache.match('./index.html');if(home)return home}throw error}
 })());
});
