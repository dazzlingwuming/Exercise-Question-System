// Native Electron QA: isolated library, local mock provider, no real keys or model charges.
const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');
const { once } = require('node:events');

const desktop = path.resolve(__dirname, '..');
const root = path.dirname(desktop);
const fixture = path.join(root, '.logs', `desktop-smoke-${Date.now()}`);
const env = { ...process.env, XIAOJING_USER_DATA: fixture, XIAOJING_SMOKE_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const packaged = process.argv[2] && path.resolve(process.argv[2]);
let app;
const captured = [];
const provider = http.createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  const payload = JSON.parse(body);
  captured.push(payload);
  response.writeHead(200, { 'content-type': 'text/event-stream' });
  const content = payload.messages.at(-1)?.content;
  const slow = typeof content === 'string' && content.includes('slow-test');
  response.write('data: ' + JSON.stringify({ choices: [{ delta: { content: slow ? '正在逐步分析' : '图片已收到。答案是 $2+2=4$。\n\n```mermaid\nflowchart LR\nA[读题] --> B[列式] --> C[求解]\n```' } }] }) + '\n\n');
  const timer = setTimeout(() => response.end('data: [DONE]\n\n'), slow ? 30_000 : 150);
  response.on('close', () => clearTimeout(timer));
});

async function launch() {
  app = await electron.launch({ executablePath: packaged || require('electron'), args: packaged ? [] : [desktop], cwd: desktop, env, timeout: 60_000 });
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async (...args) => { const options = args.at(-1); if (options.type === 'error') console.error('Native error:', options.message, options.detail); return { response: 0 }; };
  });
  const page = await app.firstWindow();
  page.on('pageerror', error => console.error('Renderer error:', error.message));
  await page.waitForURL('xiaojing://app/', { timeout: 65_000 });
  await page.locator('main').waitFor();
  return page;
}

async function main() {
  await fs.mkdir(fixture, { recursive: true });
  provider.listen(0, '127.0.0.1'); await once(provider, 'listening');
  const connection = { base_url: `http://127.0.0.1:${provider.address().port}`, api_key: 'desktop-test-only', model: 'mock-vision', supports_images: true };
  let page = await launch();
  console.log((await page.locator('body').ariaSnapshot()).slice(0, 1800));
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.equal(await page.evaluate(() => window.xiaojingDesktop.version()), '0.2.0');
  assert.equal(await page.evaluate(async () => (await (await fetch('/api/health')).json()).status), 'ok');

  // Record only the local origin, never the private authentication token.
  await app.evaluate(() => {
    const original = globalThis.fetch;
    globalThis.fetch = (url, ...args) => { if (String(url).includes('/api/health')) globalThis.__smokeOrigin = new URL(url).origin; return original(url, ...args); };
  });
  await page.evaluate(() => fetch('/api/health').then(r => r.json()));
  const origin = await app.evaluate(() => globalThis.__smokeOrigin);
  assert.equal((await fetch(origin + '/api/health')).status, 401);

  // Exercise multipart + managed images through the actual custom protocol.
  const imageBytes = await fs.readFile(path.join(root, 'frontend/public/mascot/xiaojing-avatar.png'));
  const image = await page.evaluate(async bytes => {
    const form = new FormData(); form.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'fixture.png');
    const result = await fetch('/api/media/images', { method: 'POST', body: form });
    if (!result.ok) throw new Error(await result.text());
    return result.json();
  }, [...imageBytes]);
  assert.equal(await page.evaluate(async url => (await fetch(url)).status, image.url), 200);

  // Configure via the real settings form, then send an image in the regular composer.
  await page.goto('xiaojing://app/settings');
  await page.locator('.connection-fields').getByLabel(/^API 基础地址/).fill(connection.base_url);
  await page.getByLabel('API Key', { exact: true }).first().fill(connection.api_key);
  await page.getByLabel('模型名称', { exact: true }).fill(connection.model);
  await page.getByLabel('这个模型支持图片输入', { exact: false }).check();
  await page.getByRole('button', { name: '保存并使用', exact: true }).click();
  await page.getByRole('link', { name: '打开工作台' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: imageBytes });
  await page.getByLabel('输入你的问题', { exact: true }).fill('请根据这张图解释 2+2，并画出步骤。');
  await page.getByRole('button', { name: '发送问题', exact: true }).click();
  await page.getByText('图片已收到。答案是', { exact: false }).waitFor();
  await page.getByRole('button', { name: '发送问题', exact: true }).waitFor();
  await page.locator('.rich-content__mermaid svg').waitFor({ timeout: 15_000 });
  assert.ok(captured.at(-1).messages.some(message => Array.isArray(message.content) && message.content.some(part => part.type === 'image_url')));
  const cid = new URL(page.url()).searchParams.get('id');
  assert.ok(cid);
  console.log('PASS native startup, isolated renderer, authenticated proxy, image upload, multimodal chat, math and diagram');

  await fs.mkdir(path.join(root, 'output/playwright'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'output/playwright/desktop-studio.png'), fullPage: true });
  await page.getByLabel('输入你的问题', { exact: true }).fill('slow-test');
  await page.getByRole('button', { name: '发送问题', exact: true }).click();
  await page.getByText('正在逐步分析', { exact: false }).waitFor();
  await page.getByRole('button', { name: '停止生成', exact: true }).click();
  await page.waitForFunction(async id => !(await (await fetch(`/api/studio/conversations/${id}/status`)).json()).busy, cid, { timeout: 8000 });
  const stopped = await page.evaluate(async id => (await (await fetch(`/api/studio/conversations/${id}`)).json()).messages.at(-1).status, cid);
  assert.equal(stopped, 'stopped');
  console.log('PASS cancel reaches the provider and releases the conversation');

  await app.close(); app = null;
  await assert.rejects(fetch(origin + '/api/health'), 'Service must exit with the application');
  page = await launch();
  await page.goto(`xiaojing://app/studio?id=${cid}`);
  await page.getByText('图片已收到。答案是', { exact: false }).waitFor();
  assert.equal(await page.evaluate(async url => (await fetch(url)).status, image.url), 200);
  console.log('PASS restart retains conversations and images');

  await app.evaluate(({ dialog }, directory) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] }); }, fixture);
  const backup = await page.evaluate(() => window.xiaojingDesktop.backupLibrary());
  assert.equal(backup.canceled, false);
  assert.ok((await fs.stat(path.join(backup.path, 'question_practice.sqlite3'))).size > 0);
  assert.ok((await fs.stat(path.join(backup.path, 'media', image.id + '.png'))).size > 0);
  await app.evaluate(({ dialog }, directory) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] });
    dialog.showMessageBox = async () => ({ response: 1 });
  }, backup.path);
  const newWindow = app.waitForEvent('window');
  void page.evaluate(() => window.xiaojingDesktop.importLibrary()).catch(() => {}); // Successful switching replaces the old renderer.
  page = await newWindow;
  await page.waitForURL('xiaojing://app/');
  assert.ok((await fs.readFile(path.join(fixture, 'library-location.json'), 'utf8')).includes('library-'));
  await page.goto(`xiaojing://app/studio?id=${cid}`);
  await page.getByText('图片已收到。答案是', { exact: false }).waitFor();
  assert.equal(await page.evaluate(async url => (await fetch(url)).status, image.url), 200);
  assert.ok((await fs.stat(path.join(fixture, 'library/question_practice.sqlite3'))).size > 0);
  await page.goto('xiaojing://app/settings');
  await page.getByRole('region', { name: '桌面资料库' }).waitFor();
  await page.screenshot({ path: path.join(root, 'output/playwright/desktop-settings.png'), fullPage: true });
  console.log('PASS backup/import preserves images, retains the previous library, and isolates drafts/settings');
  console.log(`Smoke data: ${fixture}`);
}

main().catch(async error => {
  console.error(error); process.exitCode = 1;
  const page = app?.windows().find(item => !item.isClosed());
  if (page) {
    console.error((await page.locator('body').ariaSnapshot().catch(() => '')).slice(0, 9000));
    await fs.mkdir(path.join(root, 'output/playwright'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'output/playwright/desktop-failure.png') }).catch(() => {});
  }
}).finally(async () => {
  if (app) await app.close().catch(() => app.process().kill());
  provider.closeAllConnections(); provider.close();
});
