import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
await rm('dist', {recursive: true, force: true});
await mkdir('dist', {recursive: true});
await cp('src', 'dist', {recursive: true});
console.log('Built static app in dist/');

// Keep branch-based GitHub Pages at the clean project URL.
const html = await readFile("src/index.html", "utf8");
await writeFile("index.html", html.replace("<head>", '<head><base href="./src/">'));
