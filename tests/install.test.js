import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupInstallControl} from '../src/install-controller.js';
function fixture(mode='browser',ios=false){
 const dom=new JSDOM('<button id="install" hidden>Install</button>');
 const {window}=dom;const media=new Map();
 window.matchMedia=query=>{const q=new window.EventTarget();q.matches=query===`(display-mode: ${mode})`;media.set(query,q);return q;};
 const nav={standalone:ios};const button=window.document.querySelector('button');let helpCount=0;
 const control=setupInstallControl({button,window,navigator:nav,showHelp:()=>helpCount++});
 const prompt=()=>{const e=new window.Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e);return e;};
 return {window,button,media,control,prompt,get helpCount(){return helpCount;},close(){control.dispose();window.close();}};
}
for(const mode of ['standalone','minimal-ui','window-controls-overlay','fullscreen'])test(`Install button stays hidden in ${mode}`,()=>{
 const f=fixture(mode);assert.equal(f.button.hidden,true);f.prompt();f.control.refresh();assert.equal(f.button.hidden,true);f.button.click();assert.equal(f.helpCount,0);f.close();
});
test('iOS installed mode hides the button',()=>{const f=fixture('browser',true);assert.equal(f.button.hidden,true);f.close();});
test('Installation in a browser tab remains hidden after status refreshes and late prompts',()=>{
 const f=fixture();assert.equal(f.button.hidden,false);f.window.dispatchEvent(new f.window.Event('appinstalled'));f.control.refresh();f.prompt();assert.equal(f.button.hidden,true);f.close();
});
test('Display mode transition immediately updates visibility',()=>{
 const f=fixture();const q=f.media.get('(display-mode: standalone)');q.matches=true;q.dispatchEvent(new f.window.Event('change'));assert.equal(f.button.hidden,true);q.matches=false;q.dispatchEvent(new f.window.Event('change'));assert.equal(f.button.hidden,false);f.close();
});
test('Uninstalled browsers retain guidance and native install support',async()=>{
 const f=fixture();f.button.click();assert.equal(f.helpCount,1);f.prompt();f.button.click();await new Promise(r=>setTimeout(r,0));assert.equal(f.button.hidden,true);f.control.refresh();assert.equal(f.button.hidden,true);f.close();
});
