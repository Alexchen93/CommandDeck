/// <reference types="vite/client" />

interface Window {
  workspaceApi?: {
    save: (payload: unknown) => Promise<{ filePath: string }>;
    load: () => Promise<unknown | null>;
  };
  terminalApi?: {
    info: () => Promise<{
      user: string;
      host: string;
      cwd: string;
      home: string;
      shell: string;
    }>;
    create: (payload: { id: string; cwd?: string; cols?: number; rows?: number }) => Promise<{ id: string }>;
    write: (payload: { id: string; data: string }) => Promise<void>;
    resize: (payload: { id: string; cols: number; rows: number }) => Promise<void>;
    kill: (payload: { id: string }) => Promise<void>;
    onData: (id: string, callback: (data: string) => void) => () => void;
    onExit: (id: string, callback: (payload: { exitCode: number; signal?: number }) => void) => () => void;
    run: (payload: { command: string; cwd?: string }) => Promise<{
      cwd: string;
      stdout: string;
      stderr: string;
      exitCode: number;
      clear?: boolean;
    }>;
  };
  machineApi?: {
    info: () => Promise<{
      hostname: string;
      user: string;
      home: string;
      platform: string;
      arch: string;
      cpus: number;
      totalMem: number;
      primaryIp: string;
      tailscaleIp: string;
      ips: { name: string; address: string; family: string; internal: boolean }[];
    }>;
  };
  commandDeckApi?: {
    workspace: NonNullable<Window['workspaceApi']>;
    terminal: NonNullable<Window['terminalApi']>;
    machine: NonNullable<Window['machineApi']>;
  };
}
