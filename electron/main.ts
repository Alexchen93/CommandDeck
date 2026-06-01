import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { spawn } from 'node:child_process';
import * as pty from 'node-pty';

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ptySessions = new Map<string, pty.IPty>();

function appDataPath(fileName: string): string {
  return path.join(app.getPath('userData'), fileName);
}

function resolveCwd(cwd?: string): string {
  if (!cwd || cwd === '~') return os.homedir();
  if (cwd.startsWith('~/')) return path.join(os.homedir(), cwd.slice(2));
  return path.resolve(cwd);
}

function resolvePath(input: string, currentCwd: string): string {
  if (!input || input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  if (path.isAbsolute(input)) return input;
  return path.resolve(currentCwd, input);
}

function displayCwd(cwd: string): string {
  const home = os.homedir();
  if (cwd === home) return '~';
  if (cwd.startsWith(`${home}/`)) return `~/${path.relative(home, cwd)}`;
  return cwd;
}

async function resolveCd(currentCwd: string, command: string) {
  const target = command.trim() === 'cd' ? '~' : command.trim().slice(3).trim();
  const nextCwd = resolvePath(target || '~', currentCwd);
  const stat = await fs.stat(nextCwd);
  if (!stat.isDirectory()) {
    throw new Error(`${displayCwd(nextCwd)} is not a directory`);
  }
  return nextCwd;
}

async function renderRangerView(currentCwd: string, targetArg: string): Promise<string> {
  const targetPath = resolvePath(targetArg || '.', currentCwd);
  const stat = await fs.stat(targetPath);
  const directory = stat.isDirectory() ? targetPath : path.dirname(targetPath);
  const parent = path.dirname(directory);
  const [parentEntries, currentEntries] = await Promise.all([
    readDirectoryPreview(parent, directory),
    readDirectoryPreview(directory)
  ]);
  const selected = stat.isDirectory() ? currentEntries.find((entry) => entry.name !== '../') : undefined;
  const previewPath = selected ? path.join(directory, selected.name.replace(/\/$/, '')) : targetPath;
  const preview = await readPreview(previewPath);
  const width = 28;
  const rows = Math.max(parentEntries.length, currentEntries.length, preview.length, 8);
  const output = [
    `ranger ${displayCwd(directory)}`,
    `${'parent'.padEnd(width)} ${'current'.padEnd(width)} preview`,
    `${'-'.repeat(width)} ${'-'.repeat(width)} ${'-'.repeat(width)}`
  ];

  for (let index = 0; index < rows; index += 1) {
    output.push(
      `${formatColumn(parentEntries[index]?.label ?? '', width)} ${formatColumn(currentEntries[index]?.label ?? '', width)} ${preview[index] ?? ''}`
    );
  }

  return `${output.join('\n')}\n`;
}

async function readDirectoryPreview(directory: string, selectedPath?: string) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const previewEntries = entries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
    .slice(0, 22)
    .map((entry) => {
      const fullPath = path.join(directory, entry.name);
      const marker = selectedPath && fullPath === selectedPath ? '>' : ' ';
      const suffix = entry.isDirectory() ? '/' : '';
      return {
        name: `${entry.name}${suffix}`,
        label: `${marker} ${entry.name}${suffix}`
      };
    });

  return [{ name: '../', label: '  ../' }, ...previewEntries];
}

async function readPreview(targetPath: string): Promise<string[]> {
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      return entries
        .filter((entry) => !entry.name.startsWith('.'))
        .slice(0, 24)
        .map((entry) => `${entry.isDirectory() ? 'dir ' : 'file'} ${entry.name}`);
    }

    const raw = await fs.readFile(targetPath, 'utf8');
    return raw.split('\n').slice(0, 24);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

function formatColumn(value: string, width: number): string {
  if (value.length > width) return `${value.slice(0, width - 1)}…`;
  return value.padEnd(width);
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    title: 'CommandDeck',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }
}

ipcMain.handle('workspace:save', async (_event, payload: unknown) => {
  const filePath = appDataPath('workspace-default.json');
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { filePath };
});

ipcMain.handle('workspace:load', async () => {
  const filePath = appDataPath('workspace-default.json');
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
});

ipcMain.handle('terminal:info', async () => ({
  user: os.userInfo().username,
  host: os.hostname(),
  cwd: displayCwd(os.homedir()),
  home: os.homedir(),
  shell: process.env.SHELL || '/bin/bash'
}));

ipcMain.handle('machine:info', async () => {
  const networkInterfaces = os.networkInterfaces();
  const ips: { name: string; address: string; family: string; internal: boolean }[] = [];

  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === 'IPv4') {
        ips.push({
          name,
          address: iface.address,
          family: 'IPv4',
          internal: iface.internal
        });
      }
    }
  }

  const primaryIp = ips.find((ip) => !ip.internal && ip.name.startsWith('wl'))?.address
    ?? ips.find((ip) => !ip.internal && ip.name.startsWith('eth'))?.address
    ?? ips.find((ip) => !ip.internal && ip.name.startsWith('en'))?.address
    ?? ips.find((ip) => !ip.internal)?.address
    ?? '127.0.0.1';

  const tailscaleIp = ips.find((ip) => ip.name.includes('tailscale'))?.address ?? '';

  return {
    hostname: os.hostname(),
    user: os.userInfo().username,
    home: os.homedir(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMem: os.totalmem(),
    primaryIp,
    tailscaleIp,
    ips
  };
});

ipcMain.handle('terminal:create', (event, payload: { id: string; cwd?: string; cols?: number; rows?: number }) => {
  const existingSession = ptySessions.get(payload.id);
  if (existingSession) {
    existingSession.kill();
    ptySessions.delete(payload.id);
  }

  const shell = process.env.SHELL || '/bin/bash';
  const cwd = resolveCwd(payload.cwd);
  const session = pty.spawn(shell, ['-i'], {
    name: 'xterm-256color',
    cols: payload.cols ?? 100,
    rows: payload.rows ?? 30,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PS1: '\\u@\\h:\\w\\$ '
    }
  });

  ptySessions.set(payload.id, session);
  session.onData((data) => {
    event.sender.send(`terminal:data:${payload.id}`, data);
  });
  session.onExit(({ exitCode, signal }) => {
    ptySessions.delete(payload.id);
    event.sender.send(`terminal:exit:${payload.id}`, { exitCode, signal });
  });

  return { id: payload.id };
});

ipcMain.handle('terminal:write', (_event, payload: { id: string; data: string }) => {
  ptySessions.get(payload.id)?.write(payload.data);
});

ipcMain.handle('terminal:resize', (_event, payload: { id: string; cols: number; rows: number }) => {
  ptySessions.get(payload.id)?.resize(payload.cols, payload.rows);
});

ipcMain.handle('terminal:kill', (_event, payload: { id: string }) => {
  const session = ptySessions.get(payload.id);
  if (!session) return;
  session.kill();
  ptySessions.delete(payload.id);
});

ipcMain.handle('terminal:run', async (_event, payload: { command: string; cwd?: string }) => {
  const command = payload.command.trim();
  const cwd = resolveCwd(payload.cwd);

  if (!command) {
    return { cwd: displayCwd(cwd), stdout: '', stderr: '', exitCode: 0 };
  }

  if (command === 'clear') {
    return { cwd: displayCwd(cwd), stdout: '', stderr: '', exitCode: 0, clear: true };
  }

  if (command === 'pwd') {
    return { cwd: displayCwd(cwd), stdout: `${cwd}\n`, stderr: '', exitCode: 0 };
  }

  if (command === 'ranger' || command === 'files' || command.startsWith('ranger ') || command.startsWith('files ')) {
    try {
      const [, ...args] = command.split(/\s+/);
      return {
        cwd: displayCwd(cwd),
        stdout: await renderRangerView(cwd, args.join(' ')),
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      return {
        cwd: displayCwd(cwd),
        stdout: '',
        stderr: `${error instanceof Error ? error.message : String(error)}\n`,
        exitCode: 1
      };
    }
  }

  if (command === 'cd' || command.startsWith('cd ')) {
    try {
      const nextCwd = await resolveCd(cwd, command);
      return { cwd: displayCwd(nextCwd), stdout: '', stderr: '', exitCode: 0 };
    } catch (error) {
      return {
        cwd: displayCwd(cwd),
        stdout: '',
        stderr: `${error instanceof Error ? error.message : String(error)}\n`,
        exitCode: 1
      };
    }
  }

  return new Promise((resolve) => {
    const child = spawn('/bin/bash', ['-lc', command], {
      cwd,
      env: process.env
    });
    const chunks: string[] = [];
    const errors: string[] = [];
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      errors.push('Command timed out after 60 seconds.\n');
    }, 60_000);

    child.stdout.on('data', (data: Buffer) => {
      chunks.push(data.toString());
    });
    child.stderr.on('data', (data: Buffer) => {
      errors.push(data.toString());
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ cwd: displayCwd(cwd), stdout: '', stderr: `${error.message}\n`, exitCode: 1 });
    });
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      resolve({
        cwd: displayCwd(cwd),
        stdout: chunks.join('').slice(-50_000),
        stderr: errors.join('').slice(-50_000),
        exitCode: exitCode ?? 0
      });
    });
  });
});

app.whenReady().then(createWindow).catch((error) => {
  console.error('Failed to create CommandDeck window:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  for (const session of ptySessions.values()) {
    session.kill();
  }
  ptySessions.clear();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
