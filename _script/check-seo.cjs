// Validate source or compiled HTML without running Angular: this is what crawlers read.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const project = path.resolve(__dirname, '..');
const root = path.resolve(project, process.argv[2] || 'src');
const compiled = root !== path.join(project, 'src');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
assert(head, 'Missing HTML head');
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [m[1], m[2]]));
}
const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attributes(m[0]));
const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attributes(m[0]));
function meta(key) {
  const matches = metas.filter((m) => m.name === key || m.property === key);
  assert.equal(matches.length, 1, `Expected one ${key} tag`);
  assert(matches[0].content, `Empty ${key}`);
  return matches[0].content;
}
const canonical = links.filter((l) => l.rel === 'canonical');
assert.equal(canonical.length, 1);
const site = new URL(canonical[0].href);
assert.equal(site.protocol, 'https:');
assert.equal(site.hostname, 'budotournaments.net');
assert.equal(site.pathname, '/app/', 'Production frontend must run under /app/');
const configuration = JSON.parse(fs.readFileSync(path.join(project, 'angular.json'), 'utf8'));
assert.equal(site.pathname, configuration.projects.vex.architect.build.configurations.production.baseHref);
if (compiled) assert.equal(attributes(head.match(/<base\b[^>]*>/i)[0]).href, site.pathname, 'Wrong production base href');
assert.match(html, /<html\b[^>]*lang="es-CL"/);
const title = head.match(/<title>([^<]+)<\/title>/)?.[1];
assert(title && title.length <= 70);
assert.equal(meta('og:title'), title);
assert.equal(meta('twitter:title'), title);
assert.equal(meta('og:description'), meta('description'));
assert.equal(meta('twitter:description'), meta('description'));
assert.equal(meta('og:url'), site.href);
assert.equal(meta('og:type'), 'website');
assert.equal(meta('twitter:card'), 'summary_large_image');
assert.equal(meta('og:locale'), 'es_CL');
assert(meta('og:image:alt') && meta('twitter:image:alt'));

function asset(url) {
  const resolved = new URL(url, site);
  assert.equal(resolved.origin, site.origin, 'Asset must use the production origin');
  assert(resolved.pathname.startsWith(site.pathname), 'Asset outside application base');
  const file = path.resolve(root, resolved.pathname.slice(site.pathname.length));
  assert(file.startsWith(root + path.sep));
  assert(fs.statSync(file).isFile(), `Missing asset ${url}`);
  return file;
}
function png(url, size) {
  const bytes = fs.readFileSync(asset(url));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}
for (const link of links.filter((l) => ['icon', 'apple-touch-icon', 'manifest'].includes(l.rel))) asset(link.href);
png('favicon.png', 96);
png('assets/seo/favicon-32.png', 32);
png('assets/seo/apple-touch-icon.png', 180);
const ico = fs.readFileSync(asset('favicon.ico'));
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 3);
assert.deepEqual([0, 1, 2].map((i) => ico[6 + i * 16]), [16, 32, 48]);
const manifest = JSON.parse(fs.readFileSync(asset('site.webmanifest'), 'utf8'));
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
for (const icon of manifest.icons) png(icon.src, Number(icon.sizes.split('x')[0]));
assert(manifest.icons.some((icon) => icon.purpose === 'maskable'));
const image = meta('og:image');
assert.equal(meta('twitter:image'), image);
assert.equal(meta('og:image:secure_url'), image);
assert.equal(meta('og:image:type'), 'image/jpeg');
assert.equal(meta('og:image:width'), '1200');
assert.equal(meta('og:image:height'), '630');
const jpeg = fs.readFileSync(asset(image));
assert.equal(jpeg.readUInt16BE(0), 0xffd8);
let dimensions;
for (let offset = 2; offset + 8 < jpeg.length;) {
  assert.equal(jpeg[offset], 0xff);
  const marker = jpeg[offset + 1];
  if (marker === 0xda || marker === 0xd9) break;
  if ([0xc0, 0xc1, 0xc2].includes(marker)) {
    dimensions = [jpeg.readUInt16BE(offset + 7), jpeg.readUInt16BE(offset + 5)];
    break;
  }
  offset += 2 + jpeg.readUInt16BE(offset + 2);
}
assert.deepEqual(dimensions, [1200, 630]);
assert(jpeg.length < 300000, 'Social image should remain small for chat crawlers');
const schema = JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(schema['@context'], 'https://schema.org');
assert(schema['@graph'].some((node) => node['@type'] === 'WebSite' && node.url === site.href));
assert(fs.readFileSync(asset('sitemap.xml'), 'utf8').includes(`<loc>${site.href}</loc>`));
console.log(`SEO verified (${compiled ? 'production HTML' : 'source'}): static previews, icon dimensions, manifest, structured data and sitemap.`);
