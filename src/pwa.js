import {setupInstallControl} from './install-controller.js';
import {t,localize} from './i18n.js';
import {applyUpdate} from './update-controller.js';
const manifest = document.querySelector('link[rel="manifest"]');
const root = new URL('./', manifest.href);
const panel = document.createElement('section');
panel.className = 'pwa-panel no-print';
panel.setAttribute('aria-label', 'App installation and offline availability');
panel.innerHTML = '<span id="pwa-status" role="status" aria-live="polite">Preparing offline access…</span><button id="pwa-install" type="button" hidden>Install app</button><button id="pwa-update" type="button" hidden>Update available · reload</button>';
document.body.append(panel);
const help = document.createElement('dialog');
help.className = 'pwa-help';
help.innerHTML = '<form method="dialog"><h2>Install DroneInvest</h2><p><strong>iPhone or iPad:</strong> open this page in Safari, tap Share, then Add to Home Screen and Open as Web App if offered.</p><p><strong>Android:</strong> use Chrome’s menu and choose Install app or Add to Home screen.</p><p><strong>Desktop:</strong> use the install icon in the address bar or the browser’s Install app menu.</p><p>Load the app online once to prepare offline use. Plans stay in this browser; export a backup before clearing browsing data.</p><div class="dialog-actions"><button class="button primary">Done</button></div></form>';
document.body.append(help);
const status = panel.querySelector('#pwa-status');
const install = panel.querySelector('#pwa-install');
const update = panel.querySelector('#pwa-update');
let registration, offlineReady = false;
const installControl = setupInstallControl({button:install, window, navigator, showHelp:()=>help.showModal()});
function showStatus() {
  status.textContent = !navigator.onLine ? (offlineReady ? 'Offline · calculator ready' : 'Offline · connect once to enable offline use') : offlineReady ? 'Available offline' : 'Preparing offline access…';
  installControl.refresh();
}
window.addEventListener('online', showStatus);
window.addEventListener('offline', showStatus);
let updating=false;
function reloadOnce(){if(reloading)return;reloading=true;window.location.reload();}
function refreshWaiting(){
  if(updating)return;
  const waiting=!!registration?.waiting;
  update.hidden=!waiting;
  update.disabled=false;
  update.textContent=t('Update available · reload');
}
update.addEventListener('click', async () => {
  if(updating)return;
  updating=true; update.disabled=true;
  // Refresh registration: the worker referenced by the banner may have activated elsewhere.
  try {
    const current=await navigator.serviceWorker.getRegistration(root.href);
    registration=current||registration;
    await applyUpdate(registration,{
      reload:reloadOnce,
      progress:message=>{update.textContent=t(message);status.textContent=t(message);},
      fail:message=>{status.textContent=t(message);update.disabled=false;update.textContent=t('Update available · reload');},
    });
  } catch {status.textContent=t('Update could not finish. Your plans are saved; please retry.');update.disabled=false;}
  finally{updating=false;}
});
let hadController = !!navigator.serviceWorker?.controller;
let reloading = false;
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New releases activate only when accepted (including acceptance in another tab).
    if (hadController && !reloading) reloadOnce();
    hadController = true;
    offlineReady = true; showStatus();
  });
  navigator.serviceWorker.register(new URL('sw.js', root), {scope: root.href, updateViaCache: 'none'}).then(async reg => {
    registration = reg;
    const waiting = refreshWaiting;
    waiting();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => { if (['installed','activated','redundant'].includes(worker.state)) waiting(); });
    });
    await navigator.serviceWorker.ready;
    offlineReady = true; showStatus();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.onLine) reg.update().catch(() => {}); });
  }).catch(() => { status.textContent = 'Offline setup unavailable · calculator still works online'; });
} else status.textContent = 'Offline installation requires a supported browser and HTTPS';
if ('serviceWorker' in navigator && window.isSecureContext) showStatus();
else installControl.refresh();

document.addEventListener('languagechange',()=>{showStatus();refreshWaiting();localize(panel);localize(help);});
localize(panel);localize(help);
