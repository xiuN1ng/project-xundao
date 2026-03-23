const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;

// 读取版本号
const packageJson = require('./package.json');
const VERSION = packageJson.version;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: `挂机修仙 v${VERSION}`,
    backgroundColor: '#1a1a2e',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log(`🎮 挂机修仙 v${VERSION} 已启动`);
  });

  // 最小化到系统托盘
  // eslint-disable-next-line no-unused-vars
  mainWindow.on('minimize', (_event) => {
    // 可以选择最小化到托盘
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      // 显示托盘提示
      if (tray) {
        tray.displayBalloon({
          title: '挂机修仙',
          content: '游戏已最小化到系统托盘'
        });
      }
    }
  });

  // 创建菜单
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '手动存档',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('manual-save');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: '游戏',
      submenu: [
        {
          label: '重新开始',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['取消', '确认'],
              defaultId: 0,
              title: '确认',
              message: '确定要重新开始吗？所有进度将会丢失！'
            }).then(result => {
              if (result.response === 1) {
                mainWindow.webContents.send('reset-game');
              }
            });
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: `关于 挂机修仙 v${VERSION}`,
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '挂机修仙',
              detail: `版本: ${VERSION}\n\n一款挂机修仙休闲游戏\n\n境界修炼、功法系统、洞府建设、战斗历练`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// eslint-disable-next-line no-unused-vars
function createTray() {
  // 创建简单的托盘图标
  const iconPath = path.join(__dirname, 'src', 'assets', 'icon.png');
  
  // 如果图标不存在，使用默认
  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // 创建简单的16x16图标
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示游戏',
      click: () => {
        mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('挂机修仙');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// 禁止多次启动
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    // createTray(); // 可选：系统托盘
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// IPC 通信
// eslint-disable-next-line no-unused-vars
ipcMain.on('game-state-update', (_event, _state) => {
  // 可以在这里处理游戏状态同步
});

ipcMain.handle('get-version', () => {
  return VERSION;
});
