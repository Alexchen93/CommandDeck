export type RiskLevel = 'low' | 'medium' | 'high';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ExecutorType = 'local-safe' | 'container' | 'vm' | 'remote-ssh';
export type RendererType =
  | 'RawTextRenderer'
  | 'JsonRenderer'
  | 'TableRenderer'
  | 'MarkdownRenderer'
  | 'NmapResultRenderer'
  | 'FindingRenderer'
  | 'ReportRenderer';

export type WidgetType =
  | 'TerminalWidget'
  | 'CommandBlockWidget'
  | 'JobQueueWidget'
  | 'LiveConsoleWidget'
  | 'FileViewerWidget'
  | 'SystemInfoWidget'
  | 'ToolkitWidget'
  | 'AIHelperWidget'
  | 'WebViewWidget';

export type AuthorizedAsset = {
  id: string;
  name: string;
  type: 'host' | 'domain' | 'cidr' | 'url' | 'container' | 'vm';
  value: string;
  scope: 'lab' | 'owned' | 'client-authorized';
  expiresAt?: string;
};

export type ActionDefinition = {
  id: string;
  toolkitId: string;
  name: string;
  description: string;
  risk: RiskLevel;
  executor: ExecutorType;
  renderer: RendererType;
  permissions: string[];
  targetPolicy: {
    required: boolean;
    allowedAssetTypes: AuthorizedAsset['type'][];
  };
  params: ActionParam[];
};

export type ActionParam = {
  id: string;
  label: string;
  type: 'text' | 'select' | 'asset';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  pattern?: string;
};

export type Toolkit = {
  id: string;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  actions: ActionDefinition[];
};

export type Job = {
  id: string;
  actionId: string;
  actionName: string;
  status: JobStatus;
  risk: RiskLevel;
  targetAssetId?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  renderer: RendererType;
  output: string[];
};

export type CommandBlock = {
  id: string;
  jobId: string;
  actionName: string;
  commandPreview: string;
  status: JobStatus;
  renderer: RendererType;
  pinned: boolean;
};

export type WorkspaceSnapshot = {
  id: string;
  name: string;
  selectedToolkitId: string;
  selectedActionId: string;
  jobs: Job[];
  commandBlocks: CommandBlock[];
  savedAt: string;
};
