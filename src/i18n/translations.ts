export type Language = 'zh' | 'en';

export type TranslationKey = keyof typeof translations.zh;

export const translations = {
  zh: {
    // App title
    appName: 'CommandDeck',
    appSubtitle: '{visible} 顯示 / {total} sessions',

    // Dock
    dockToolkit: '工具',
    dockSessions: 'Sessions',
    dockFiles: '檔案',
    dockAI: 'AI',
    dockSettings: '設定',

    // Slidebar
    closePanel: '關閉面板',
    toolkitLabel: '工具集',
    filterPlaceholder: '搜尋工具...',
    filterToolHint: '點擊工具進行設定與執行',

    // Modal
    modalCancel: '取消',
    modalRun: '執行',
    modalRiskHigh: '⚠ 高風險 — 需要明確確認才能執行。',

    // Sessions
    addTerminal: '新增 Terminal',
    visible: '顯示中',
    hidden: '已隱藏',
    deleteSession: '刪除',
    hideSession: '隱藏',
    showSession: '顯示',

    // Settings
    save: '儲存',
    load: '載入',
    language: '語言',
    languageZh: '中文',
    languageEn: 'English',

    // Header
    headerAddSession: 'Session',
    headerSave: '儲存',

    // Panels
    filesPanel: '檔案',
    filesPanelBody: '檔案瀏覽器預設隱藏，後續會綁定到選取的 session。',
    aiPanel: 'AI 助手',
    aiPanelBody: 'AI 會在選取的 command block 範圍內提供摘要，不會繞過 action registry。',
    settingsPanel: '設定',

    // Terminal
    terminalBridgeUnavailable: 'Terminal bridge 無法使用。請重新安裝最新版 CommandDeck 套件後重啟。',

    // Workpace
    saveOnlyInElectron: '儲存僅在 Electron 中可用',
    loadOnlyInElectron: '載入僅在 Electron 中可用',
    noSavedWorkspace: '沒有已儲存的工作區',
    saved: '已儲存',
    loaded: '已載入',
    notSaved: '尚未儲存',

    // Toolkit
    toolkitDesc: 'Kali Linux 完整滲透測試工具集。點擊任一工具以設定參數並寫入終端機。',
    toolkitPerms: '權限',

    // Risk levels
    riskLow: '低',
    riskMedium: '中',
    riskHigh: '高',
  },
  en: {
    // App title
    appName: 'CommandDeck',
    appSubtitle: '{visible} visible / {total} sessions',

    // Dock
    dockToolkit: 'Toolkit',
    dockSessions: 'Sessions',
    dockFiles: 'Files',
    dockAI: 'AI',
    dockSettings: 'Settings',

    // Slidebar
    closePanel: 'Close panel',
    toolkitLabel: 'Toolkit',
    filterPlaceholder: 'Search tools...',
    filterToolHint: 'Click a tool to configure and run',

    // Modal
    modalCancel: 'Cancel',
    modalRun: 'Run Action',
    modalRiskHigh: '⚠ High risk — requires explicit confirmation.',

    // Sessions
    addTerminal: 'Add Terminal',
    visible: 'visible',
    hidden: 'hidden',
    deleteSession: 'Delete',
    hideSession: 'Hide',
    showSession: 'Show',

    // Settings
    save: 'Save',
    load: 'Load',
    language: 'Language',
    languageZh: '中文',
    languageEn: 'English',

    // Header
    headerAddSession: 'Session',
    headerSave: 'Save',

    // Panels
    filesPanel: 'Files',
    filesPanelBody: 'File viewer is hidden by default and will attach to selected sessions later.',
    aiPanel: 'AI Helper',
    aiPanelBody: 'AI assistance will summarize selected blocks without bypassing the action registry.',
    settingsPanel: 'Settings',

    // Terminal
    terminalBridgeUnavailable: 'Terminal bridge is unavailable. Reinstall the latest CommandDeck package and relaunch.',

    // Workpace
    saveOnlyInElectron: 'Save only works in Electron',
    loadOnlyInElectron: 'Load only works in Electron',
    noSavedWorkspace: 'No saved workspace',
    saved: 'saved',
    loaded: 'loaded',
    notSaved: 'not saved',

    // Toolkit
    toolkitDesc: 'Full Kali Linux penetration testing toolkit. Click any tool to configure and write to terminal.',
    toolkitPerms: 'Permissions',

    // Risk levels
    riskLow: 'low',
    riskMedium: 'medium',
    riskHigh: 'high',
  }
} as const;

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

export function tf(lang: Language, key: TranslationKey, replacements: Record<string, string | number>): string {
  let text = t(lang, key);
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, String(v));
  }
  return text;
}
