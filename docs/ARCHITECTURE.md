# CommandDeck Architecture

CommandDeck is a desktop Linux command workbench. It treats commands,
outputs, jobs, assets, renderers, and toolkits as first-class workspace objects.

The app is terminal-first: the center is a true PTY-backed xterm workspace with
up to 4 simultaneous terminal panes, while toolkits, sessions, files, AI, and
settings live in left-dock slidebars. Actions are configured in a modal dialog
and written directly into the active PTY terminal.

## Current Scope (v0.6.4)

### Terminal Engine
- Real PTY sessions powered by `node-pty` (one PTY per session).
- Terminal rendering via `@xterm/xterm` + `@xterm/addon-fit`.
- `terminalApi` preload bridge: create/write/resize/kill PTY.
- Bidirectional I/O: xterm → PTY (keyboard), PTY → xterm (shell output).
- 4-pane grid layout (`minmax(0, 1fr)`), xterm scrollback (8000 lines).
- Session sidebar: create, delete, show/hide, switch active.

### Kali Toolkit (40 actions, 11 categories)
| Category | Tools |
|---|---|
| Network Recon | nmap (quick/full TCP/service+OS/UDP/vuln/SMB enum) |
| Web Enumeration | gobuster dir/vhost, ffuf dir/vhost, dirb, nikto, whatweb, wpscan basic/full enum |
| SQL Injection | sqlmap basic/dbs/dump |
| SMB/Windows | enum4linux, smbclient, smbmap, rpcclient, crackmapexec |
| Password Attacks | hydra ssh/ftp/http, john, hashcat |
| Exploitation | searchsploit, msfvenom, msfconsole |
| Sniffing | tcpdump, tshark |
| Forensics | binwalk, exiftool |
| Netcat | listener, connect |
| DNS | dig (ANY/A/MX/NS/AXFR) |

### Action Flow
1. Left sidebar → select toolkit → filter/search tools.
2. **Click tool** → modal dialog opens (overlay on workspace).
3. Configure parameters in dialog (target asset, ports, wordlist, etc.).
4. Click **Run Action** → `buildCommandPreview()` builds CLI string.
5. Command written to active PTY via `terminalApi.write()`.
6. User presses Enter to execute (or edits first).

### UI Architecture
```
┌──────┬─────────────┬────────────────────────┐
│ Dock │  Slidebar   │   Terminal Workspace    │
│  🛠  │  Toolkit    │  ┌────────┬──────────┐  │
│  📋  │  Filter     │  │ TTY 1  │  TTY 2   │  │
│  📁  │  ─────      │  ├────────┼──────────┤  │
│  🤖  │  Tool list  │  │ TTY 3  │  TTY 4   │  │
│  ⚙  │             │  └────────┴──────────┘  │
└──────┴─────────────┴────────────────────────┘
         ↑                       ↑
    Slidebar panels       │  Action Modal (overlay)
    (toolkit/sessions/    │  ┌──────────────────┐
     files/AI/settings)   │  │  Nmap Quick Scan  │
                          │  │  Target: [select] │
                          │  │  Timing: [T4 ▾ ]  │
                          │  │  [Cancel] [Run ▶]│
                          │  └──────────────────┘
```

### Component Map
| Component | File | Role |
|---|---|---|
| `App` | `src/App.tsx` | Root: state, action flow, PTY bridge |
| `ToolDock` | `App.tsx` | Left icon dock (5 tools) |
| `ToolkitSlidebar` | `App.tsx` | Toolkit selector + filter + action list |
| `ActionModal` | `App.tsx` | Centered dialog: params + run/cancel |
| `SessionsSlidebar` | `App.tsx` | Session list: add/delete/show/hide |
| `SettingsSlidebar` | `App.tsx` | Language toggle + workspace save/load |
| `TerminalPane` | `App.tsx` | xterm.js + PTY lifecycle per pane |
| `QuietPanel` | `App.tsx` | Placeholder panels (files, AI) |

### i18n System
- Bilingual: 中文 (zh) / English (en).
- `src/i18n/translations.ts`: translation map + `t()`, `tf()` helpers.
- Language persisted in `localStorage`.
- Toggle in Settings panel.

### Machine Info
- `machine:info` IPC handler in `electron/main.ts`.
- Returns: hostname, user, primary IP, Tailscale IP, all network interfaces.
- Used to pre-fill params: LHOST (msfvenom), interface (tcpdump).

### Electron Bridge (`electron/preload.ts`)
| API | Methods |
|---|---|
| `terminalApi` | info, create, write, resize, kill, onData, onExit, run |
| `machineApi` | info (network interfaces, IPs) |
| `workspaceApi` | save, load (JSON workspace snapshots) |
| `commandDeckApi` | umbrella: workspace + terminal + machine |

### Security Rules
- Frontend does **not** execute arbitrary shell commands.
- Actions must come from the action registry (`sampleData.ts`).
- Targets must come from the authorized asset inventory.
- `buildCommandPreview()` builds the command string; only written to PTY.
- High-risk actions require explicit confirmation.
- The user always has final control (press Enter to execute).

### Data Flow
```
Action Registry (sampleData.ts)
  → ToolkitSlidebar (filter/select)
  → ActionModal (configure params)
  → runtime.buildCommandPreview() (build CLI string)
  → App.handleRunAction() (validate + confirm)
  → terminalApi.write({ id, data }) (→ preload → IPC → node-pty)
  → Shell prompt (command appears, user presses Enter)
```

## Files
```
src/
  App.tsx              Main app + all components
  main.tsx             React entry point
  styles.css           All styles
  vite-env.d.ts        Window type declarations
  data/
    sampleData.ts      40 Kali actions + authorized assets
  domain/
    models.ts          TypeScript types (Toolkit, Action, Job, etc.)
    runtime.ts         buildCommandPreview, validateActionParams, job simulation
  i18n/
    translations.ts    zh/en translation map + helpers
  components/          Legacy components (superseded by inline components in App.tsx)
electron/
  main.ts              Electron main process, IPC handlers, PTY management
  preload.ts           Context bridge (terminal, machine, workspace APIs)
docs/
  ARCHITECTURE.md      This file
  PTY_XTERM_ARCHITECTURE.md  Terminal engine detail
packaging/
  CommandDeck.desktop  Desktop entry template
```

## Build & Package
```bash
# Dev
npm run dev

# Build
npm run build          # tsc + vite + electron tsc

# Package .deb
npm run package:deb    # build + electron-builder --linux deb --x64

# Typecheck only
npm run typecheck
```

Note: When cross-building (e.g., compiling on a machine with newer glibc),
`node-pty` must be rebuilt on the target machine to match its glibc.
The workaround: `electron-builder --linux --x64 --dir` then manual `dpkg-deb`.
