import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('Branch-root Pages opens the calculator instead of rendering README', () => {
  const root = new URL('../', import.meta.url);
  const entry = readFileSync(new URL('index.html', root), 'utf8');
  assert.match(entry, /http-equiv="refresh" content="0; url=\.\/src\/"/);
  assert.match(entry, /window\.location\.replace/);
  assert.ok(existsSync(new URL('.nojekyll', root)));
  const app = readFileSync(new URL('src/index.html', root), 'utf8');
  assert.match(app, /id="app"/);
  assert.match(app, /type="module" src="\.\/app.js"/);
  for (const file of ['app.js', 'styles.css', 'favicon.svg', 'model.js', 'storage.js', 'fields.js']) {
    assert.ok(existsSync(new URL('src/' + file, root)), file + ' must be published');
  }
});
