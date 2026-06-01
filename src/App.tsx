import { useEffect, useMemo, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import type { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  Bot,
  Boxes,
  HardDrive,
  LayoutPanelLeft,
  PanelLeftClose,
  Play,
  Plus,
  Save,
  Settings,
  ShieldAlert,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { authorizedAssets, toolkits } from './data/sampleData';
import type { ActionDefinition, AuthorizedAsset, CommandBlock, Job, Toolkit, WorkspaceSnapshot } from './domain/models';
import { buildCommandPreview, createCommandBlock, createJob, nextOutput, validateActionParams } from './domain/runtime';
import { type Language, t, tf } from './i18n/translations';
import { loadAISettings, saveAISettings } from './ai/client';
import type { AISettings } from './ai/client';
import { AIPanel } from './components/AIPanel';
import { SettingsPage } from './components/SettingsPage';
import './styles.css';

const workspaceId = 'default-lab';

type DockTool = 'toolkit' | 'sessions' | 'files' | 'ai' | 'settings';

type TerminalSession = {
  id: string;
  name: string;
  cwd: string;
};

type TerminalIdentity = {
  user: string;
  host: string;
  shell: string;
};

const initialSessions: TerminalSession[] = [
  {
    id: 'session-1',
    name: 'Session 1',
    cwd: '~'
  }
];

export default function App() {
  const [activeDockTool, setActiveDockTool] = useState<DockTool | null>('toolkit');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalIdentity, setTerminalIdentity] = useState<TerminalIdentity>({
    user: 'user',
    host: 'localhost',
    shell: '/bin/bash'
  });
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0].id);
  const [sessions, setSessions] = useState<TerminalSession[]>(initialSessions);
  const [visibleSessionIds, setVisibleSessionIds] = useState<string[]>([initialSessions[0].id]);
  const [nextSessionNumber, setNextSessionNumber] = useState(2);
  const [selectedToolkitId, setSelectedToolkitId] = useState(toolkits[0].id);
  const [selectedActionId, setSelectedActionId] = useState(toolkits[0].actions[0].id);
  const [params, setParams] = useState<Record<string, string>>({
    targetAssetId: authorizedAssets[0].id,
    ports: '1-1000',
    timing: 'T3',
    scheme: 'https',
    profile: 'balanced'
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [commandBlocks, setCommandBlocks] = useState<CommandBlock[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveState, setSaveState] = useState('not saved');
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem('commanddeck:lang') as Language) ?? 'zh';
    } catch {
      return 'zh';
    }
  });
  const [machineInfo, setMachineInfo] = useState<{
    primaryIp: string;
    tailscaleIp: string;
    hostname: string;
  }>({ primaryIp: '127.0.0.1', tailscaleIp: '', hostname: 'localhost' });
  const [actionFilter, setActionFilter] = useState('');
  const [aiSettings, setAISettings] = useState<AISettings>(loadAISettings);
  const xtermRefs = useRef<Map<string, Terminal>>(new Map());

  const toolDefinitions = useMemo(() => {
    return toolkits.flatMap((tk) => tk.actions).map((a) =>
      `- **${a.name}** (${a.risk} risk): ${a.description}\n  Target: ${a.targetPolicy.allowedAssetTypes.join(', ') || 'none'}\n  Params: ${a.params.map((p) => `${p.label}${p.required ? '*' : ''}`).join(', ')}`
    ).join('\n');
  }, []);

  const selectedToolkit = toolkits.find((toolkit) => toolkit.id === selectedToolkitId) ?? toolkits[0];
  const selectedAction = selectedToolkit.actions.find((action) => action.id === selectedActionId) ?? selectedToolkit.actions[0];
  const visibleSessions = visibleSessionIds
    .map((id) => sessions.find((session) => session.id === id))
    .filter((session): session is TerminalSession => Boolean(session));

  useEffect(() => {
    const terminalApi = window.terminalApi ?? window.commandDeckApi?.terminal;
    if (!terminalApi?.info) return;

    terminalApi.info().then((info) => {
      setTerminalIdentity({
        user: info.user,
        host: info.host,
        shell: info.shell
      });
      setSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.id === initialSessions[0].id
            ? { ...session, cwd: info.cwd }
            : session
        )
      );
    }).catch(() => undefined);

    const machineApi = window.machineApi ?? window.commandDeckApi?.machine;
    if (machineApi?.info) {
      machineApi.info().then((info) => {
        setMachineInfo({
          primaryIp: info.primaryIp,
          tailscaleIp: info.tailscaleIp,
          hostname: info.hostname
        });
      }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setJobs((currentJobs) =>
        currentJobs.map((job) => {
          if (job.status === 'queued') {
            return {
              ...job,
              status: 'running',
              startedAt: new Date().toISOString(),
              output: [...job.output, 'job.started: runtime claimed job']
            };
          }

          if (job.status === 'running' && job.output.length < 7) {
            return {
              ...job,
              output: [...job.output, nextOutput(job)]
            };
          }

          if (job.status === 'running') {
            return {
              ...job,
              status: 'completed',
              exitCode: 0,
              finishedAt: new Date().toISOString(),
              output: [...job.output, 'job.completed: exit code 0']
            };
          }

          return job;
        })
      );
    }, 1100);

    return () => window.clearInterval(intervalId);
  }, []);



  const snapshot = useMemo<WorkspaceSnapshot>(
    () => ({
      id: workspaceId,
      name: 'CommandDeck',
      selectedToolkitId,
      selectedActionId,
      jobs,
      commandBlocks,
      savedAt: new Date().toISOString()
    }),
    [commandBlocks, jobs, selectedActionId, selectedToolkitId]
  );

  function handleSelectToolkit(toolkitId: string) {
    const toolkit = toolkits.find((candidate) => candidate.id === toolkitId) ?? toolkits[0];
    setSelectedToolkitId(toolkit.id);
    setSelectedActionId(toolkit.actions[0].id);
    setValidationErrors([]);
  }

  function handleClickAction(actionId: string) {
    setSelectedActionId(actionId);
    setPendingActionId(actionId);
    setValidationErrors([]);
    // Pre-fill machine-specific defaults
    const action = toolkits.flatMap((tk) => tk.actions).find((a) => a.id === actionId);
    if (action) {
      const machineDefaults: Record<string, string> = {
        lhost: machineInfo.primaryIp || '127.0.0.1',
        interface: 'wlo1'
      };
      for (const param of action.params) {
        if (machineDefaults[param.id] && !params[param.id]) {
          handleParamChange(param.id, machineDefaults[param.id]);
        }
      }
    }
    setActionModalOpen(true);
  }

  function handleParamChange(paramId: string, value: string) {
    setParams((current) => ({ ...current, [paramId]: value }));
  }

  function writeCommandToPty(sessionId: string, command: string) {
    const terminalApi = window.terminalApi ?? window.commandDeckApi?.terminal;
    if (terminalApi) {
      void terminalApi.write({ id: sessionId, data: command });
    }
  }

  function getTerminalContext(): string {
    const lines: string[] = [];
    for (const [sessionId, terminal] of xtermRefs.current.entries()) {
      const session = sessions.find((s) => s.id === sessionId);
      const name = session?.name ?? sessionId;
      const buffer = terminal.buffer.active;
      const lastLines: string[] = [];
      for (let i = Math.max(0, buffer.length - 30); i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) lastLines.push(line.translateToString());
      }
      lines.push(`[${name}]`);
      lines.push(lastLines.join('\n'));
    }
    return lines.join('\n') || '(no terminal output)';
  }

  function handleWriteAICommand(command: string) {
    writeCommandToPty(activeSessionId, command);
  }

  function handleSaveAISettings(settings: AISettings) {
    setAISettings(settings);
    saveAISettings(settings);
  }

  function handleAddSession() {
    const sessionNumber = nextSessionNumber;
    const newSession: TerminalSession = {
      id: `session-${crypto.randomUUID().slice(0, 8)}`,
      name: `Session ${sessionNumber}`,
      cwd: '~'
    };

    setSessions((current) => [...current, newSession]);
    setActiveSessionId(newSession.id);
    setVisibleSessionIds((current) => [...current.slice(-3), newSession.id]);
    setNextSessionNumber((current) => current + 1);
  }

  function handleDeleteSession(sessionId: string) {
    if (sessions.length <= 1) return;

    const remainingSessions = sessions.filter((session) => session.id !== sessionId);
    setSessions(remainingSessions);
    setVisibleSessionIds((current) => {
      const nextVisibleIds = current.filter((id) => id !== sessionId);
      return nextVisibleIds.length > 0 ? nextVisibleIds : [remainingSessions[0].id];
    });

    if (activeSessionId === sessionId) {
      setActiveSessionId(remainingSessions[0].id);
    }
  }

  function handleShowSession(sessionId: string) {
    setVisibleSessionIds((current) => {
      if (current.includes(sessionId)) return current;
      return [...current.slice(-3), sessionId];
    });
    setActiveSessionId(sessionId);
  }

  function handleHideSession(sessionId: string) {
    setVisibleSessionIds((current) => {
      if (current.length <= 1) return current;
      const nextVisibleIds = current.filter((id) => id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(nextVisibleIds[0]);
      }
      return nextVisibleIds;
    });
  }

  function handleRunAction() {
    const errors = validateActionParams(selectedAction, params, authorizedAssets);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setActiveDockTool('toolkit');
      return;
    }

    if (selectedAction.risk === 'high') {
      const confirmed = window.confirm(
        `Run high risk action "${selectedAction.name}" against authorized asset ${params.targetAssetId}?`
      );
      if (!confirmed) return;
    }

    const preview = buildCommandPreview(selectedAction, params, authorizedAssets);
    const job = createJob(selectedAction, params);
    const block = createCommandBlock(job, preview);
    setJobs((current) => [job, ...current]);
    setCommandBlocks((current) => [block, ...current]);

    // Write the command directly into the active PTY terminal session.
    // The command appears at the shell prompt; press Enter to execute.
    writeCommandToPty(activeSessionId, preview);
    setValidationErrors([]);
  }

  async function handleSave() {
    if (!window.workspaceApi) {
      setSaveState('save only works in Electron');
      return;
    }

    const result = await window.workspaceApi.save(snapshot);
    setSaveState(`saved ${result.filePath}`);
  }

  async function handleLoad() {
    if (!window.workspaceApi) {
      setSaveState('load only works in Electron');
      return;
    }

    const loaded = (await window.workspaceApi.load()) as WorkspaceSnapshot | null;
    if (!loaded) {
      setSaveState('no saved workspace');
      return;
    }

    setSelectedToolkitId(loaded.selectedToolkitId);
    setSelectedActionId(loaded.selectedActionId);
    setJobs(loaded.jobs);
    setCommandBlocks(loaded.commandBlocks);
    setSaveState(`loaded ${loaded.savedAt}`);
  }

  return (
    <>
    <div className={(activeDockTool && !settingsOpen) ? 'app-frame sidebar-open' : 'app-frame'}>
      <ToolDock
        activeTool={activeDockTool}
        settingsOpen={settingsOpen}
        lang={lang}
        onSelectTool={(tool) => setActiveDockTool((current) => (current === tool ? null : tool))}
        onToggleSettings={() => setSettingsOpen((prev) => !prev)}
      />

      {(activeDockTool && !settingsOpen) && (
        <aside className="slidebar">
          <SlidebarHeader activeTool={activeDockTool} onClose={() => setActiveDockTool(null)} />
          {activeDockTool === 'toolkit' && (
            <ToolkitSlidebar
              toolkits={toolkits}
              selectedToolkit={selectedToolkit}
              selectedActionId={selectedActionId}
              selectedToolkitId={selectedToolkitId}
              filter={actionFilter}
              lang={lang}
              onSelectToolkit={handleSelectToolkit}
              onSelectAction={handleClickAction}
              onFilterChange={setActionFilter}
            />
          )}
          {activeDockTool === 'sessions' && (
            <SessionsSlidebar
              activeSessionId={activeSessionId}
              visibleSessionIds={visibleSessionIds}
              sessions={sessions}
              lang={lang}
              onSelectSession={setActiveSessionId}
              onShowSession={handleShowSession}
              onHideSession={handleHideSession}
              onAddSession={handleAddSession}
              onDeleteSession={handleDeleteSession}
            />
          )}
          {activeDockTool === 'files' && <QuietPanel title={t(lang, 'filesPanel')} body={t(lang, 'filesPanelBody')} />}

          {activeDockTool === 'ai' && (
            <AIPanel
              lang={lang}
              settings={aiSettings}
              toolDefinitions={toolDefinitions}
              onGetTerminalContext={getTerminalContext}
              onWriteToTerminal={handleWriteAICommand}
              onOpenSettings={() => { setActiveDockTool(null); setSettingsOpen(true); }}
              onClose={() => setActiveDockTool(null)}
            />
          )}
        </aside>
      )}

      {actionModalOpen && (
        <ActionModal
          action={selectedAction}
          params={params}
          assets={authorizedAssets}
          validationErrors={validationErrors}
          lang={lang}
          onParamChange={handleParamChange}
          onRun={() => {
            handleRunAction();
            setActionModalOpen(false);
          }}
          onClose={() => {
            setActionModalOpen(false);
            setValidationErrors([]);
          }}
        />
      )}

      <main className="terminal-workspace">
        <header className="workspace-header">
          <div>
            <strong>{t(lang, 'appName')}</strong>
            <span>{tf(lang, 'appSubtitle', { visible: visibleSessions.length, total: sessions.length })}</span>
          </div>
          <div className="header-actions">
            <button type="button" onClick={handleAddSession} title={t(lang, 'addTerminal')}>
              <Plus size={16} />
              {t(lang, 'headerAddSession')}
            </button>
            <button type="button" onClick={handleSave} title={t(lang, 'save')}>
              <Save size={16} />
              {t(lang, 'headerSave')}
            </button>
          </div>
        </header>

        <section className={`terminal-grid session-count-${visibleSessions.length}`}>
          {visibleSessions.map((session) => (
            <TerminalPane
              key={session.id}
              session={session}
              identity={terminalIdentity}
              active={session.id === activeSessionId}
              onFocus={() => setActiveSessionId(session.id)}
              onDelete={() => handleDeleteSession(session.id)}
              onHide={() => handleHideSession(session.id)}
              canDelete={sessions.length > 1}
              canHide={visibleSessions.length > 1}
              onRegisterTerminal={(id, term) => { xtermRefs.current.set(id, term); }}
              onUnregisterTerminal={(id) => { xtermRefs.current.delete(id); }}
            />
          ))}
        </section>
      </main>
    </div>

      {settingsOpen && (
        <SettingsPage
          lang={lang}
          aiSettings={aiSettings}
          saveState={saveState}
          onSaveAISettings={handleSaveAISettings}
          onLanguageChange={(newLang) => {
            setLang(newLang);
            try { localStorage.setItem('commanddeck:lang', newLang); } catch { /* noop */ }
          }}
          onSave={handleSave}
          onLoad={handleLoad}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

function ToolDock({
  activeTool,
  settingsOpen,
  lang,
  onSelectTool,
  onToggleSettings
}: {
  activeTool: DockTool | null;
  settingsOpen: boolean;
  lang: Language;
  onSelectTool: (tool: DockTool) => void;
  onToggleSettings: () => void;
}) {
  const tools: Array<{ id: DockTool; label: string; icon: React.ReactNode }> = [
    { id: 'toolkit', label: t(lang, 'dockToolkit'), icon: <Wrench size={21} /> },
    { id: 'sessions', label: t(lang, 'dockSessions'), icon: <LayoutPanelLeft size={21} /> },
    { id: 'files', label: t(lang, 'dockFiles'), icon: <HardDrive size={21} /> },
    { id: 'ai', label: t(lang, 'dockAI'), icon: <Bot size={21} /> }
  ];

  return (
    <nav className="tool-dock" aria-label="Primary tools">
      <div className="dock-mark">
        <Boxes size={24} />
      </div>
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={activeTool === tool.id ? 'dock-button active' : 'dock-button'}
          onClick={() => onSelectTool(tool.id)}
          title={tool.label}
          aria-label={tool.label}
        >
          {tool.icon}
        </button>
      ))}
      <button
        type="button"
        className={settingsOpen ? 'dock-button active' : 'dock-button'}
        onClick={onToggleSettings}
        title={t(lang, 'dockSettings')}
        aria-label={t(lang, 'dockSettings')}
      >
        <Settings size={21} />
      </button>
    </nav>
  );
}

function SlidebarHeader({ activeTool, onClose }: { activeTool: DockTool; onClose: () => void }) {
  const title: Record<DockTool, string> = {
    toolkit: 'Tools',
    sessions: 'Sessions',
    files: 'Files',
    ai: 'AI Helper',
    settings: 'Settings'
  };

  return (
    <div className="slidebar-header">
      <strong>{title[activeTool]}</strong>
      <button type="button" onClick={onClose} title="Close panel">
        <PanelLeftClose size={17} />
      </button>
    </div>
  );
}

function ToolkitSlidebar({
  toolkits,
  selectedToolkit,
  selectedActionId,
  selectedToolkitId,
  filter,
  lang,
  onSelectToolkit,
  onSelectAction,
  onFilterChange
}: {
  toolkits: Toolkit[];
  selectedToolkit: Toolkit;
  selectedActionId: string;
  selectedToolkitId: string;
  filter: string;
  lang: Language;
  onSelectToolkit: (toolkitId: string) => void;
  onSelectAction: (actionId: string) => void;
  onFilterChange: (value: string) => void;
}) {
  const lowerFilter = filter.toLowerCase();
  const filteredActions = selectedToolkit.actions.filter(
    (a) => !lowerFilter || a.name.toLowerCase().includes(lowerFilter) || a.description.toLowerCase().includes(lowerFilter)
  );

  return (
    <div className="slidebar-body">
      <label className="field">
        <span>{t(lang, 'toolkitLabel')}</span>
        <select value={selectedToolkitId} onChange={(event) => onSelectToolkit(event.target.value)}>
          {toolkits.map((toolkit) => (
            <option key={toolkit.id} value={toolkit.id}>
              {toolkit.name}
            </option>
          ))}
        </select>
      </label>

      <input
        className="filter-input"
        type="text"
        placeholder={t(lang, 'filterPlaceholder')}
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
      />

      <div className="action-stack">
        {filteredActions.length === 0 ? (
          <p className="tool-hint">無符合結果 / No results</p>
        ) : (
          filteredActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={action.id === selectedActionId ? 'action-card active' : 'action-card'}
              onClick={() => onSelectAction(action.id)}
            >
              <span>{action.name}</span>
              <small className={`risk ${action.risk}`}>{action.risk}</small>
            </button>
          ))
        )}
      </div>

      <p className="tool-hint">{t(lang, 'filterToolHint')}</p>
    </div>
  );
}

function ActionModal({
  action,
  params,
  assets,
  validationErrors,
  lang,
  onParamChange,
  onRun,
  onClose
}: {
  action: ActionDefinition;
  params: Record<string, string>;
  assets: AuthorizedAsset[];
  validationErrors: string[];
  lang: Language;
  onParamChange: (paramId: string, value: string) => void;
  onRun: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{action.name}</h2>
            <small className={`risk ${action.risk}`}>{action.risk}</small>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <p className="modal-desc">{action.description}</p>

          <div className="modal-params">
            {action.params.map((param) => (
              <label className="field" key={param.id}>
                <span>{param.label}</span>
                {param.type === 'asset' ? (
                  <select
                    value={params[param.id] ?? ''}
                    onChange={(event) => onParamChange(param.id, event.target.value)}
                  >
                    <option value="">Choose authorized asset</option>
                    {assets
                      .filter((asset) =>
                        action.targetPolicy.allowedAssetTypes.includes(asset.type)
                      )
                      .map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} ({asset.scope})
                        </option>
                      ))}
                  </select>
                ) : param.type === 'select' ? (
                  <select
                    value={params[param.id] ?? param.defaultValue ?? ''}
                    onChange={(event) => onParamChange(param.id, event.target.value)}
                  >
                    {param.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={params[param.id] ?? param.defaultValue ?? ''}
                    onChange={(event) => onParamChange(param.id, event.target.value)}
                    placeholder={param.defaultValue}
                  />
                )}
              </label>
            ))}
          </div>

          {validationErrors.length > 0 && (
            <div className="validation-box">
              {validationErrors.map((error) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          )}

          {action.risk === 'high' && (
            <div className="risk-warning">
              <ShieldAlert size={17} />
              {t(lang, 'modalRiskHigh')}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            {t(lang, 'modalCancel')}
          </button>
          <button type="button" className="run-button modal-run" onClick={onRun}>
            <Play size={18} />
            {t(lang, 'modalRun')}
          </button>
        </footer>
      </div>
    </div>
  );
}

function SessionsSlidebar({
  activeSessionId,
  visibleSessionIds,
  sessions,
  lang,
  onSelectSession,
  onShowSession,
  onHideSession,
  onAddSession,
  onDeleteSession
}: {
  activeSessionId: string;
  visibleSessionIds: string[];
  sessions: TerminalSession[];
  lang: Language;
  onSelectSession: (sessionId: string) => void;
  onShowSession: (sessionId: string) => void;
  onHideSession: (sessionId: string) => void;
  onAddSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  return (
    <div className="slidebar-body">
      <button className="run-button" type="button" onClick={onAddSession}>
        <Plus size={18} />
        {t(lang, 'addTerminal')}
      </button>

      <div className="action-stack">
        {sessions.map((session) => (
          <div key={session.id} className={session.id === activeSessionId ? 'session-row active' : 'session-row'}>
            <button type="button" onClick={() => onSelectSession(session.id)}>
              <span>{session.name}</span>
              <small>{visibleSessionIds.includes(session.id) ? t(lang, 'visible') : t(lang, 'hidden')}</small>
            </button>
            {visibleSessionIds.includes(session.id) ? (
              <button
                type="button"
                className="icon-button"
                disabled={visibleSessionIds.length <= 1}
                onClick={() => onHideSession(session.id)}
                title={t(lang, 'hideSession')}
              >
                ×
              </button>
            ) : (
              <button
                type="button"
                className="icon-button"
                onClick={() => onShowSession(session.id)}
                title={t(lang, 'showSession')}
              >
                +
              </button>
            )}
            <button
              type="button"
              className="icon-danger"
              disabled={sessions.length <= 1}
              onClick={() => onDeleteSession(session.id)}
              title={t(lang, 'deleteSession')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function QuietPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="slidebar-body">
      <div className="sidebar-section">
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  );
}

function TerminalPane({
  session,
  identity,
  active,
  onFocus,
  onDelete,
  onHide,
  canDelete,
  canHide,
  onRegisterTerminal,
  onUnregisterTerminal
}: {
  session: TerminalSession;
  identity: TerminalIdentity;
  active: boolean;
  onFocus: () => void;
  onDelete: () => void;
  onHide: () => void;
  canDelete: boolean;
  canHide: boolean;
  onRegisterTerminal?: (id: string, term: Terminal) => void;
  onUnregisterTerminal?: (id: string) => void;
}) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminalApi = window.terminalApi ?? window.commandDeckApi?.terminal;
    const terminal = new XTerm({
      allowProposedApi: true,
      cursorBlink: true,
      convertEol: true,
      fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
      fontSize: 13,
      scrollback: 8000,
      theme: {
        background: '#090d11',
        foreground: '#dce5ec',
        cursor: '#76d69a',
        selectionBackground: '#2f7fad66'
      }
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;
    onRegisterTerminal?.(session.id, terminal);

    if (!terminalApi) {
      terminal.writeln('Terminal bridge is unavailable. Reinstall the latest CommandDeck package and relaunch.');
      return () => terminal.dispose();
    }

    const offData = terminalApi.onData(session.id, (data) => terminal.write(data));
    const offExit = terminalApi.onExit(session.id, ({ exitCode }) => {
      terminal.writeln(`\r\n[process exited: ${exitCode}]`);
    });
    const outputListener = (event: Event) => {
      const payload = event as CustomEvent<string>;
      terminal.write(payload.detail);
    };
    window.addEventListener(`commanddeck:terminal-output:${session.id}`, outputListener);
    terminal.onData((data) => {
      void terminalApi.write({ id: session.id, data });
    });

    void terminalApi.create({
      id: session.id,
      cwd: session.cwd,
      cols: terminal.cols,
      rows: terminal.rows
    }).then(() => {
      terminal.focus();
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      void terminalApi.resize({ id: session.id, cols: terminal.cols, rows: terminal.rows });
    });
    resizeObserver.observe(terminalRef.current);

    return () => { try {
      resizeObserver.disconnect();
      window.removeEventListener(`commanddeck:terminal-output:${session.id}`, outputListener);
      offData();
      offExit();
      void terminalApi.kill({ id: session.id });
      onUnregisterTerminal?.(session.id);
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    } catch (e) { console.warn("TerminalPane cleanup error:", e); } };
  }, [session.cwd, session.id]);

  useEffect(() => {
    if (active) xtermRef.current?.focus();
  }, [active]);

  return (
    <article className={active ? 'terminal-pane active' : 'terminal-pane'} onClick={onFocus}>
      <header className="terminal-pane-header">
        <span>{session.name}</span>
        <div>
          <code>{identity.user}@{identity.host}</code>
          <button
            type="button"
            disabled={!canHide}
            onClick={(event) => {
              event.stopPropagation();
              onHide();
            }}
            title={`Hide ${session.name}`}
          >
            ×
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            title={`Delete ${session.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>
      <div className="xterm-host" ref={terminalRef} />
    </article>
  );
}
