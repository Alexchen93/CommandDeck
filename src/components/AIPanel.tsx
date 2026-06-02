import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Check, Copy, Play, RefreshCw, Send, Settings, Square, Terminal, Trash2, X } from "lucide-react";
import {
  type AIMessage,
  type AISettings,
  type ChatEntry,
  buildSystemPrompt,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
  streamChat,
} from "../ai/client";
import type { Language } from "../i18n/translations";

const TERMINAL_ASSIST_STORAGE_KEY = "commanddeck:ai:terminal-assist";

type AIPanelProps = {
  lang: Language;
  settings: AISettings;
  activeSessionId: string;
  toolDefinitions: string;
  onGetTerminalContext: (sessionId?: string) => string;
  onWriteToTerminal: (command: string) => void;
  onOpenSettings: () => void;
  onClose: () => void;
};

export function AIPanel({
  lang,
  settings,
  activeSessionId,
  toolDefinitions: _unused,
  onGetTerminalContext,
  onWriteToTerminal,
  onOpenSettings,
  onClose
}: AIPanelProps) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>(() => loadChatHistory());
  const [streaming, setStreaming] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [terminalAssistEnabled, setTerminalAssistEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TERMINAL_ASSIST_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, streaming]);

  // Persist chat after each change
  const persistAndSetChat = useCallback((updater: ChatEntry[] | ((prev: ChatEntry[]) => ChatEntry[])) => {
    setChat(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveChatHistory(next);
      return next;
    });
  }, []);

  function toggleTerminalAssist() {
    setTerminalAssistEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(TERMINAL_ASSIST_STORAGE_KEY, next ? "1" : "0");
      } catch { /* noop */ }
      return next;
    });
  }

  function handleStopStreaming() {
    abortRef.current?.abort();
  }

  // Retry: remove the failed assistant message and re-send the user message before it
  function handleRetry(errorIndex: number) {
    // Find the user message that came right before this error
    let userMessage = "";
    let userIndex = -1;
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (chat[i]?.role === "user") {
        userMessage = chat[i].text;
        userIndex = i;
        break;
      }
    }
    if (!userMessage) return;

    // Remove both the user message and the error response
    persistAndSetChat(prev => prev.filter((_, i) => i !== errorIndex && i !== userIndex));
    // Re-trigger send with the same message
    doSend(userMessage);
  }

  async function doSend(userText: string) {
    if (!userText || streaming) return;
    setInput("");
    persistAndSetChat(prev => [...prev, { role: "user", text: userText }]);
    setStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const terminalContext = terminalAssistEnabled
        ? onGetTerminalContext(activeSessionId)
        : "(terminal context disabled)";
      const promptTemplate = settings.systemPrompt || "";
      const systemPrompt = buildSystemPrompt(promptTemplate, "", terminalContext);

      const recentChat = chat.slice(-10);
      const messages: AIMessage[] = [
        { role: "system", content: systemPrompt },
        ...recentChat.map((entry): AIMessage => ({
          role: entry.role === "assistant" ? "assistant" : "user",
          content: entry.text
        })),
        { role: "user", content: userText }
      ];

      // Add streaming placeholder
      persistAndSetChat(prev => [...prev, { role: "assistant", text: "" }]);

      let fullText = "";
      await streamChat(
        settings,
        messages,
        (token) => {
          fullText += token;
          setChat(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = { ...last, text: fullText };
            }
            return next;
          });
        },
        abortController.signal
      );

      const finalText = fullText.trim()
        ? fullText
        : "❌ AI 未回覆內容，請嘗試換個方式提問或檢查 API 設定。";
      const command = fullText.trim() ? extractCommandFromResponse(fullText) : undefined;
      if (terminalAssistEnabled && command) {
        onWriteToTerminal(command);
      }

      persistAndSetChat(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            text: terminalAssistEnabled && command
              ? `${finalText}\n\n_已填入目前終端機，尚未執行。_`
              : finalText,
            command
          };
        }
        return next;
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        persistAndSetChat(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant" && !last.text.trim()) {
            next[next.length - 1] = { ...last, text: "⏹️ 已中斷生成。" };
          } else if (last && last.role === "assistant") {
            next[next.length - 1] = { ...last, text: (last.text || "") + "\n\n⏹️ 已中斷生成。" };
          }
          return next;
        });
      } else {
        persistAndSetChat(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              text: "❌ " + (err instanceof Error ? err.message : String(err))
            };
          }
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function handleSend() {
    const userText = input.trim();
    if (!userText || streaming) return;
    await doSend(userText);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleRunCommand(command: string) {
    onWriteToTerminal(command);
    persistAndSetChat(prev => [...prev, { role: "assistant", text: "✅ 已傳送至終端機。" }]);
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  function handleClearChat() {
    persistAndSetChat([]);
    clearChatHistory();
  }

  return (
    <div className="ai-panel">
      <header className="ai-panel-header">
        <div className="ai-panel-title">
          <Bot size={18} />
          <span>AI Assistant</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            className="ai-icon-btn"
            onClick={onOpenSettings}
            title={lang === "zh" ? "開啟設定" : "Open Settings"}
          >
            <Settings size={16} />
          </button>
          <button type="button" className="ai-icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="ai-chat">
        {chat.length === 0 && !streaming && (
          <div className="ai-empty">
            <Bot size={32} />
            <p>{lang === "zh" ? "描述你想做什麼，AI 會幫你產生對應的指令。" : "Describe what you want to do and AI will generate the command."}</p>
            <p className="ai-hint">
              {lang === "zh"
                ? '例如："掃描 10.10.10.20 的 1-1000 port"'
                : 'e.g. "Scan ports 1-1000 on 10.10.10.20"'}
            </p>
          </div>
        )}

        {chat.map((entry, i) => (
          <div key={i} className={`ai-message ${entry.role}`}>
            <div className="ai-message-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code: (codeProps: any) => {
                    const className = codeProps.className || "";
                    const rawChildren = codeProps.children;
                    const childrenStr = Array.isArray(rawChildren)
                      ? rawChildren.map((c: any) => (typeof c === "string" ? c : c?.props?.children || "")).join("")
                      : String(rawChildren || "");
                    const match = /language-(\w+)/.exec(className);
                    const codeText = childrenStr.replace(/\n$/, "");
                    const isInline = !match && !codeText.includes("\n");
                    if (isInline) {
                      return <code className="inline-code">{childrenStr}</code>;
                    }
                    return (
                      <div className="code-block">
                        <div className="code-block-header">
                          <span className="code-lang">{match ? match[1] : "code"}</span>
                          <button
                            type="button"
                            className="ai-copy-btn"
                            onClick={() => handleCopy(codeText)}
                            title="Copy"
                          >
                            {copiedCode === codeText ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                        <pre><code className={className}>{childrenStr}</code></pre>
                      </div>
                    );
                  }
                }}
              >
                {entry.text}
              </ReactMarkdown>
            </div>
            {entry.command && (
              <div className="ai-command-actions">
                <code className="ai-command">{entry.command}</code>
                <div className="ai-cmd-btns">
                  <button
                    type="button"
                    className="ai-copy-btn"
                    onClick={() => handleCopy(entry.command!)}
                    title="Copy"
                  >
                    {copiedCode === entry.command ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button
                    type="button"
                    className="ai-run-btn"
                    onClick={() => handleRunCommand(entry.command!)}
                  >
                    <Play size={14} />
                    Run
                  </button>
                </div>
              </div>
            )}
            {/* Retry button for error messages */}
            {entry.role === "assistant" && entry.text.startsWith("❌") && !streaming && (
              <button
                type="button"
                className="ai-retry-btn"
                onClick={() => handleRetry(i)}
                title={lang === "zh" ? "重試" : "Retry"}
              >
                <RefreshCw size={13} />
                {lang === "zh" ? " 重試" : " Retry"}
              </button>
            )}
          </div>
        ))}

        {streaming && (
          <div className="ai-message assistant">
            <div className="ai-typing">
              <span className="streaming-cursor">●</span> Generating...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {!settings.apiKey && (
        <div className="ai-no-key">
          <span>⚠️ {lang === "zh" ? "尚未設定 API Key" : "API Key not configured"}</span>
          <button type="button" className="ai-fetch-btn" onClick={onOpenSettings}>
            {lang === "zh" ? "前往設定" : "Go to Settings"}
          </button>
        </div>
      )}

      <div className="ai-input-area">
        <button
          type="button"
          className={terminalAssistEnabled ? "ai-context-toggle active" : "ai-context-toggle"}
          onClick={toggleTerminalAssist}
        >
          <Terminal size={14} />
          <span>
            {lang === "zh"
              ? terminalAssistEnabled
                ? "已開啟：讀取目前終端機並自動填入指令"
                : "開啟終端機輔助"
              : terminalAssistEnabled
                ? "Terminal assist on: read active terminal and fill commands"
                : "Enable terminal assist"}
          </span>
        </button>
        <textarea
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "zh" ? "輸入需求，Enter 送出..." : "Ask AI to generate a command..."}
          rows={2}
          disabled={streaming}
        />
        <div className="ai-input-actions">
          <button
            type="button"
            className="ai-icon-btn"
            disabled={chat.length === 0}
            onClick={handleClearChat}
            title="Clear chat"
          >
            <Trash2 size={15} />
          </button>
          {streaming ? (
            <button
              type="button"
              className="run-button ai-stop-btn"
              onClick={handleStopStreaming}
              title={lang === "zh" ? "停止生成" : "Stop generating"}
            >
              <Square size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="run-button ai-send-btn"
              disabled={!input.trim()}
              onClick={handleSend}
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function extractCommandFromResponse(response: string): string | undefined {
  const bashMatch = response.match(/```(?:bash|shell|sh)?\s*\n?([\s\S]*?)```/);
  if (bashMatch) return bashMatch[1].trim();
  const inlineMatch = response.match(/`([a-zA-Z0-9_\-./][^`]{2,200})`/);
  if (inlineMatch) return inlineMatch[1].trim();
  return undefined;
}
