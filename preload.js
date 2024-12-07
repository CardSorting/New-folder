const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'api', {
        getDatabase: () => ipcRenderer.invoke('get-database'),
        getAllScripts: () => ipcRenderer.invoke('get-all-scripts'),
        createScript: (name) => ipcRenderer.invoke('db:createScript', name),
        getScriptLines: (scriptId) => ipcRenderer.invoke('db:getScriptLines', scriptId),
        addLine: (scriptId, text, voice, buffer, sequence) => 
            ipcRenderer.invoke('db:addLine', scriptId, text, voice, buffer, sequence),
        deleteLine: (lineId) => ipcRenderer.invoke('db:deleteLine', lineId),
        updateLineSequence: (lineId, sequence) => 
            ipcRenderer.invoke('db:updateLineSequence', lineId, sequence)
    }
);
