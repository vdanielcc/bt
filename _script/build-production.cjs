const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const configuration = JSON.parse(fs.readFileSync(path.join(root, 'angular.json'), 'utf8'));
let output = configuration.projects.vex.architect.build.options.outputPath;
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--base-href' && args[i + 1] !== '/app/') ||
      (args[i].startsWith('--base-href=') && args[i] !== '--base-href=/app/')) {
    throw new Error('Production frontend must be compiled for /app/');
  }
  if (args[i] === '--output-path') output = args[++i];
  else if (args[i].startsWith('--output-path=')) output = args[i].slice('--output-path='.length);
}
if (!output) throw new Error('Missing output path');
try {
  execFileSync(process.execPath, [path.join(root, 'node_modules/@angular/cli/bin/ng.js'),
    'build', '--configuration', 'production', ...args], { cwd: root, stdio: 'inherit' });
  execFileSync(process.execPath, [path.join(__dirname, 'check-seo.cjs'), output], { cwd: root, stdio: 'inherit' });
} catch (error) {
  process.exit(error.status || 1);
}
