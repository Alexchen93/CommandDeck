import { Pin, RotateCcw, Square, Terminal } from 'lucide-react';
import type { CommandBlock, Job } from '../domain/models';

type WorkspaceCenterProps = {
  commandBlocks: CommandBlock[];
  jobs: Job[];
  terminalDraft: string;
  onTerminalDraftChange: (value: string) => void;
  onTogglePin: (blockId: string) => void;
};

export function WorkspaceCenter({
  commandBlocks,
  jobs,
  terminalDraft,
  onTerminalDraftChange,
  onTogglePin
}: WorkspaceCenterProps) {
  return (
    <main className="workspace-center">
      <section className="panel terminal-panel">
        <div className="panel-heading">
          <span>TerminalWidget</span>
          <span className="pill">PTY placeholder</span>
        </div>
        <div className="terminal-surface">
          <span className="prompt">$</span>
          <input
            value={terminalDraft}
            onChange={(event) => onTerminalDraftChange(event.target.value)}
            placeholder="Terminal input is isolated from action execution in this MVP"
          />
        </div>
      </section>

      <section className="panel blocks-panel">
        <div className="panel-heading">
          <span>CommandBlockWidget</span>
          <span className="pill">{commandBlocks.length} blocks</span>
        </div>
        <div className="blocks-list">
          {commandBlocks.length === 0 ? (
            <div className="empty-state">
              <Terminal size={28} />
              <span>Run an allowlisted action to create the first command block.</span>
            </div>
          ) : (
            commandBlocks.map((block) => {
              const job = jobs.find((candidate) => candidate.id === block.jobId);
              return (
                <article className="command-block" key={block.id}>
                  <div className="command-block-header">
                    <div>
                      <strong>{block.actionName}</strong>
                      <code>{block.commandPreview}</code>
                    </div>
                    <span className={`status ${job?.status ?? block.status}`}>{job?.status ?? block.status}</span>
                  </div>
                  <pre>{job?.output.join('\n') ?? 'No output yet.'}</pre>
                  <div className="block-actions">
                    <button type="button" onClick={() => onTogglePin(block.id)} title="Pin block">
                      <Pin size={16} />
                      {block.pinned ? 'Pinned' : 'Pin'}
                    </button>
                    <button type="button" title="Rerun action">
                      <RotateCcw size={16} />
                      Rerun
                    </button>
                    <button type="button" title="Cancel job">
                      <Square size={16} />
                      Cancel
                    </button>
                    <span>{block.renderer}</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
