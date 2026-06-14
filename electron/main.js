const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

// ===== 常量 =====
const APP_NAME = '选题雷达';
const SECRET_KEY = 'XT-RADAR-2026-SICHUAN';
const LICENSE_DIR = path.join(app.getPath('appData'), APP_NAME);
const LICENSE_FILE = path.join(LICENSE_DIR, 'license.dat');

// ===== 窗口引用 =====
let activateWindow = null;
let mainWindow = null;

// ===== 机器码生成 =====
function getMachineCode() {
  const cpuCount = os.cpus().length;
  const totalMem = Math.floor(os.totalmem() / (1024 * 1024));
  const hostname = os.hostname();
  const raw = `${cpuCount}-${totalMem}-${hostname}`;
  return crypto.createHash('sha256').update(raw, 'utf-8').digest('hex').substring(0, 16).toUpperCase();
}

// ===== 激活验证 =====
function verifyActivationCode(code) {
  if (typeof code !== 'string') return false;
  const parts = code.trim().split('-');
  if (parts.length !== 2) return false;
  const [machineCode, signature] = parts;
  if (machineCode.length !== 16 || signature.length !== 16) return false;
  const expectedSig = crypto.createHash('sha256')
    .update(machineCode + SECRET_KEY, 'utf-8')
    .digest('hex').substring(0, 16).toUpperCase();
  return signature === expectedSig;
}

function isActivated() {
  try {
    return fs.existsSync(LICENSE_FILE) &&
           fs.readFileSync(LICENSE_FILE, 'utf-8').trim() === 'activated';
  } catch (e) {
    return false;
  }
}

function saveActivation() {
  if (!fs.existsSync(LICENSE_DIR)) {
    fs.mkdirSync(LICENSE_DIR, { recursive: true });
  }
  fs.writeFileSync(LICENSE_FILE, 'activated', 'utf-8');
}

// ===== 窗口创建 =====
function createActivateWindow() {
  activateWindow = new BrowserWindow({
    width: 800,
    height: 500,
    resizable: false,
    title: '林岛AI - 激活',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  activateWindow.loadFile(path.join(__dirname, 'activate.html'));
  activateWindow.setMenuBarVisibility(false);

  activateWindow.on('closed', () => {
    activateWindow = null;
    if (!mainWindow && !isActivated()) {
      app.quit();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '林岛AI',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'topic-tool.html'));
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== IPC 处理 =====
ipcMain.handle('get-machine-code', () => {
  return getMachineCode();
});

ipcMain.handle('submit-activation', (_event, code) => {
  if (verifyActivationCode(code)) {
    saveActivation();
    // 关闭激活窗口，打开主窗口
    if (activateWindow) {
      activateWindow.close();
      activateWindow = null;
    }
    createMainWindow();
    return { success: true };
  }
  return { success: false, error: '激活码无效，请检查后重试' };
});

// ===== 启动流程 =====
app.whenReady().then(() => {
  if (isActivated()) {
    createMainWindow();
  } else {
    createActivateWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (isActivated()) {
      createMainWindow();
    } else {
      createActivateWindow();
    }
  }
});
