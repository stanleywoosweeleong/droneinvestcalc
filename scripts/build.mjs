import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
await cp('src', 'dist', {recursive:true});
await rm('dist/sw-template.js');
const html = await readFile('src/index.html','utf8');
await writeFile('index.html', html.replace('<head>', '<head><base href="./src/">'));
await writeFile('dist/index.html', html.replace('../manifest.webmanifest','./manifest.webmanifest'));
const manifest = JSON.parse(await readFile('src/manifest.webmanifest','utf8'));
const pagesManifest = {...manifest, icons:manifest.icons.map(icon=>({...icon,src:icon.src.replace('./icons/','./src/icons/')}))};
await writeFile('manifest.webmanifest', JSON.stringify(pagesManifest,null,2)+'\n');
const template = await readFile('src/sw-template.js','utf8');
const assets = ['app.js','fields.js','model.js','storage.js','styles.css','favicon.svg','pwa.js','i18n.js','locales/messages.js','update-controller.js','install-controller.js',...(await readdir('src/icons')).map(p=>'icons/'+p)];
async function worker(target, prefix, indexPath, manifestPath) {
  const hash = createHash('sha256');
  hash.update(template);
  for(const p of [indexPath,manifestPath,...assets.map(a=>'src/'+a)]) hash.update(await readFile(p));
  const files = ['./','./manifest.webmanifest',...assets.map(a=>'./'+prefix+a)];
  await writeFile(target,template.replace('__PRECACHE__',JSON.stringify(files)).replace('__RELEASE__',hash.digest('hex').slice(0,16)));
}
await worker('sw.js','src/','index.html','manifest.webmanifest');
await worker('dist/sw.js','','dist/index.html','dist/manifest.webmanifest');
console.log('Built static app, root Pages entry, manifests and versioned service workers.');
