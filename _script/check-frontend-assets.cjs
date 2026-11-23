// Verify the resource URLs that the browser resolves from the deployed HTML.
const path = require('node:path');
const assert = require('node:assert/strict');

module.exports = function checkFrontendAssets(files, base) {
  const read = (name) => {
    assert(files[name], `Missing deployment asset: ${name}`);
    return Buffer.from(files[name]).toString('utf8');
  };
  const html = read('index.html');
  assert(html.includes(`<base href="${base}">`), 'HTML deployment base mismatch');
  assert(read('.htaccess').includes(`RewriteBase ${base}`), 'Apache deployment base mismatch');
  assert(read('_redirects').includes(`${base}* ${base}index.html 200`), 'Redirect deployment base mismatch');
  const origin = 'https://budotournaments.net';
  const documentUrl = new URL(base, origin);
  function resource(value, parent = documentUrl) {
    const url = new URL(value, parent);
    if (url.origin !== origin || /^(data|blob):/.test(url.protocol)) return;
    assert(url.pathname.startsWith(base), `Resource outside deployment base: ${value}`);
    const name = decodeURIComponent(url.pathname.slice(base.length));
    assert(files[name], `Missing deployment asset: ${name}`);
  }
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const tag = match[0];
    if (tag.startsWith('<link') && !/rel="(?:stylesheet|icon|apple-touch-icon|manifest|preload|modulepreload)"/.test(tag)) continue;
    const url = tag.match(/(?:src|href)="([^"]+)"/)?.[1];
    if (url) resource(url);
  }
  for (const [name, bytes] of Object.entries(files)) {
    if (path.extname(name) !== '.css') continue;
    for (const match of Buffer.from(bytes).toString('utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
      resource(match[1], new URL(name, documentUrl));
    }
  }
  for (const icon of JSON.parse(read('site.webmanifest')).icons) resource(icon.src);
  console.log(`Deployment assets verified for ${base}: scripts, styles, fonts, icons and manifest.`);
};
