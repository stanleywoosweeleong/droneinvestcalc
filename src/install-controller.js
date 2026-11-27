// Keep install visibility in one place so status/language events cannot override it.
export function setupInstallControl({button, window, navigator, showHelp}) {
  const queries = ['standalone', 'minimal-ui', 'window-controls-overlay', 'fullscreen']
    .map(mode => window.matchMedia(`(display-mode: ${mode})`));
  let installedThisSession = false;
  let promptEvent = null;
  const installed = () => installedThisSession || navigator.standalone === true ||
    queries.some(query => query.matches) || navigator.windowControlsOverlay?.visible === true;
  const refresh = () => { button.hidden = installed(); };
  const listeners = [];
  const listen = (target, type, callback) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, callback);
    listeners.push(() => target.removeEventListener(type, callback));
  };
  for (const query of queries) listen(query, 'change', refresh);
  listen(navigator.windowControlsOverlay, 'geometrychange', refresh);
  listen(window, 'pageshow', refresh);
  listen(window, 'appinstalled', () => {
    installedThisSession = true;
    promptEvent = null;
    refresh();
  });
  listen(window, 'beforeinstallprompt', event => {
    event.preventDefault();
    promptEvent = installed() ? null : event;
    refresh();
  });
  listen(button, 'click', async () => {
    if (installed()) { refresh(); return; }
    if (!promptEvent) { showHelp(); return; }
    const pending = promptEvent;
    promptEvent = null;
    try {
      await pending.prompt();
      const choice = await pending.userChoice;
      if (choice?.outcome === 'accepted') installedThisSession = true;
    } catch { if (!installed()) showHelp(); }
    refresh();
  });
  refresh();
  return {refresh, dispose: () => listeners.forEach(remove => remove())};
}
