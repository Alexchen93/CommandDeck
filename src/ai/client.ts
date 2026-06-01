export type AISettings = {
  endpoint: string;
  apiKey: string;
  model: string;
  availableModels: string[];
  systemPrompt: string;
};

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIChatResult = {
  message: string;
  command?: string;
};

const DEFAULT_ENDPOINT = 'https://api.openai.com';
const DEFAULT_MODEL = 'gpt-4o';

export const DEFAULT_SYSTEM_PROMPT = `你是 CommandDeck AI，運行在 Kali Linux 終端機環境中。使用**繁體中文**回應所有問題。

## 你的能力
- 產生 Kali Linux 安全測試的精確 CLI 指令
- 回答 Linux 指令、系統管理、網路除錯等一般技術問題
- 介紹 CommandDeck 內建功能（ranger 檔案瀏覽、多窗格終端機等）
- 對任何非惡意請求都應給出有用的回應，不要回傳空白

## 規則
1. 如果使用者問安全測試相關，將指令輸出在程式碼區塊中：
\`\`\`bash
nmap -sV -p 80,443 10.10.10.20
\`\`\`\`
2. 程式碼區塊後加上 1-2 句簡短說明。
3. 若請求不明確，請主動詢問。
4. 絕不為使用者未提及的目標產生指令。
5. 被問到非安全類問題（如 Linux 指令說明）時，直接給出解釋和範例。
6. **重要：絕對不要回傳空白內容。** 如果不知道答案，請誠實說明。

## 可用安全工具
{toolDefinitions}

## 終端機狀態
{terminalContext}`;

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

function chatEndpoint(baseUrl: string): string {
  if (baseUrl.endsWith('/chat/completions')) return baseUrl;
  if (baseUrl.endsWith('/v1')) return `${baseUrl}/chat/completions`;
  return `${baseUrl}/v1/chat/completions`;
}

function modelsEndpoint(baseUrl: string): string {
  if (baseUrl.endsWith('/models') && !baseUrl.endsWith('/chat/completions')) return baseUrl;
  const base = baseUrl.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '');
  return `${base}/v1/models`;
}

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem('commanddeck:ai');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        endpoint: parsed.endpoint || DEFAULT_ENDPOINT,
        apiKey: parsed.apiKey || '',
        model: parsed.model || DEFAULT_MODEL,
        availableModels: Array.isArray(parsed.availableModels) ? parsed.availableModels : [],
        systemPrompt: parsed.systemPrompt || DEFAULT_SYSTEM_PROMPT
      };
    }
  } catch { /* noop */ }
  return {
    endpoint: DEFAULT_ENDPOINT,
    apiKey: '',
    model: DEFAULT_MODEL,
    availableModels: [],
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  };
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem('commanddeck:ai', JSON.stringify(settings));
  } catch { /* noop */ }
}

export async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  if (!apiKey) throw new Error('API key required');

  const url = modelsEndpoint(normalizeBaseUrl(baseUrl));
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const models: string[] = (data.data ?? [])
    .map((m: { id: string }) => m.id)
    .filter((id: string) => id && typeof id === 'string')
    .sort();

  return models.length > 0 ? models : [];
}

export function buildSystemPrompt(
  template: string,
  toolDefinitions: string,
  terminalContext: string
): string {
  const tpl = (template && template.trim()) || DEFAULT_SYSTEM_PROMPT;
  return tpl
    .replace('{toolDefinitions}', toolDefinitions)
    .replace('{terminalContext}', terminalContext || '(無終端機輸出)');
}

export function extractCommand(response: string): string | undefined {
  const bashMatch = response.match(/```(?:bash|shell|sh)?\s*\n?([\s\S]*?)```/);
  if (bashMatch) return bashMatch[1].trim();

  const inlineMatch = response.match(/`([a-zA-Z0-9_\-./][^`]{2,200})`/);
  if (inlineMatch) return inlineMatch[1].trim();

  return undefined;
}

export async function chatWithAI(
  settings: AISettings,
  messages: AIMessage[]
): Promise<AIChatResult> {
  if (!settings.apiKey) {
    return { message: '⚠️ 請先在設定中設定 API Key。' };
  }

  const endpoint = chatEndpoint(normalizeBaseUrl(settings.endpoint));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.5,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    return { message: `❌ API 錯誤 (${response.status}): ${errorText.slice(0, 300)}` };
  }

  const data = await response.json();
  const content: string = (data.choices?.[0]?.message?.content || '(empty response)');
  const command = extractCommand(content);

  return { message: content, command };
}
