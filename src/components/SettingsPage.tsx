import { useState } from 'react';
import type { AISettings } from '../ai/client';
import { DEFAULT_SYSTEM_PROMPT } from '../ai/client';
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
                  onClick={() => setDraft({ ...draft, systemPrompt: DEFAULT_SYSTEM_PROMPT })}
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
