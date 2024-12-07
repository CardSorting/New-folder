const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const path = require('path');
const DatabaseManager = require('./managers/databaseManager');

let mainWindow;
let db;

// Set up IPC handlers
function setupIpcHandlers() {
    ipcMain.handle('get-database', () => {
        return db;
    });

    ipcMain.handle('get-all-scripts', () => {
        return db.getAllScripts();
    });

    ipcMain.handle('db:createScript', (event, name) => {
        return db.createScript(name);
    });

    ipcMain.handle('db:getScriptLines', (event, scriptId) => {
        return db.getScriptLines(scriptId);
    });

    ipcMain.handle('db:addLine', (event, scriptId, text, voice, buffer, sequence) => {
        return db.addLine(scriptId, text, voice, buffer, sequence);
    });

    ipcMain.handle('db:deleteLine', (event, lineId) => {
        return db.deleteLine(lineId);
    });

    ipcMain.handle('db:updateLineSequence', (event, lineId, sequence) => {
        return db.updateLineSequence(lineId, sequence);
    });
}

function createWindow() {
    // Initialize database
    db = new DatabaseManager();
    
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Set up IPC handlers
    setupIpcHandlers();

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Handle app ready
app.whenReady().then(createWindow);

// Handle all windows closed
app.on('window-all-closed', () => {
    if (db) {
        db.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle app activation
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
