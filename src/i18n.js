import {messages} from './locales/messages.js';
export const languageKey = 'droneinvest.language.v1';
export const languages = ['en','zh','ms'];
let language='en';
try { const saved=globalThis.localStorage?.getItem(languageKey);if(languages.includes(saved))language=saved; } catch {}
export function getLanguage(){return language;}
export function getLocale(){return {en:'en-MY',zh:'zh-MY',ms:'ms-MY'}[language];}
const patterns=Object.entries(messages).filter(([key])=>key.includes('{')).sort(([a],[b])=>b.replace(/\{\w+\}/g,'').length-a.replace(/\{\w+\}/g,'').length).map(([key,value])=>{
 const names=[];const regex=key.split(/(\{\w+\})/g).map(part=>{
  if(/^\{\w+\}$/.test(part)){names.push(part.slice(1,-1));return '((?:(?![.!?]\\s).)+?)';}
  return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 }).join('');return {regex:new RegExp('^'+regex+'$'),names,value};
});
export function t(source, lang=language){
 if(!source||lang==='en')return source;
 const text=String(source).trim();let translated=messages[text]?.[lang];
 if(!translated)for(const pattern of patterns){const match=text.match(pattern.regex);if(match){const vars=Object.fromEntries(pattern.names.map((name,i)=>[name,match[i+1]]));translated=pattern.value[lang].replace(/\{(\w+)\}/g,(_,key)=>t(vars[key],lang));break;}}
 if(!translated){const parts=text.split(/(?<=[.!?])\s+/);if(parts.length>1)translated=parts.map(part=>t(part,lang)).join(' ');}
 return translated?String(source).replace(text,translated):source;
}
const originals=new WeakMap();
function localValue(node,key,value){
 let memo=originals.get(node);if(!memo){memo={};originals.set(node,memo);}
 const old=memo[key];const source=old&&value===old.output?old.source:value;
 const output=t(source);memo[key]={source,output};return output;
}
export function localize(root=document.body){
 if(!root)return;
 const skip=node=>node.parentElement?.closest('[data-no-translate],script,style,textarea,#plan-select,.brand,.print-notes');
 const walker=document.createTreeWalker(root,4);let node;
 while((node=walker.nextNode()))if(node.nodeValue.trim()&&!skip(node)){
  // Preserve the original option values independently of translated labels.
  if(node.parentElement?.tagName==='OPTION'&&!node.parentElement.hasAttribute('value'))node.parentElement.setAttribute('value',node.parentElement.textContent);
  const output=localValue(node,'text',node.nodeValue);if(node.nodeValue!==output)node.nodeValue=output;
 }
 for(const el of [root,...root.querySelectorAll('[placeholder],[aria-label],[title]')]){
  if(!el.getAttribute||el.closest('[data-no-translate]'))continue;
  for(const key of ['placeholder','aria-label','title']){const v=el.getAttribute(key);if(v){const output=localValue(el,key,v);if(output!==v)el.setAttribute(key,output);}}
 }
}
export function setLanguage(next){
 if(!languages.includes(next))return;
 language=next;try{globalThis.localStorage?.setItem(languageKey,next);}catch{}
 if(globalThis.document){document.documentElement.lang=next==='zh'?'zh-Hans':next;document.dispatchEvent(new CustomEvent('languagechange',{detail:next}));}
}
export function languageSwitch(){return `<div class="language-switch" role="group" aria-label="Language / 语言 / Bahasa" data-no-translate>${[['en','EN','English'],['zh','中文','中文'],['ms','BM','Bahasa Melayu']].map(([code,label,name])=>`<button type="button" data-language="${code}" lang="${code==='zh'?'zh-Hans':code}" aria-label="${name}" title="${name}" aria-pressed="${language===code}">${label}</button>`).join('')}</div>`;}
export function observeTranslations(){
 document.documentElement.lang=language==='zh'?'zh-Hans':language;
 const observer=new MutationObserver(()=>{observer.disconnect();localize();observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});});
 localize();observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});return observer;
}
