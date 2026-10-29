const { Backend } = require('../src/backend.cjs');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const directory = path.resolve(__dirname, '../../.logs/backend-smoke-' + Date.now());
const executable = path.resolve(__dirname, '../build/backend/xiaojing-backend', process.platform === 'win32' ? 'xiaojing-backend.exe' : 'xiaojing-backend');
const backend = new Backend(executable, path.join(directory, 'backend.log'));
// Exclude developer Python/Conda paths, as on an ordinary end user's machine.
const environment = backend.environment.bind(backend);
backend.environment = (...args) => ({ ...environment(...args), PATH: process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32') : '/usr/bin:/bin' });
(async () => {
  try {
    await backend.start(path.join(directory, 'library'));
    const origin = backend.origin;
    assert.equal((await fetch(origin + '/api/health')).status, 401);
    assert.equal((await backend.utility(['--inspect-library', path.join(directory, 'library')])).questions, 0);
    await backend.stop();
    await assert.rejects(fetch(origin + '/api/health'));
    console.log('PASS standalone backend, clean PATH, token auth, library utility, shutdown');
  } catch (error) { console.error(error); if (fs.existsSync(backend.logPath)) console.error(fs.readFileSync(backend.logPath, 'utf8')); process.exitCode = 1; }
  finally { await backend.stop(); }
})();
