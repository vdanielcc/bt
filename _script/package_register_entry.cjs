// Create a physical entry for /app/register from the matching production build.
// Usage: node _script/package_register_entry.cjs <build-directory> <package-directory>
const fs = require('node:fs');
const path = require('node:path');

const [buildDirectory, packageDirectory] = process.argv.slice(2);
if (!buildDirectory || !packageDirectory) {
  throw new Error('Expected build-directory and package-directory arguments.');
}
const html = fs.readFileSync(path.join(buildDirectory, 'index.html'), 'utf8');
if (!/<base\s+href=["']\/app\/["']/.test(html)) {
  throw new Error('The production build must use base href /app/.');
}
for (const match of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)) {
  const asset = match[1];
  if (!asset.startsWith('/') && !/^https?:/.test(asset) &&
      !fs.existsSync(path.join(buildDirectory, asset))) {
    throw new Error(`Missing build asset: ${asset}`);
  }
}
const destination = path.join(packageDirectory, 'app', 'register');
fs.mkdirSync(destination, { recursive: true });
fs.writeFileSync(path.join(destination, 'index.html'), html);
console.log('Created app/register/index.html with the original /app/ base and bundles.');
