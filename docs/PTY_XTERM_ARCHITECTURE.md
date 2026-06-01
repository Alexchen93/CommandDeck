# CommandDeck PTY/xterm Architecture

## Goal

CommandDeck should feel like a real Linux terminal app, not a form that runs
one-shot commands. The terminal area must support interactive programs such as
`ranger`, `vim`, `top`, `ssh`, REPLs, long-running scripts, resize events,
scrollback, and multiple persistent sessions.

The product shape is:

- A narrow left dock for Tools, Sessions, Files, AI, and Settings.
- A slidebar that opens only when the user picks a dock item.
- A central terminal workspace.
- Unlimited session records.
- Up to four visible terminal panes at one time.
- User-controlled show, hide, add, and delete per session.

## High-Level Architecture

```text
Electron Main Process
├─ Window lifecycle
├─ Workspace persistence IPC
├─ PTY Manager
│  ├─ create session
│  ├─ write input
│  ├─ resize terminal
│  ├─ stream PTY output
│  └─ kill session
├─ Terminal metadata
│  ├─ user
│  ├─ host
│  ├─ shell
│  └─ home cwd
└─ Toolkit/job runtime bridge

Electron Preload
├─ workspaceApi
└─ terminalApi
   ├─ info()
   ├─ create()
   ├─ write()
   ├─ resize()
   ├─ kill()
   ├─ onData()
   └─ onExit()

React Renderer
├─ App state
│  ├─ sessions[]
│  ├─ visibleSessionIds[]
│  ├─ activeSessionId
│  ├─ toolkit/action state
│  └─ workspace save/load state
├─ Left dock
├─ Slidebar panels
└─ TerminalPane
   ├─ xterm instance
   ├─ FitAddon
   ├─ ResizeObserver
   ├─ PTY output subscription
   └─ keyboard input forwarding
```

## Main Process Responsibilities

The Electron main process owns real OS access. Renderer code must not import
Node APIs directly.

Current PTY responsibilities:

```ts
const ptySessions = new Map<string, pty.IPty>();
```

- `terminal:info`
  Returns user, host, shell, home, and display cwd.

- `terminal:create`
  Creates a `node-pty` shell process using the requested session id, cwd, rows,
  and columns.

- `terminal:write`
  Writes raw keyboard/input bytes from xterm into the PTY.

- `terminal:resize`
  Resizes the PTY when the xterm pane changes size.

- `terminal:kill`
  Terminates the PTY for a deleted or unmounted terminal session.

- `terminal:data:{id}`
  Pushes PTY output to the renderer.

- `terminal:exit:{id}`
  Notifies the renderer when the PTY exits.

The main process also still contains a one-shot `terminal:run` path for legacy
commands and helper functions such as the current fake `ranger/files` preview.
The long-term terminal path should be PTY-first.

## Preload Boundary

The preload bridge exposes only narrow APIs:

```ts
window.terminalApi = {
  info,
  create,
  write,
  resize,
  kill,
  onData,
  onExit,
  run
}
```

Security settings:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: false`

`sandbox: false` is currently used because the preload must reliably access
Electron IPC and expose the bridge. The renderer still does not get direct Node
access.

## Renderer Terminal Model

Each session is a logical terminal record:

```ts
type TerminalSession = {
  id: string;
  name: string;
  cwd: string;
};
```

The renderer tracks:

- `sessions`: all created terminal sessions.
- `visibleSessionIds`: the subset currently shown in the workspace.
- `activeSessionId`: the session receiving toolkit output and focus.

Important behavior:

- Session count is not capped.
- Visible panes are capped at four.
- Adding a new session appends it to `sessions`.
- If four panes are already visible, showing another session removes the oldest
  visible id from `visibleSessionIds`, but does not delete that session.
- Deleting a session kills its PTY and removes it from both session lists.
- Hiding a session removes it from `visibleSessionIds`, but preserves the
  session record unless the terminal component unmount currently kills the PTY.

## xterm Pane Lifecycle

Each visible `TerminalPane` owns one xterm instance.

```text
mount TerminalPane
  -> create xterm
  -> load FitAddon
  -> open into DOM
  -> terminalApi.create(session id, cwd, cols, rows)
  -> subscribe terminal:data:{id}
  -> forward xterm.onData to terminalApi.write
  -> observe size and call terminalApi.resize

unmount TerminalPane
  -> unsubscribe IPC listeners
  -> kill PTY
  -> dispose xterm
```

Current caveat:

Hiding a terminal unmounts its `TerminalPane`, which kills the PTY. This is
acceptable for the current MVP but not ideal for a mature workspace. The next
architecture step is to move PTY lifecycle from pane visibility to logical
session lifecycle, so hidden sessions can keep running.

## Terminal UX Requirements

Required terminal behavior:

- Prompt shows real user and hostname through the shell prompt.
- Input is typed directly inside xterm, not in a separate bottom input box.
- Scrollback stays inside the pane.
- Pane dimensions stay fixed; output scrolls instead of expanding layout.
- Resizing a pane resizes the PTY.
- Long-running and interactive commands work.
- `ranger`, `vim`, `top`, `ssh`, and REPLs should be usable because PTY input
  and output are raw streams.

CSS/layout requirements:

- `.terminal-grid` owns the workspace area.
- `.terminal-pane` has stable height and width.
- `.xterm-host` must use `min-height: 0`, `overflow: hidden`, and fill its grid
  cell.
- xterm handles internal scrollback. The outer app should not grow vertically as
  output increases.

For 2x2 layouts, every grid track must use `minmax(0, 1fr)` instead of plain
`1fr`. CSS grid items default to `min-height: auto`, which lets long terminal
output stretch the row and push the lower panes out of view. CommandDeck
therefore applies containment at every layer:

```css
.terminal-workspace,
.terminal-grid,
.terminal-pane,
.xterm-host {
  min-height: 0;
  overflow: hidden;
}

.terminal-grid.session-count-4 {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
}
```

The expected behavior is fixed pane geometry with scrollback inside xterm, not
layout growth from command output.

## Session Visibility Model

Session management should distinguish three concepts:

```text
created session
  A logical terminal session known by the workspace.

visible session
  A created session currently mounted in the terminal grid.

active session
  The session receiving focus, toolkit annotations, and command block output.
```

Recommended future model:

```ts
type TerminalSession = {
  id: string;
  name: string;
  cwd: string;
  createdAt: string;
  lastActiveAt: string;
  status: 'starting' | 'running' | 'exited' | 'hidden';
  ptyId: string;
};

type WorkspaceTerminalLayout = {
  visibleSessionIds: string[];
  activeSessionId: string;
};
```

Visibility should not equal process lifetime. A hidden session should continue
running unless the user explicitly stops or deletes it.

## Toolkit Integration

Toolkit actions are not the same as normal terminal input.

Normal terminal:

- User types arbitrary shell commands into a PTY.
- It behaves like a standard terminal.
- It uses the current user permissions and OS shell.

Toolkit action:

- User selects an allowlisted action.
- Params are validated.
- High risk actions ask for confirmation.
- Target assets must come from authorized inventory.
- The job result can be echoed into the active terminal as a command block
  annotation.

This keeps normal terminal ergonomics while preserving the safer action registry
for Kali/security workflows.

## Security Boundary

The app has two execution surfaces:

1. PTY terminal surface
   - Intended to behave like a local terminal.
   - Runs as the current OS user.
   - Should be clearly scoped as local user execution.
   - No extra privilege escalation.

2. Toolkit/action surface
   - Allowlisted.
   - Parameter validated.
   - Audited.
   - High-risk actions confirmed.
   - Security tools should default to container or VM execution.
   - Authorized asset inventory gates targets.

The two surfaces should stay visually and architecturally distinct.

## Implementation Roadmap

### Phase 1: Stabilize PTY/xterm

- Keep one `node-pty` process per logical session.
- Do not kill PTY when a pane is merely hidden.
- Reattach hidden sessions when shown again.
- Add explicit session status: running, exited, hidden.
- Add reconnect output marker when a hidden session is shown again.

### Phase 2: Persist Workspace Layout

- Save sessions metadata.
- Save visible session ids.
- Save active session id.
- Restore layout on app open.
- Do not blindly restore old shell processes after app restart; restart
  terminals with a clear restored-session marker.

### Phase 3: Terminal Blocks

- Detect shell prompt boundaries where possible.
- Store command start/end timestamps.
- Attach command output ranges to command blocks.
- Allow pin/export/rerun from a command block.
- Keep raw xterm output as the source of truth for interactive sessions.

### Phase 4: Toolkit Runtime

- Move mock jobs into the backend runtime.
- Add SQLite job/audit/artifact tables.
- Stream toolkit job output to both Job UI and active terminal annotations.
- Add container/VM executors for Kali-style toolkits.

### Phase 5: UX Polish

- Rename sessions.
- Drag reorder visible panes.
- Move session to a specific pane.
- Split active pane horizontally/vertically.
- Add terminal search.
- Add copy/paste context menu.
- Add theme/font settings.
- Add keyboard shortcuts.

## Current Known Gaps

- Hidden sessions currently lose their PTY because pane unmount kills the
  process.
- Session cwd in React is initialized but not continuously synchronized from the
  interactive shell after arbitrary `cd`.
- Toolkit job output is annotated into the active terminal but is not yet a true
  terminal block data structure.
- The Go backend is still a skeleton and not yet the source of truth for
  execution.
- The file/ranger UI is a helper preview, not a full TUI file manager embedded
  as a first-class widget.

## Recommended Next Task

Implement persistent hidden PTY sessions:

1. Move PTY lifecycle ownership out of `TerminalPane`.
2. Create PTY when a session is created.
3. Keep PTY running when a pane hides.
4. Store output buffer per session in renderer state or main process.
5. Reattach xterm to live session output when shown.
6. Kill PTY only when user deletes the session or app exits.
