const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

async function main() {
  const desktop = path.resolve(__dirname, '..');
  const frontend = path.resolve(desktop, '../frontend');
  process.chdir(frontend);
  process.env.VITE_API_BASE = '/api';
  execFileSync(process.execPath, [path.join(frontend, 'node_modules/typescript/bin/tsc'), '-b'], { stdio: 'inherit' });
  const { build } = await import(pathToFileURL(path.join(frontend, 'node_modules/vite/dist/node/index.js')).href);
  await build({ root: frontend, build: { outDir: path.join(desktop, 'ui'), emptyOutDir: true } });
  fs.copyFileSync(path.join(desktop, 'resources/__desktop_start.html'), path.join(desktop, 'ui/__desktop_start.html'));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
