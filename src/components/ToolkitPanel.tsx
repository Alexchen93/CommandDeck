import { Play, ShieldAlert } from 'lucide-react';
import type { ActionDefinition, AuthorizedAsset, Toolkit } from '../domain/models';

type ToolkitPanelProps = {
  toolkits: Toolkit[];
  assets: AuthorizedAsset[];
  selectedToolkitId: string;
  selectedActionId: string;
  params: Record<string, string>;
  validationErrors: string[];
  onSelectToolkit: (toolkitId: string) => void;
  onSelectAction: (actionId: string) => void;
  onParamChange: (paramId: string, value: string) => void;
  onRun: () => void;
};

export function ToolkitPanel({
  toolkits,
  assets,
  selectedToolkitId,
  selectedActionId,
  params,
  validationErrors,
  onSelectToolkit,
  onSelectAction,
  onParamChange,
  onRun
}: ToolkitPanelProps) {
  const toolkit = toolkits.find((candidate) => candidate.id === selectedToolkitId) ?? toolkits[0];
  const action = toolkit.actions.find((candidate) => candidate.id === selectedActionId) ?? toolkit.actions[0];

  return (
    <aside className="panel toolkit-panel">
      <div className="panel-heading">
        <span>Toolkit</span>
        <span className="pill">allowlist</span>
      </div>

      <select value={toolkit.id} onChange={(event) => onSelectToolkit(event.target.value)} aria-label="Toolkit">
        {toolkits.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
          </option>
        ))}
      </select>

      <div className="action-list">
        {toolkit.actions.map((candidate) => (
          <button
            key={candidate.id}
            className={candidate.id === action.id ? 'action-item selected' : 'action-item'}
            type="button"
            onClick={() => onSelectAction(candidate.id)}
          >
            <span>{candidate.name}</span>
            <small className={`risk ${candidate.risk}`}>{candidate.risk}</small>
          </button>
        ))}
      </div>

      <section className="action-form">
        <div>
          <h2>{action.name}</h2>
          <p>{action.description}</p>
        </div>

        {action.params.map((param) => (
          <label key={param.id}>
            <span>{param.label}</span>
            {param.type === 'asset' ? (
              <select value={params[param.id] ?? ''} onChange={(event) => onParamChange(param.id, event.target.value)}>
                <option value="">Choose authorized asset</option>
                {assets
                  .filter((asset) => action.targetPolicy.allowedAssetTypes.includes(asset.type))
                  .map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.scope})
                    </option>
                  ))}
              </select>
            ) : param.type === 'select' ? (
              <select value={params[param.id] ?? param.defaultValue ?? ''} onChange={(event) => onParamChange(param.id, event.target.value)}>
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
              />
            )}
          </label>
        ))}

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
            High risk actions require explicit confirmation and isolated execution.
          </div>
        )}

        <button className="run-button" type="button" onClick={onRun}>
          <Play size={18} />
          Run Action
        </button>
      </section>
    </aside>
  );
}
