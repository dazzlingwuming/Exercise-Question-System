const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { once } = require('node:events');
const { uiFile, externalUrl, makeHandler } = require('../src/protocol.cjs');

test('static paths stay in the packaged UI directory', () => {
  const root = path.resolve('ui');
  assert.equal(uiFile(root, 'xiaojing://app/assets/a.js'), path.join(root, 'assets/a.js'));
  for (const url of ['xiaojing://other/a', 'file:///secret', 'xiaojing://app/%2e%2e%2fsecret', 'xiaojing://app/%5csecret', 'xiaojing://app/a%00b']) {
    assert.throws(() => uiFile(root, url));
  }
});

test('only ordinary web links may leave the application', () => {
  assert.equal(externalUrl('https://example.com/learn'), 'https://example.com/learn');
  for (const url of ['file:///tmp/secret', 'javascript:alert(1)', 'powershell:run', 'https://secret@example.com', 'not-a-url']) assert.equal(externalUrl(url), null);
});

test('static routing adds CSP, supports deep links, and rejects foreign initiators', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xiaojing-protocol-'));
  t.after(() => fs.rm(root, { recursive: true })); // mkdtemp owns this exact test directory.
  await fs.writeFile(path.join(root, 'index.html'), '<html>app</html>');
  const handler = makeHandler({ uiRoot: root, backend: {}, fileFetch: async () => new Response('<html>app</html>') });
  const response = await handler(new Request('xiaojing://app/studio'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /object-src 'none'/);
  assert.equal(await response.text(), '<html>app</html>');
  assert.equal((await handler(new Request('xiaojing://app/missing.js'))).status, 404);
  const request = new Request('xiaojing://app/api/health');
  request.initiatorOrigin = 'https://untrusted.example';
  assert.equal((await handler(request)).status, 403);
  assert.equal((await handler(new Request('xiaojing://app/api/health'))).status, 503);
});

test('API proxy keeps its credential private and streams without buffering to completion', async t => {
  let incoming;
  const server = http.createServer((request, response) => {
    incoming = request.headers;
    response.writeHead(200, { 'content-type': 'text/event-stream', 'set-cookie': 'never=expose' });
    response.write('data: first\n\n');
    const timer = setTimeout(() => response.end('data: second\n\n'), 300);
    response.on('close', () => clearTimeout(timer));
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const handler = makeHandler({ uiRoot: '', backend: { origin: `http://127.0.0.1:${server.address().port}`, token: 'private' } });
  const response = await handler(new Request('xiaojing://app/api/events', { headers: { authorization: 'untrusted', 'x-xiaojing-token': 'spoofed' } }));
  assert.equal(incoming['x-xiaojing-token'], 'private');
  assert.equal(incoming.authorization, undefined);
  assert.equal(response.headers.get('set-cookie'), null);
  const reader = response.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.equal(first, 'data: first\n\n');
  await reader.cancel();
});
