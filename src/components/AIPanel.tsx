import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Check, Copy, Play, Send, Settings, Trash2, X } from "lucide-react";
import { type AIMessage, type AISettings, buildSystemPrompt, chatWithAI, extractCommand } from "../ai/client";
import type { Language } from "../i18n/translations";

type ChatEntry = {
  role: "user" | "assistant";
  text: string;
  command?: string;
};

type AIPanelProps = {
  lang: Language;
  settings: AISettings;
  toolDefinitions: string;
  onGetTerminalContext: () => string;
  onWriteToTerminal: (command: string) => void;
  onOpenSettings: () => void;
  onClose: () => void;
};

export function AIPanel({
  lang,
  settings,
  toolDefinitions,
  onGetTerminalContext,
  onWriteToTerminal,
  onOpenSettings,
  onClose
}: AIPanelProps) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  async function handleSend() {
    const userText = input.trim();
    if (!userText || loading) return;

    setInput("");
    setChat((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const terminalContext = onGetTerminalContext();
      const promptTemplate = settings.systemPrompt || "";
      const systemPrompt = buildSystemPrompt(promptTemplate, toolDefinitions, terminalContext);
      const messages: AIMessage[] = [
        { role: "system", content: systemPrompt },
        ...chat.slice(-6).map((entry): AIMessage => ({
          role: entry.role === "assistant" ? "assistant" : "user",
          content: entry.text
        })),
        { role: "user", content: userText }
      ];

      console.log("[AI] calling API with model:", settings.model, "endpoint:", settings.endpoint); const result = await chatWithAI(settings, messages);
      const responseText = result.message && result.message.trim()
        ? result.message
        : "❌ AI 未回覆內容，請檢查 API 設定或稍後再試。";

      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          text: responseText,
          command: result.command
        }
      ]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "❌ " + (err instanceof Error ? err.message : String(err))
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleRunCommand(command: string) {
    onWriteToTerminal(command);
    setChat((prev) => [...prev, { role: "assistant", text: "✅ 已傳送至終端機。" }]);
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
        {chat.length === 0 && !loading && (
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
          </div>
        ))}

        {loading && (
          <div className="ai-message assistant">
            <div className="ai-typing">Thinking...</div>
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
        <textarea
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "zh" ? "輸入需求，Enter 送出..." : "Ask AI to generate a command..."}
          rows={2}
          disabled={loading}
        />
        <div className="ai-input-actions">
          <button
            type="button"
            className="ai-icon-btn"
            disabled={chat.length === 0}
            onClick={() => setChat([])}
            title="Clear chat"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            className="run-button ai-send-btn"
            disabled={!input.trim() || loading}
            onClick={handleSend}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
