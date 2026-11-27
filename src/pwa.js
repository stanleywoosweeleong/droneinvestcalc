const manifest = document.querySelector('link[rel="manifest"]');
const root = new URL('./', manifest.href);
const panel = document.createElement('section');
panel.className = 'pwa-panel no-print';
panel.setAttribute('aria-label', 'App installation and offline availability');
panel.innerHTML = '<span id="pwa-status" role="status" aria-live="polite">Preparing offline access…</span><button id="pwa-install" type="button">Install app</button><button id="pwa-update" type="button" hidden>Update available · reload</button>';
document.body.append(panel);
const help = document.createElement('dialog');
help.className = 'pwa-help';
help.innerHTML = '<form method="dialog"><h2>Install DroneInvest</h2><p><strong>iPhone or iPad:</strong> open this page in Safari, tap Share, then Add to Home Screen and Open as Web App if offered.</p><p><strong>Android:</strong> use Chrome’s menu and choose Install app or Add to Home screen.</p><p><strong>Desktop:</strong> use the install icon in the address bar or the browser’s Install app menu.</p><p>Load the app online once to prepare offline use. Plans stay in this browser; export a backup before clearing browsing data.</p><div class="dialog-actions"><button class="button primary">Done</button></div></form>';
document.body.append(help);
const status = panel.querySelector('#pwa-status');
const install = panel.querySelector('#pwa-install');
const update = panel.querySelector('#pwa-update');
let promptEvent, registration, offlineReady = false;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function showStatus() {
  status.textContent = !navigator.onLine ? (offlineReady ? 'Offline · calculator ready' : 'Offline · connect once to enable offline use') : offlineReady ? 'Available offline' : 'Preparing offline access…';
  install.hidden = standalone();
}
window.addEventListener('online', showStatus);
window.addEventListener('offline', showStatus);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); promptEvent = event; install.hidden = false; });
window.addEventListener('appinstalled', () => { promptEvent = null; install.hidden = true; });
install.addEventListener('click', async () => {
  if (!promptEvent) { help.showModal(); return; }
  const pending = promptEvent; promptEvent = null;
  try { await pending.prompt(); await pending.userChoice; } catch { help.showModal(); }
});
update.addEventListener('click', () => {
  if (!registration?.waiting) return;
  update.disabled = true;
  registration.waiting.postMessage({type: 'ACTIVATE_UPDATE'});
});
let hadController = !!navigator.serviceWorker?.controller;
let reloading = false;
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New releases activate only when accepted (including acceptance in another tab).
    if (hadController && !reloading) { reloading = true; window.location.reload(); }
    hadController = true;
    offlineReady = true; showStatus();
  });
  navigator.serviceWorker.register(new URL('sw.js', root), {scope: root.href, updateViaCache: 'none'}).then(async reg => {
    registration = reg;
    const waiting = () => { update.hidden = !reg.waiting; };
    waiting();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') waiting(); });
    });
    await navigator.serviceWorker.ready;
    offlineReady = true; showStatus();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.onLine) reg.update().catch(() => {}); });
  }).catch(() => { status.textContent = 'Offline setup unavailable · calculator still works online'; });
} else status.textContent = 'Offline installation requires a supported browser and HTTPS';
if ('serviceWorker' in navigator && window.isSecureContext) showStatus();
else install.hidden = standalone();
