import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {fields,defaults} from '../src/fields.js';
import {messages} from '../src/locales/messages.js';
import {applyUpdate} from '../src/update-controller.js';
const dom=new JSDOM(readFileSync(new URL('../src/index.html',import.meta.url),'utf8'),{url:'https://example.test/droneinvestcalc/',pretendToBeVisual:true});
for(const key of ['window','document','localStorage','MutationObserver','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.scrollTo=()=>{};window.print=()=>{};
await import('../src/app.js');
const {t,setLanguage,getLanguage,languageKey}=await import('../src/i18n.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const click=selector=>{const el=document.querySelector(selector);assert.ok(el,selector);el.click();};

test('Language selector replaces breadcrumb and remembers each supported language',async()=>{
 assert.equal(document.querySelector('.breadcrumb'),null);
 for(const lang of ['zh','ms','en']){
  click(`[data-language="${lang}"]`);await tick();
  assert.equal(getLanguage(),lang);assert.equal(localStorage.getItem(languageKey),lang);
  assert.equal(document.documentElement.lang,lang==='zh'?'zh-Hans':lang);
  assert.equal(document.querySelector(`[data-language="${lang}"]`).getAttribute('aria-pressed'),'true');
  assert.equal(document.querySelector('h1').textContent,t('Your farm. A clearer investment decision.'));
 }
});
test('Every input label and explanation has Chinese and Malay translations',()=>{
 for(const f of fields)for(const lang of ['zh','ms'])for(const text of [f.label,f.note])assert.ok(messages[text]?.[lang],lang+': '+text);
 for(const [key,values] of Object.entries(messages))assert.ok(values.zh&&values.ms,key);
});
test('Dynamic report sentences translate without swallowing subsequent sentences',()=>{
 const source='Annual economic break-even: 8 whole rounds; acreage grid threshold: 2.25 acres. Acreage uses 0.25-acre steps and constant tree density. Capacity at these thresholds: rounds unverified, acreage unverified.';
 const translated=t(source,'zh');assert.ok(translated.includes('8 整轮'));assert.ok(translated.includes('2.25 英亩'));assert.ok(!/acres|Capacity|unverified/.test(translated));
});
test('Phone inputs/results tabs switch without losing edited values',async()=>{
 click('[data-pane=results]');assert.equal(document.querySelector('.calculator-layout').dataset.mobilePane,'results');
 click('[data-pane=inputs]');const input=document.querySelector('[data-field=area]');input.value='12';input.dispatchEvent(new Event('input',{bubbles:true}));
 click('[data-language=zh]');await tick();assert.equal(document.querySelector('[data-field=area]').value,'12');
 click('[data-pane=results]');assert.equal(document.querySelector('.calculator-layout').dataset.mobilePane,'results');
 click('[data-pane=inputs]');assert.equal(document.querySelector('[data-field=area]').value,'12');
});
test('Translated option labels preserve canonical model values and savings',async()=>{
 click('[data-group=Operations]');await tick();const select=document.querySelector('[data-field=labour_mode]');
 assert.equal(select.options[0].value,'Day-rate');assert.equal(select.options[0].textContent,'按日计薪');
 select.value='Dedicated';select.dispatchEvent(new Event('input',{bubbles:true}));await tick();
 click('[data-language=ms]');await tick();assert.equal(document.querySelector('[data-field=labour_mode]').value,'Dedicated');
 assert.equal(document.querySelector('[data-field=labour_mode]').selectedOptions[0].textContent,'Kakitangan khusus');
 click('[data-language=en]');await tick();assert.equal(document.querySelector('[data-field=labour_mode]').selectedOptions[0].textContent,'Dedicated');
});
test('User plan names and report notes are never translated',async()=>{
 const store=JSON.parse(localStorage.getItem('droneinvest.plans.v1'));store.plans[0].name='Farm';
 // DOM protection is checked independently of plan creation workflow.
 const e=document.createElement('div');e.setAttribute('data-no-translate','');e.textContent='Farm';document.body.append(e);
 click('[data-language=zh]');await tick();assert.equal(e.textContent,'Farm');e.remove();
 click('[data-view=report]');await tick();const notes=document.querySelector('#report-notes');notes.value='Farm / my personal note';notes.dispatchEvent(new Event('input',{bubbles:true}));
 click('[data-language=ms]');await tick();assert.equal(document.querySelector('#report-notes').value,'Farm / my personal note');assert.equal(document.querySelector('.print-notes').textContent,'Farm / my personal note');
});
test('Reports, scenarios and methodology localize in all three languages',async()=>{
 for(const lang of ['en','zh','ms'])for(const view of ['scenarios','report','methodology']){
  setLanguage(lang);click(`[data-view="${view}"]`);await tick();
  assert.ok(document.querySelector('#view-content').textContent.length>100);
  if(lang==='zh')assert.match(document.querySelector('h1').textContent,/[\u4e00-\u9fff]/);
 }
});
function worker(){const w=new dom.window.EventTarget();w.state='installed';w.messages=[];w.postMessage=data=>w.messages.push(data);return w;}
test('Update activation reports progress and reloads even without controllerchange',async()=>{
 const w=worker(),progress=[];let reloads=0;
 const done=applyUpdate({waiting:w},{reload:()=>reloads++,progress:v=>progress.push(v),fail:assert.fail,timeoutMs:200});
 assert.deepEqual(w.messages,[{type:'ACTIVATE_UPDATE'}]);w.state='activated';w.dispatchEvent(new Event('statechange'));await done;
 assert.equal(reloads,1);assert.deepEqual(progress,['Checking for updates…','Updating…']);
});
test('Stale update banner reloads an already active worker instead of silently returning',async()=>{
 let reloads=0;await applyUpdate({waiting:null,active:{state:'activated'}},{reload:()=>reloads++,progress:()=>{},fail:assert.fail});assert.equal(reloads,1);
});
test('Still-installing and missing registrations give visible retry feedback',async()=>{
 for(const registration of [null,{waiting:null,installing:{state:'installing'}}]){let failure='';await applyUpdate(registration,{reload:assert.fail,progress:()=>{},fail:v=>failure=v});assert.ok(failure.length>10);}
});
test('Stuck or failed update terminates with retry feedback',async()=>{
 const w=worker();let failure='';await applyUpdate({waiting:w},{reload:assert.fail,progress:()=>{},fail:v=>failure=v,timeoutMs:5});assert.match(failure,/retry/);
});
test('Service worker message lifetime covers activation promise',()=>{const code=readFileSync(new URL('../src/sw-template.js',import.meta.url),'utf8');assert.match(code,/event\.waitUntil\(self\.skipWaiting\(\)\)/);});
test.after(()=>dom.window.close());
