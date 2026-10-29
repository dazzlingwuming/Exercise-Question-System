const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

class Backend {
  constructor(executable, logPath) {
    this.executable = executable;
    this.logPath = logPath;
    this.child = null;
    this.origin = '';
    this.token = '';
    this.onUnexpectedExit = () => {};
  }

  environment(dataDir, token) {
    return { ...process.env, EXERCISE_DATA_DIR: dataDir, EXERCISE_DESKTOP_TOKEN: token, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONUNBUFFERED: '1' };
  }

  async start(dataDir) {
    if (this.child) throw new Error('本地服务已经启动。');
    fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
    if (fs.existsSync(this.logPath) && fs.statSync(this.logPath).size > 2 * 1024 * 1024) {
      fs.copyFileSync(this.logPath, this.logPath + '.previous');
      fs.writeFileSync(this.logPath, '');
    }
    this.token = randomBytes(32).toString('hex');
    this.dataDir = dataDir;
    const child = spawn(this.executable, [], { env: this.environment(dataDir, this.token), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    child.stdin.on('error', () => {}); // A closing/crashed service may already have closed its pipe.
    child.stderr.on('data', chunk => fs.appendFileSync(this.logPath, chunk));
    child.once('exit', () => {
      if (this.child === child) { this.child = null; this.origin = ''; this.onUnexpectedExit(); }
    });
    try {
      const port = await new Promise((resolve, reject) => {
        const lines = createInterface({ input: child.stdout });
        const timer = setTimeout(() => done(new Error('本地服务启动超时，请打开日志查看原因。')), 60_000);
        const done = (error, value) => { clearTimeout(timer); lines.close(); error ? reject(error) : resolve(value); };
        child.once('error', () => done(new Error('无法启动内置服务，请重新安装完整客户端。')));
        child.once('exit', code => done(new Error(`本地服务未能启动（退出码 ${code ?? '未知'}）。`)));
        lines.on('line', line => {
          try { const data = JSON.parse(line); if (data.type === 'ready' && Number.isInteger(data.port) && data.port > 0 && data.port < 65536) done(null, data.port); }
          catch { /* Only the explicit readiness message is part of this protocol. */ }
        });
      });
      this.origin = `http://127.0.0.1:${port}`;
      const health = await fetch(this.origin + '/api/health', { headers: { 'X-Xiaojing-Token': this.token }, signal: AbortSignal.timeout(5000) });
      if (!health.ok || (await health.json()).status !== 'ok') throw new Error('本地服务健康检查失败。');
    } catch (error) { await this.stop(); throw error; }
  }

  async stop() {
    const child = this.child;
    this.child = null; this.origin = '';
    if (!child || child.exitCode !== null) return;
    await new Promise(resolve => {
      const timer = setTimeout(() => { child.kill(); resolve(); }, 4500);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      child.stdin.end();
    });
  }

  utility(args) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.executable, args, { env: this.environment(this.dataDir || path.dirname(this.logPath), ''), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('资料库操作超时，请检查磁盘空间。')); }, 300_000);
      child.stdout.setEncoding('utf8'); child.stdout.on('data', value => { output = (output + value).slice(-100_000); });
      child.stderr.on('data', chunk => fs.appendFileSync(this.logPath, chunk));
      child.once('error', () => { clearTimeout(timer); reject(new Error('无法运行资料库工具。')); });
      child.once('exit', code => {
        clearTimeout(timer);
        try { const result = JSON.parse(output.trim()); if (code || !result.ok) throw new Error(result.message || '资料库操作失败。'); resolve(result); }
        catch (error) { reject(error instanceof SyntaxError ? new Error('资料库工具没有返回有效结果。') : error); }
      });
    });
  }
}

module.exports = { Backend };
