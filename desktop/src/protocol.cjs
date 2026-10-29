const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_ORIGIN = 'xiaojing://app';
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'none'";

function uiFile(root, url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'xiaojing:' || parsed.host !== 'app') throw new Error('Invalid application origin');
  const decoded = decodeURIComponent(parsed.pathname);
  if (decoded.includes('\\') || decoded.includes('\0')) throw new Error('Invalid path');
  const file = path.resolve(root, '.' + decoded);
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path is outside application');
  return file;
}

function externalUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

function makeHandler({ uiRoot, backend, fileFetch }) {
  return async request => {
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'xiaojing:' || url.host !== 'app' || (request.initiatorOrigin && request.initiatorOrigin !== APP_ORIGIN)) return new Response('Forbidden', { status: 403 });
      if (url.pathname.startsWith('/api/')) {
        if (!backend.origin) return Response.json({ detail: '本地服务暂时不可用，请重新打开客户端。' }, { status: 503 });
        const headers = new Headers({ 'X-Xiaojing-Token': backend.token });
        for (const name of ['content-type', 'accept', 'range', 'if-none-match', 'if-modified-since']) if (request.headers.has(name)) headers.set(name, request.headers.get(name));
        const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
        if (body && body.byteLength > 32 * 1024 * 1024) return Response.json({ detail: '请求超过 32 MiB。' }, { status: 413 });
        const response = await fetch(backend.origin + url.pathname + url.search, { method: request.method, headers, body, signal: request.signal, redirect: 'manual' });
        const outgoing = new Headers(response.headers);
        outgoing.delete('set-cookie'); outgoing.delete('content-encoding'); outgoing.delete('content-length');
        return new Response(response.body, { status: response.status, headers: outgoing });
      }
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
      let file = uiFile(uiRoot, request.url);
      if (url.pathname === '/' || !path.extname(file)) file = path.join(uiRoot, 'index.html');
      try { if (!(await fs.stat(file)).isFile()) return new Response('Not found', { status: 404 }); }
      catch { return new Response('Not found', { status: 404 }); }
      const response = await fileFetch(pathToFileURL(file).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', CSP);
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      if (request.signal.aborted) throw error;
      return Response.json({ detail: '无法读取本地资源或服务响应，请重试。' }, { status: 502 });
    }
  };
}

module.exports = { APP_ORIGIN, CSP, uiFile, externalUrl, makeHandler };
