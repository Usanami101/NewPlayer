const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eas', {
  onShow: (fn) => {
    const h = (_e, data) => fn(data);
    ipcRenderer.on('eas:show', h);
    return () => ipcRenderer.removeListener('eas:show', h);
  },
  onDenyClose: (fn) => {
    const h = () => fn();
    ipcRenderer.on('eas:deny-close', h);
    return () => ipcRenderer.removeListener('eas:deny-close', h);
  },
  setLocked: (locked) => ipcRenderer.invoke('eas:setLocked', locked),
  dismiss: (force) => ipcRenderer.invoke('eas:dismiss', !!force),
  openWeather: () => ipcRenderer.invoke('eas:openWeather'),
});
