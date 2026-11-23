// Reusable production package, including SEO assets and root-hosting instructions.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { zipSync, unzipSync, strToU8 } = require('fflate');
const project = path.resolve(__dirname, '..');
const source = path.resolve(project, process.argv[2] || 'dist/vex');
const base = process.argv[4] || '/app/';
if (base !== '/app/') throw new Error('Production deployment base must be /app/');
execFileSync(process.execPath, [path.join(__dirname, 'check-seo.cjs'), source], { stdio: 'inherit' });
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(new Date()).replaceAll('-', '');
const name = process.argv[3] || `bte-frontend-app-${date}.zip`;
if (!/^bte-frontend-(?:app|bte)-\d{8}(?:-[a-z0-9-]+)?\.zip$/.test(name)) throw new Error('Invalid archive name');
const files = {};
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (entry.isFile()) {
      if (entry.name.endsWith('.map')) throw new Error(`Unexpected source map: ${file}`);
      files[path.relative(source, file).split(path.sep).join('/')] = new Uint8Array(fs.readFileSync(file));
    }
  }
}
collect(source);
files['.htaccess'] = new Uint8Array(fs.readFileSync(path.join(project, 'src/.htaccess')));
// Match the physical hosting folder, while preserving the official SEO URLs.
if (!Buffer.from(files['index.html']).toString('utf8').includes(`<base href="${base}">`)) {
  throw new Error('Compile the production frontend for /app/ before packaging');
}
files['.htaccess'] = strToU8(Buffer.from(files['.htaccess']).toString('utf8')
  .replaceAll('/bte/', base));
files['_redirects'] = strToU8(`${base}* ${base}index.html 200\n`);
require('./check-frontend-assets.cjs')(files, base);
// Deployment instructions and root-domain files are also taken from permanent source.
for (const entry of fs.readdirSync(path.join(project, 'hosting-root'), { withFileTypes: true })) {
  if (entry.isFile()) files['hosting-root/' + entry.name] = new Uint8Array(fs.readFileSync(path.join(project, 'hosting-root', entry.name)));
}
files['LEEME.txt'] = strToU8(
  `Frontend Budo Tournaments para https://budotournaments.net${base}\n\n` +
  `Respaldar la carpeta web actual. Extraer TODO el ZIP dentro de ${base}, incluyendo .htaccess y assets/.\n` +
  'index.html, JS, CSS y fuentes deben quedar juntos directamente en esa carpeta, sin subcarpetas adicionales.\n' +
  'Subir primero assets, JS, CSS, fuentes e iconos; publicar index.html al final. Conservar los JS/CSS anteriores durante la transicion.\n' +
  'Recargar con Ctrl+Shift+R despues de publicar. No mezclar index.html de una entrega con archivos de otra.\n' +
  'No omitir favicon.ico, favicon.png, site.webmanifest ni sitemap.xml.\n' +
  'Combinar hosting-root/robots.txt con el robots.txt de la raiz del dominio, preservando otras reglas.\n' +
  'Los iconos y la imagen social deben ser publicos sin login ni desafios de seguridad.\n' +
  'Las plataformas pueden conservar en cache vistas previas anteriores.\n\n' +
  'Para futuras entregas: npm run build && npm run package:front\n'
);
const archive = zipSync(files, { level: 6 });
const unpacked = unzipSync(archive);
for (const key of ['index.html', '.htaccess', 'favicon.ico', 'favicon.png', 'site.webmanifest', 'sitemap.xml',
                   'assets/seo/budo-tournaments-social-v1.jpg', 'hosting-root/robots.txt', 'hosting-root/favicon.ico', 'hosting-root/favicon.png']) {
  if (!unpacked[key]) throw new Error(`Incomplete archive: ${key}`);
}
const directory = path.join(project, 'entregables');
fs.mkdirSync(directory, { recursive: true });
const output = path.join(directory, name);
fs.writeFileSync(output, archive);
const sha = crypto.createHash('sha256').update(archive).digest('hex');
fs.writeFileSync(output + '.sha256', `${sha}  ${name}\n`);
console.log(JSON.stringify({ archive: output, bytes: archive.length, sha256: sha }));
