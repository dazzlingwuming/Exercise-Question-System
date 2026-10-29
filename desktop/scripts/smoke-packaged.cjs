const { execFileSync } = require('node:child_process');
const path = require('node:path');
const desktop = path.resolve(__dirname, '..');
const application = process.platform === 'win32'
  ? path.join(desktop, 'release/win-unpacked/小鲸学习空间.exe')
  : path.join(desktop, `release/mac${process.arch === 'arm64' ? '-arm64' : ''}/小鲸学习空间.app/Contents/MacOS/小鲸学习空间`);
execFileSync(process.execPath, [path.join(__dirname, 'smoke.cjs'), application], { stdio: 'inherit' });
