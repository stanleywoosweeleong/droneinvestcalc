import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function harness(file='sw.js',scope='https://example.test/droneinvestcalc/'){
 const handlers={}, stores=new Map(), deleted=[], requests=[];let skipped=false,claimed=false;
 const caches={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {addAll:async urls=>{urls.forEach(u=>{requests.push(u.url);store.set(u.url,new Response(u.url));});},match:async url=>store.get(url)};},keys:async()=>[...stores.keys()],delete:async key=>{deleted.push(key);return stores.delete(key);}};
 const self={registration:{scope},addEventListener:(type,fn)=>handlers[type]=fn,clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{skipped=true;}};
 vm.runInNewContext(read(file),{self,caches,URL,Request,Response,fetch:async()=>{throw new Error('offline');}});
 return {handlers,stores,deleted,requests,get skipped(){return skipped;},get claimed(){return claimed;},async lifecycle(type){let p;handlers[type]({waitUntil:v=>p=v});await p;},async fetch(url,mode='cors',method='GET'){let p;handlers.fetch({request:{url,mode,method},respondWith:v=>p=v});return p?await p:null;}};
}
for(const prefix of ['', 'dist/'])test('Install manifest and icons resolve at clean root: '+(prefix||'Pages'),()=>{
 const manifest=JSON.parse(read(prefix+'manifest.webmanifest'));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.id,undefined,'no id: "./" resolves to the site root and collides with other apps on the same origin; the default is this app’s own start URL');assert.equal(manifest.display,'standalone');
 for(const size of [192,512])for(const purpose of ['any','maskable']){
  const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`&&i.purpose===purpose);assert.ok(icon);
  const path=new URL('../'+prefix+icon.src,import.meta.url);const bytes=readFileSync(path);assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
 }
});
test('Worker precaches all existing first-party assets, no external requests',async()=>{const h=harness();await h.lifecycle('install');assert.equal(h.skipped,false);assert.ok(h.requests.some(u=>u.endsWith('/src/pwa.js')));for(const u of h.requests){assert.ok(u.startsWith('https://example.test/droneinvestcalc/'));const rel=u.replace('https://example.test/droneinvestcalc/','')||'index.html';assert.ok(existsSync(new URL('../'+rel,import.meta.url)),rel);}assert.ok(h.requests.some(u=>u.endsWith('maskable-512.png')));});
test('Offline calculator and module load from cache without a network',async()=>{const h=harness();await h.lifecycle('install');assert.equal((await h.fetch('https://example.test/droneinvestcalc/','navigate')).status,200);assert.equal((await h.fetch('https://example.test/droneinvestcalc/src/model.js')).status,200);assert.equal((await h.fetch('https://example.test/droneinvestcalc/?plan=a','navigate')).status,200);});
test('Legacy paths return to the clean app URL even offline',async()=>{const h=harness();await h.lifecycle('install');const r=await h.fetch('https://example.test/droneinvestcalc/src/','navigate');assert.equal(r.status,302);assert.equal(r.headers.get('Location'),'https://example.test/droneinvestcalc/');});
test('Unknown/external requests and mutations are not intercepted',async()=>{const h=harness();assert.equal(await h.fetch('https://other.test/'),null);assert.equal(await h.fetch('https://example.test/other-app/','navigate'),null);assert.equal(await h.fetch('https://example.test/droneinvestcalc/api'),null);assert.equal(await h.fetch('https://example.test/droneinvestcalc/','navigate','POST'),null);});
test('Updates require acceptance and remove only this scope’s obsolete caches',async()=>{const h=harness();await h.lifecycle('install');h.stores.set('droneinvest:/droneinvestcalc/:old',new Map());h.stores.set('droneinvest:/other/:old',new Map());h.stores.set('another-app',new Map());h.handlers.message({data:{type:'IGNORED'}});assert.equal(h.skipped,false);h.handlers.message({data:{type:'ACTIVATE_UPDATE'},waitUntil:()=>{}});assert.equal(h.skipped,true);await h.lifecycle('activate');assert.equal(h.claimed,true);assert.deepEqual(h.deleted,['droneinvest:/droneinvestcalc/:old']);});
test('Standalone build uses root assets rather than src paths',async()=>{const h=harness('dist/sw.js','https://app.test/');await h.lifecycle('install');assert.ok(h.requests.includes('https://app.test/app.js'));assert.ok(!h.requests.some(u=>u.includes('/src/')));assert.match(read('dist/index.html'),/href="\.\/manifest.webmanifest"/);});
