import { contextBridge, ipcRenderer } from 'electron';

const workspaceApi = {
  save: (payload: unknown) => ipcRenderer.invoke('workspace:save', payload),
  load: () => ipcRenderer.invoke('workspace:load')
};

const terminalApi = {
  info: () => ipcRenderer.invoke('terminal:info'),
  create: (payload: { id: string; cwd?: string; cols?: number; rows?: number }) => ipcRenderer.invoke('terminal:create', payload),
  write: (payload: { id: string; data: string }) => ipcRenderer.invoke('terminal:write', payload),
  resize: (payload: { id: string; cols: number; rows: number }) => ipcRenderer.invoke('terminal:resize', payload),
  kill: (payload: { id: string }) => ipcRenderer.invoke('terminal:kill', payload),
  onData: (id: string, callback: (data: string) => void) => {
    const channel = `terminal:data:${id}`;
    const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onExit: (id: string, callback: (payload: { exitCode: number; signal?: number }) => void) => {
    const channel = `terminal:exit:${id}`;
    const listener = (_event: Electron.IpcRendererEvent, payload: { exitCode: number; signal?: number }) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  run: (payload: { command: string; cwd?: string }) => ipcRenderer.invoke('terminal:run', payload)
};

const machineApi = {
  info: () => ipcRenderer.invoke('machine:info')
};

contextBridge.exposeInMainWorld('workspaceApi', workspaceApi);
contextBridge.exposeInMainWorld('terminalApi', terminalApi);
contextBridge.exposeInMainWorld('machineApi', machineApi);
contextBridge.exposeInMainWorld('commandDeckApi', {
  workspace: workspaceApi,
  terminal: terminalApi,
  machine: machineApi
});
