import { Columns3, FolderOpen, Save, Settings, ShieldCheck } from 'lucide-react';

type TopBarProps = {
  workspaceName: string;
  onSave: () => void;
  onLoad: () => void;
  saveState: string;
};

export function TopBar({ workspaceName, onSave, onLoad, saveState }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <ShieldCheck size={22} />
        <div>
          <strong>{workspaceName}</strong>
          <span>Command workspace app</span>
        </div>
      </div>
      <nav className="topbar-actions" aria-label="Workspace actions">
        <button type="button" onClick={onSave} title="Save workspace">
          <Save size={17} />
          Save
        </button>
        <button type="button" onClick={onLoad} title="Load workspace">
          <FolderOpen size={17} />
          Load
        </button>
        <button type="button" title="Create pane">
          <Columns3 size={17} />
          New Pane
        </button>
        <button type="button" title="Settings">
          <Settings size={17} />
        </button>
        <span className="save-state">{saveState}</span>
      </nav>
    </header>
  );
}
