# CommandDeck

A desktop command workspace app for terminals, command blocks, toolkit actions,
job runtime state, live output, files, system info, renderers, and plugins.

**Current version: 0.6.4** — Kali Toolkit with 40 tools, real PTY/xterm terminals,
modal action dialogs, bilingual UI (中文/English), and tool search/filter.

## Quick Start

```bash
npm install
npm run build
npm run package:deb      # creates release/*.deb
```

Dev mode (Electron + Vite HMR):

```bash
npm run dev
```

This project targets Node 22 or newer. On the Desktop machine:

```bash
cd ~/文件/CommandDeck
npm run dev
```

To install the Debian package:

```bash
sudo apt install ./release/commanddeck_0.6.4_amd64.deb
# or
sudo apt install ~/下載/CommandDeck-0.6.4-kali-amd64.deb
```

The dev script uses `--no-sandbox` because local Linux Electron installs often
lack root-owned `chrome-sandbox` permissions. The renderer uses context
isolation, disabled `nodeIntegration`, and a narrow preload bridge.

## Features

### Terminal Engine
- 4-pane PTY/xterm terminal grid
- Real shell sessions via `node-pty`
- Independent session create/delete/show/hide
- Command insertion: tools write directly to PTY stdin

### Kali Toolkit (40 actions)
- **Network Recon**: nmap quick, full TCP, service/OS, UDP, vuln, SMB enum
- **Web Enumeration**: gobuster dir/vhost, ffuf dir/vhost, dirb, nikto, whatweb, wpscan basic/full
- **SQL Injection**: sqlmap basic, list DBs, dump table
- **SMB/Windows**: enum4linux, smbclient, smbmap, rpcclient, crackmapexec
- **Password Attacks**: hydra ssh/ftp/http, john, hashcat
- **Exploitation**: searchsploit, msfvenom, msfconsole
- **Sniffing**: tcpdump, tshark
- **Forensics**: binwalk, exiftool
- **Netcat**: listener, connect
- **DNS**: dig (ANY/A/MX/NS/AXFR)

### UI
- **Tool search/filter**: type to filter 40 tools instantly
- **Action modal**: click a tool → centered dialog with parameters → Run
- **Bilingual**: 中文 / English, toggle in Settings
- **Machine-aware defaults**: auto-detects local IP for LHOST, interface, etc.
- **Authorized assets**: target selection limited to asset inventory

## Project Layout

```text
electron/          Electron main process, IPC handlers, PTY management
  main.ts          App lifecycle, IPC: terminal, machine, workspace
  preload.ts       Context bridge (terminalApi, machineApi, workspaceApi)
src/
  App.tsx          Main React app + all components (single file)
  main.tsx         React entry point
  styles.css       All application styles
  vite-env.d.ts    Window type declarations for preload APIs
  data/
    sampleData.ts  40 Kali actions + authorized assets
  domain/
    models.ts      TypeScript types (Toolkit, Action, Job, etc.)
    runtime.ts     Command builder, param validation, job simulation
  i18n/
    translations.ts  zh/en translation map + t() / tf() helpers
  components/      Legacy components (superseded by inline App.tsx)
docs/
  ARCHITECTURE.md  Full architecture document
  PTY_XTERM_ARCHITECTURE.md  Terminal engine design
packaging/
  CommandDeck.desktop  Desktop entry template
```

## Architecture Docs

- [Full Architecture](docs/ARCHITECTURE.md) — component map, data flow, security model
- [PTY/xterm Terminal Architecture](docs/PTY_XTERM_ARCHITECTURE.md) — terminal engine detail

## Safety Model

- UI can only create jobs through allowlisted actions in the action registry.
- Action params are validated before execution.
- Target assets must come from the authorized asset inventory.
- High-risk actions trigger explicit confirmation.
- Commands are built by `buildCommandPreview()` in the runtime layer.
- The user always has final control (press Enter to execute in terminal).
