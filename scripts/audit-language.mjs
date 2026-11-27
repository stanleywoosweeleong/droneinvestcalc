import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM(readFileSync('src/index.html','utf8'),{url:'https://example.test/droneinvestcalc/',pretendToBeVisual:true});
for(const key of ['window','document','localStorage','MutationObserver','CustomEvent','Event'])globalThis[key]=dom.window[key];
window.scrollTo=()=>{};window.print=()=>{};
await import('../src/app.js');
const {t,setLanguage}=await import('../src/i18n.js');
const {fields}=await import('../src/fields.js');
const seen=new Set();
function collect(){const walker=document.createTreeWalker(document.body,4);let n;while((n=walker.nextNode())){if(n.parentElement.closest('[data-no-translate],script,style,textarea,#plan-select,.brand,.print-notes,svg'))continue;const s=n.textContent.trim();if(/[A-Za-z]{4}/.test(s)&&true&&!/^(RM|MYR|DroneInvest \/)/.test(s))seen.add(s);}}
const tick=()=>new Promise(r=>setTimeout(r,0));
setLanguage('zh');await tick();collect();
for(const group of ['Farm','Equipment','Operations','Other costs']){document.querySelector(`[data-group="${group}"]`).click();const adv=document.querySelector('[data-action=advanced]');if(adv.getAttribute('aria-expanded')==='false')adv.click();await tick();collect();}
for(const view of ['scenarios','report','methodology']){document.querySelector(`[data-view="${view}"]`).click();await tick();collect();}
console.log([...seen].join('\n'));
setLanguage('zh');await tick();console.log('Chinese heading:',document.querySelector('h1').textContent);
dom.window.close();
