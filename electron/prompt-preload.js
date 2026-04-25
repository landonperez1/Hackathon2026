const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bridge", {
  submit: (key) => ipcRenderer.send("api-key-submitted", key),
});
