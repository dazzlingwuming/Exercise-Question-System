const { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Backend } = require('./backend.cjs');
const { APP_ORIGIN, externalUrl, makeHandler } = require('./protocol.cjs');

app.setName('Xiaojing');
app.setAppUserModelId('com.xiaojing.study');
const userRoot = process.env.XIAOJING_USER_DATA ? path.resolve(process.env.XIAOJING_USER_DATA) : path.join(app.getPath('appData'), 'Xiaojing');
app.setPath('userData', userRoot);
protocol.registerSchemesAsPrivileged([{ scheme: 'xiaojing', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

let window, backend, quitting = false, ready = false, transferring = false;
let libraryDir;
const pointer = path.join(userRoot, 'library-location.json');

function savedLibrary() {
  if (!fs.existsSync(pointer)) return path.join(userRoot, 'library');
  const { directory } = JSON.parse(fs.readFileSync(pointer, 'utf8'));
  // Pointers only name a managed directory, never an arbitrary external path.
  if (!/^library(?:-[a-f0-9-]{36})?$/.test(directory)) throw new Error('资料库位置记录无效，请检查应用数据目录。');
  const target = path.join(userRoot, directory);
  if (!fs.existsSync(path.join(target, 'question_practice.sqlite3'))) throw new Error('找不到已选择的资料库，请检查应用数据目录。');
  return target;
}

function writePointer(directory) {
  const temp = pointer + '.tmp';
  fs.writeFileSync(temp, JSON.stringify({ directory: path.basename(directory) }), { mode: 0o600 });
  fs.renameSync(temp, pointer);
}

function allowed(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Invalid caller');
  const url = new URL(event.senderFrame.url);
  if (url.protocol !== 'xiaojing:' || url.host !== 'app') throw new Error('Invalid origin');
}

async function operation(action) {
  if (!ready || transferring) throw new Error('请等待当前资料库操作完成。');
  transferring = true;
  try { return await action(); } finally { transferring = false; }
}

async function backupLibrary() {
  return operation(async () => {
    const selected = await dialog.showOpenDialog(window, { title: '选择保存备份的位置', properties: ['openDirectory', 'createDirectory'] });
    if (selected.canceled) return { canceled: true };
    const target = path.join(selected.filePaths[0], `Xiaojing-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    await backend.utility(['--copy-library', libraryDir, target]);
    return { canceled: false, path: target };
  });
}

async function importLibrary() {
  return operation(async () => {
    const selected = await dialog.showOpenDialog(window, { title: '选择包含数据库和 media 图片的资料库目录', properties: ['openDirectory'] });
    if (selected.canceled) return { canceled: true };
    const source = selected.filePaths[0];
    const info = await backend.utility(['--inspect-library', source]);
    const choice = await dialog.showMessageBox(window, { type: 'question', title: '导入资料库', message: `导入 ${info.questions} 道题目、${info.conversations} 段讨论和 ${info.images} 张图片？`, detail: '客户端将使用导入资料库的一份副本。当前资料库仍保留在应用数据目录；原目录不会被修改。模型连接需要在客户端重新设置。', buttons: ['取消', '导入并切换'], defaultId: 0, cancelId: 0 });
    if (choice.response !== 1) return { canceled: true };
    const target = path.join(userRoot, 'library-' + randomUUID());
    await backend.utility(['--copy-library', source, target]);
    const previous = libraryDir;
    ready = false;
    await backend.stop();
    try { await backend.start(target); writePointer(target); libraryDir = target; }
    catch (error) { await backend.stop(); await backend.start(previous); throw error; }
    finally { ready = true; }
    const previousWindow = window;
    await createWindow();
    previousWindow?.destroy();
    return { canceled: false };
  });
}

function installMenu() {
  const run = action => () => action().then(result => {
    if (result?.path) dialog.showMessageBox(window, { message: '资料库备份完成', detail: result.path });
  }).catch(error => dialog.showMessageBox(window, { type: 'error', message: '操作未完成', detail: error.message }));
  const template = [
    ...(process.platform === 'darwin' ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] }] : []),
    { label: '资料库', submenu: [{ label: '备份资料库…', click: run(backupLibrary) }, { label: '导入已有资料库…', click: run(importLibrary) }, { label: '打开资料库目录', click: () => shell.openPath(libraryDir) }, { label: '打开日志目录', click: () => shell.openPath(path.join(userRoot, 'logs')) }, { type: 'separator' }, { role: 'quit', label: '退出' }] },
    { label: '编辑', submenu: [{ role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' }, { type: 'separator' }, { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' }] },
    { label: '视图', submenu: [{ role: 'reload', label: '刷新界面' }, { role: 'resetZoom', label: '实际大小' }, { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' }, { role: 'togglefullscreen', label: '全屏' }, ...(!app.isPackaged ? [{ role: 'toggleDevTools', label: '开发者工具' }] : [])] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  window = new BrowserWindow({ title: '小鲸学习空间', width: 1320, height: 900, minWidth: 780, minHeight: 580,
    show: process.env.XIAOJING_SMOKE_TEST !== '1', backgroundColor: '#f7f8fa',
    icon: path.join(app.getAppPath(), 'ui', 'mascot', 'xiaojing-avatar.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), partition: 'persist:' + path.basename(libraryDir), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false, backgroundThrottling: false, offscreen: process.env.XIAOJING_SMOKE_TEST === '1', devTools: !app.isPackaged || process.env.XIAOJING_SMOKE_TEST === '1' } });
  const created = window;
  const localProtocol = window.webContents.session.protocol;
  if (!await localProtocol.isProtocolHandled('xiaojing')) localProtocol.handle('xiaojing', makeHandler({ uiRoot: path.join(app.getAppPath(), 'ui'), backend, fileFetch: url => net.fetch(url) }));
  window.webContents.setWindowOpenHandler(({ url }) => {
    const safe = externalUrl(url);
    if (safe) void shell.openExternal(safe);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, target) => {
    const url = new URL(target);
    if (url.protocol !== 'xiaojing:' || url.host !== 'app') { event.preventDefault(); const safe = externalUrl(target); if (safe) void shell.openExternal(safe); }
  });
  const clipboardWrite = (contents, permission, details) => contents === created.webContents && permission === 'clipboard-sanitized-write' && details.isMainFrame && details.requestingUrl?.startsWith(APP_ORIGIN + '/');
  window.webContents.session.setPermissionRequestHandler((contents, permission, callback, details) => callback(!!clipboardWrite(contents, permission, details)));
  window.webContents.session.setPermissionCheckHandler((contents, permission, _origin, details) => !!clipboardWrite(contents, permission, details));
  window.on('closed', () => { if (window === created) window = null; });
  await window.loadURL(APP_ORIGIN + '/__desktop_start.html');
  if (ready) await window.loadURL(APP_ORIGIN + '/');
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    fs.mkdirSync(userRoot, { recursive: true });
    libraryDir = savedLibrary();
    const resources = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'build');
    const executable = app.isPackaged ? path.join(resources, 'backend', process.platform === 'win32' ? 'xiaojing-backend.exe' : 'xiaojing-backend') : path.join(resources, 'backend', 'xiaojing-backend', process.platform === 'win32' ? 'xiaojing-backend.exe' : 'xiaojing-backend');
    backend = new Backend(executable, path.join(userRoot, 'logs', 'backend.log'));
    backend.onUnexpectedExit = () => { const wasReady = ready; ready = false; if (wasReady && !quitting && window) void dialog.showMessageBox(window, { type: 'error', message: '本地服务已停止', detail: '学习记录仍保存在资料库中。请退出后重新打开客户端；也可通过资料库菜单查看日志。' }); };
    ipcMain.handle('desktop:version', event => { allowed(event); return app.getVersion(); });
    ipcMain.handle('desktop:open-library', event => { allowed(event); return shell.openPath(libraryDir); });
    ipcMain.handle('desktop:backup-library', event => { allowed(event); return backupLibrary(); });
    ipcMain.handle('desktop:import-library', event => { allowed(event); return importLibrary(); });
    installMenu();
    await createWindow();
    await backend.start(libraryDir);
    ready = true;
    await window?.loadURL(APP_ORIGIN + '/');
  }).catch(async error => {
    ready = false;
    const options = { type: 'error', title: '小鲸未能启动', message: '本地学习空间启动失败', detail: `${error.message}\n日志位置：${path.join(userRoot, 'logs')}` };
    await (window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options));
    app.quit();
  });
  app.on('activate', () => { if (!window && ready) void createWindow(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', event => {
    if (quitting) return;
    event.preventDefault(); quitting = true;
    void (backend?.stop() || Promise.resolve()).finally(() => app.quit());
  });
}
