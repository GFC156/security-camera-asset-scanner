const { app, BrowserWindow, Menu, shell } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const SERVER_PORT = process.env.PORT || 3000;
let serverProcess = null;
let logStream = null;

// 日志文件路径：写到用户数据目录，便于排查问题
function getLogPath() {
  return path.join(app.getPath('userData'), 'server.log');
}

function openLogStream() {
  try {
    logStream = fs.createWriteStream(getLogPath(), { flags: 'w' });
    logStream.write(`[${new Date().toISOString()}] === server log start ===\n`);
  } catch (e) {
    logStream = null;
  }
}

function logLine(s) {
  if (logStream) {
    try {
      logStream.write(s + (s.endsWith('\n') ? '' : '\n'));
    } catch (e) {}
  }
}

// 防止多实例：如果已有实例在运行，直接退出当前实例
let gotLock = false;
try {
  gotLock = app.requestSingleInstanceLock();
} catch (e) {
  gotLock = true;
}
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 用户再次双击图标时，聚焦到已有窗口
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      if (wins[0].isMinimized()) wins[0].restore();
      wins[0].focus();
    }
  });
}

function startServer() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
  try {
    // ELECTRON_RUN_AS_NODE=1：让 Electron 可执行文件以纯 Node.js 模式运行 server.cjs，
    // 否则 spawn(process.execPath) 会再次拉起整个 Electron 应用，导致无限递归弹窗。
    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: SERVER_PORT,
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    serverProcess.stdout.on('data', (d) => {
      const s = d.toString();
      process.stdout.write(s);
      logLine(s);
    });
    serverProcess.stderr.on('data', (d) => {
      const s = d.toString();
      process.stderr.write(s);
      logLine(s);
    });

    serverProcess.on('exit', (code) => {
      const msg = `Bundled server exited with code ${code}`;
      console.log(msg);
      logLine(msg);
    });
  } catch (e) {
    console.error('Failed to start bundled server', e);
    logLine('Failed to start bundled server: ' + (e && e.stack || e));
  }
}

function waitForServer(port, timeout = 30000) {
  // 用 127.0.0.1 而非 localhost：Windows 上 localhost 可能解析到 IPv6 ::1，
  // 而 express 监听 0.0.0.0（IPv4），导致连接被拒绝。
  const url = `http://127.0.0.1:${port}`;
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, { family: 4 }, (res) => {
        res.destroy();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('Server start timeout'));
        setTimeout(check, 300);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (Date.now() - start > timeout) return reject(new Error('Server start timeout'));
        setTimeout(check, 300);
      });
    };
    check();
  });
}

// 本地 loading 页面，避免窗口白屏
const LOADING_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;height:100%}
  body{background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .spinner{width:42px;height:42px;border:3px solid rgba(255,255,255,0.12);border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .text{margin-top:18px;font-size:14px;letter-spacing:.5px;color:#94a3b8}
</style></head>
<body><div class="spinner"></div><div class="text">正在启动安防监控扫描…</div></body></html>`;

// 错误页面
function errorHtml(logPath) {
  const safePath = String(logPath).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\\/g, '/');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;height:100%}
  body{background:#0f172a;color:#fca5a5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
  .box{max-width:560px}
  h2{margin-top:0;font-weight:600}
  code{display:block;background:#1e293b;color:#cbd5e1;padding:10px 12px;border-radius:6px;font-size:12px;margin-top:12px;word-break:break-all}
</style></head>
<body><div class="box"><h2>服务启动失败</h2><p>内置 Express 服务未在 30 秒内响应。</p><p>请将下方日志文件反馈给开发者：</p><code>${safePath}</code></div></body></html>`;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0f172a',
    show: false, // 等 ready-to-show 后再显示，避免白屏闪烁
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 立即加载本地 loading 页，避免任何白屏
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(LOADING_HTML));
  win.once('ready-to-show', () => {
    win.show();
  });

  // 等待 server 就绪，然后跳转到真实页面（用 127.0.0.1 避免 IPv6 问题）
  waitForServer(SERVER_PORT, 30000)
    .then(() => {
      win.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
    })
    .catch(() => {
      win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml(getLogPath())));
    });

  return win;
}

function buildAppMenu() {
  const logPath = getLogPath();
  const logDir = path.dirname(logPath);
  const template = [
    {
      label: '工具',
      submenu: [
        {
          label: '打开日志目录',
          click() {
            if (fs.existsSync(logDir)) shell.openPath(logDir);
          },
        },
        {
          label: '打开日志文件',
          click() {
            if (fs.existsSync(logPath)) shell.openPath(logPath);
          },
        },
        { type: 'separator' },
        {
          label: '重新加载页面',
          role: 'reload',
        },
        {
          label: '开发者工具',
          role: 'toggleDevTools',
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏切换' },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  if (!gotLock) return;
  buildAppMenu();
  openLogStream();
  logLine('App ready. Starting server...');
  startServer();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
  }
  if (logStream) {
    try {
      logStream.end();
    } catch (e) {}
  }
});
