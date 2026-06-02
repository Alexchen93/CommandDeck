import { useEffect, useState } from 'react';
import type { AIPreset, AISettings } from '../ai/client';
import { DEFAULT_SYSTEM_PROMPT, applyPreset, loadPresets, savePresets } from '../ai/client';
import type { Language } from '../i18n/translations';

type SettingsCategory = 'ai' | 'language' | 'workspace' | 'about';

type SettingsPageProps = {
  lang: Language;
  aiSettings: AISettings;
  saveState: string;
  onSaveAISettings: (s: AISettings) => void;
  onLanguageChange: (l: Language) => void;
  onSave: () => void;
  onLoad: () => void;
  onClose: () => void;
};

export function SettingsPage({
  lang,
  aiSettings,
  saveState,
  onSaveAISettings,
  onLanguageChange,
  onSave,
  onLoad,
  onClose
}: SettingsPageProps) {
  const [category, setCategory] = useState<SettingsCategory>('ai');
  const [draft, setDraft] = useState<AISettings>({ ...aiSettings });
  const [presets, setPresets] = useState<AIPreset[]>([]);
  const [presetJson, setPresetJson] = useState('');
  const [presetJsonError, setPresetJsonError] = useState('');

  useEffect(() => {
    const loaded = loadPresets();
    setPresets(loaded);
    setPresetJson(JSON.stringify(loaded, null, 2));
  }, []);

  function handlePresetChange(presetId: string) {
    const preset = presets.find(p => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      setDraft(prev => applyPreset(prev, preset));
    } else if (presetId === 'custom') {
      setDraft(prev => ({ ...prev, presetId: 'custom' }));
    }
  }

  function handleResetPrompt() {
    if (window.confirm(lang === 'zh'
      ? '確定要重設為預設 System Prompt？目前的修改將遺失。'
      : 'Reset System Prompt to default? Your changes will be lost.')) {
      setDraft({ ...draft, systemPrompt: DEFAULT_SYSTEM_PROMPT });
    }
  }

  function handleSavePresetJson() {
    try {
      const parsed = JSON.parse(presetJson);
      if (!Array.isArray(parsed)) {
        throw new Error('Root value must be an array');
      }
      const normalized = parsed.map((preset, index): AIPreset => {
        if (!preset || typeof preset !== 'object') {
          throw new Error(`Preset #${index + 1} must be an object`);
        }
        const id = String(preset.id || '').trim();
        const name = String(preset.name || '').trim();
        if (!id || !name) {
          throw new Error(`Preset #${index + 1} requires id and name`);
        }
        return {
          id,
          name,
          endpoint: String(preset.endpoint || ''),
          apiKey: typeof preset.apiKey === 'string' ? preset.apiKey : undefined,
          defaultModel: String(preset.defaultModel || ''),
          models: Array.isArray(preset.models) ? preset.models.map(String) : [],
          requiresAuth: typeof preset.requiresAuth === 'boolean' ? preset.requiresAuth : true
        };
      });
      if (!normalized.some(p => p.id === 'custom')) {
        normalized.push({
          id: 'custom',
          name: '自訂 / Custom',
          endpoint: '',
          defaultModel: '',
          models: [],
          requiresAuth: true
        });
      }
      savePresets(normalized);
      setPresets(normalized);
      setPresetJson(JSON.stringify(normalized, null, 2));
      setPresetJsonError('');
    } catch (err) {
      setPresetJsonError(err instanceof Error ? err.message : String(err));
    }
  }

  const categories: { id: SettingsCategory; icon: string; labelZh: string; labelEn: string }[] = [
    { id: 'ai', icon: '🤖', labelZh: 'AI 設定', labelEn: 'AI Config' },
    { id: 'language', icon: '🌐', labelZh: '語言', labelEn: 'Language' },
    { id: 'workspace', icon: '💾', labelZh: '工作區', labelEn: 'Workspace' },
    { id: 'about', icon: '📋', labelZh: '關於', labelEn: 'About' }
  ];

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <button type="button" className="settings-back" onClick={onClose}>
          ← {lang === 'zh' ? '返回工作區' : 'Back to Workspace'}
        </button>
        <h1>{lang === 'zh' ? '設定' : 'Settings'}</h1>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={category === cat.id ? 'settings-nav-item active' : 'settings-nav-item'}
              onClick={() => setCategory(cat.id)}
            >
              <span className="settings-nav-icon">{cat.icon}</span>
              <span>{lang === 'zh' ? cat.labelZh : cat.labelEn}</span>
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {/* ── AI ── */}
          {category === 'ai' && (
            <>
              <section className="settings-card">
                <h2>{lang === 'zh' ? '🔌 Provider 預設' : '🔌 Provider Preset'}</h2>
                <p style={{ color: '#5a6e7e', fontSize: '12px', marginBottom: '8px' }}>
                  {lang === 'zh'
                    ? '選擇一個預設供應商自動填入 Endpoint 和 Model，或選「自訂」手動設定。'
                    : 'Select a preset to auto-fill endpoint & model, or "Custom" for manual config.'}
                </p>
                <label className="field">
                  <span>Provider</span>
                  <select value={draft.presetId || 'openai'} onChange={(e) => handlePresetChange(e.target.value)}>
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field provider-json-field">
                  <span>{lang === 'zh' ? 'Provider JSON' : 'Provider JSON'}</span>
                  <textarea
                    className="provider-json-input"
                    value={presetJson}
                    onChange={(e) => setPresetJson(e.target.value)}
                    rows={8}
                    spellCheck={false}
                  />
                  <small className="ai-field-hint">
                    {lang === 'zh'
                      ? '格式：[{ id, name, endpoint, apiKey, defaultModel, models, requiresAuth }]。不想寫 JSON 時，下方 UI 仍可手動設定。'
                      : 'Format: [{ id, name, endpoint, apiKey, defaultModel, models, requiresAuth }]. Manual UI fields remain available.'}
                  </small>
                  {presetJsonError && <small className="ai-error">{presetJsonError}</small>}
                  <button type="button" className="settings-btn provider-json-save" onClick={handleSavePresetJson}>
                    {lang === 'zh' ? '套用 Provider JSON' : 'Apply Provider JSON'}
                  </button>
                </label>
              </section>

              <section className="settings-card">
                <h2>{lang === 'zh' ? '🤖 API 設定' : '🤖 API Configuration'}</h2>
                <div className="settings-grid">
                  <label className="field">
                    <span>API Endpoint</span>
                    <input value={draft.endpoint} onChange={(e) => setDraft({ ...draft, endpoint: e.target.value })} placeholder="https://api.openai.com" />
                    <small className="ai-field-hint">Base URL — auto-appends /v1/chat/completions</small>
                  </label>
                  <label className="field">
                    <span>API Key</span>
                    <input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="sk-..." />
                  </label>
                  <label className="field">
                    <span>Model</span>
                    {(draft.availableModels && draft.availableModels.length > 0) ? (
                      <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
                        {draft.availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="gpt-4o" />
                    )}
                  </label>
                </div>
              </section>

              <section className="settings-card">
                <h2>{lang === 'zh' ? '⚙️ 進階參數' : '⚙️ Advanced Parameters'}</h2>
                <div className="settings-grid">
                  <label className="field">
                    <span>Temperature ({draft.temperature})</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={draft.temperature}
                      onChange={(e) => setDraft({ ...draft, temperature: parseFloat(e.target.value) })}
                    />
                    <small className="ai-field-hint">{lang === 'zh' ? '越低越精確，越高越有創意 (0-2)' : 'Lower = more precise, higher = more creative (0-2)'}</small>
                  </label>
                  <label className="field">
                    <span>Max Tokens ({draft.maxTokens})</span>
                    <input
                      type="number"
                      min="50"
                      max="32000"
                      step="50"
                      value={draft.maxTokens}
                      onChange={(e) => setDraft({ ...draft, maxTokens: parseInt(e.target.value) || 800 })}
                    />
                    <small className="ai-field-hint">{lang === 'zh' ? '回應最大 token 數 (50-32000)' : 'Max response tokens (50-32000)'}</small>
                  </label>
                </div>
              </section>

              <section className="settings-card">
                <h2>{lang === 'zh' ? '📝 System Prompt' : '📝 System Prompt'}</h2>
                <p style={{ color: '#5a6e7e', fontSize: '12px', marginBottom: '8px' }}>
                  {lang === 'zh'
                    ? '使用 {toolDefinitions} 和 {terminalContext} 作為變數，會在送出時自動替換。'
                    : 'Use {toolDefinitions} and {terminalContext} as variables, auto-replaced on send.'}
                </p>
                <textarea
                  className="ai-system-prompt-input"
                  value={draft.systemPrompt}
                  onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                  rows={14}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="ai-reset-prompt-btn"
                  onClick={handleResetPrompt}
                  style={{ marginTop: '6px' }}
                >
                  {lang === 'zh' ? '🔄 重設為預設' : '🔄 Reset to Default'}
                </button>
              </section>

              <button type="button" className="run-button settings-save-btn" onClick={() => onSaveAISettings(draft)}>
                {lang === 'zh' ? '儲存 AI 設定' : 'Save AI Settings'}
              </button>
            </>
          )}

          {/* ── Language ── */}
          {category === 'language' && (
            <section className="settings-card">
              <h2>{lang === 'zh' ? '🌐 語言' : '🌐 Language'}</h2>
              <label className="field">
                <span>{lang === 'zh' ? '介面語言' : 'Interface Language'}</span>
                <select value={lang} onChange={(e) => onLanguageChange(e.target.value as Language)}>
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </label>
            </section>
          )}

          {/* ── Workspace ── */}
          {category === 'workspace' && (
            <section className="settings-card">
              <h2>{lang === 'zh' ? '💾 工作區' : '💾 Workspace'}</h2>
              <div className="settings-grid">
                <button type="button" className="settings-btn" onClick={onSave}>
                  {lang === 'zh' ? '儲存工作區' : 'Save Workspace'}
                </button>
                <button type="button" className="settings-btn" onClick={onLoad}>
                  {lang === 'zh' ? '載入工作區' : 'Load Workspace'}
                </button>
              </div>
              <span className="save-state" style={{ marginTop: 8, display: 'block' }}>{saveState}</span>
            </section>
          )}

          {/* ── About ── */}
          {category === 'about' && (
            <section className="settings-card">
              <h2>{lang === 'zh' ? '📋 關於' : '📋 About'}</h2>
              <div className="settings-about">
                <div><strong>CommandDeck</strong> v0.6.4</div>
                <div>40 Kali tools · 4-pane PTY/xterm · AI assistant</div>
                <div>Electron + React + node-pty + xterm.js</div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
