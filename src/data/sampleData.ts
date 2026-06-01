import type { AuthorizedAsset, Toolkit } from '../domain/models';

export const authorizedAssets: AuthorizedAsset[] = [
  {
    id: 'lab-web-01',
    name: 'Lab Web 01',
    type: 'host',
    value: '10.10.10.20',
    scope: 'lab'
  },
  {
    id: 'lab-api-01',
    name: 'Lab API 01',
    type: 'host',
    value: '10.10.10.30',
    scope: 'owned'
  },
  {
    id: 'lab-dc-01',
    name: 'Lab DC 01',
    type: 'host',
    value: '10.10.10.10',
    scope: 'lab'
  },
  {
    id: 'client-range-demo',
    name: 'Client Range Demo',
    type: 'cidr',
    value: '192.0.2.0/28',
    scope: 'client-authorized',
    expiresAt: '2026-12-31'
  },
  {
    id: 'lab-web-url',
    name: 'Lab Web URL',
    type: 'url',
    value: 'http://10.10.10.20:8080',
    scope: 'lab'
  },
  {
    id: 'lab-domain',
    name: 'Lab Domain',
    type: 'domain',
    value: 'test.lab.local',
    scope: 'lab'
  }
];

export const toolkits: Toolkit[] = [
  // ══════════════════════════════════════════
  // Kali Toolkit — Full Penetration Testing
  // ══════════════════════════════════════════
  {
    id: 'kali-full',
    name: 'Kali Toolkit',
    version: '1.0.0',
    description: 'Full Kali Linux penetration testing toolkit. Click an action to paste the command into the active terminal.',
    permissions: [
      'network.scan',
      'network.http',
      'container.execute',
      'vm.execute'
    ],
    actions: [
      // ── Network Recon ──
      {
        id: 'nmap_quick',
        toolkitId: 'kali-full',
        name: 'Nmap Quick Scan',
        description: 'Fast port scan of top 100 ports.',
        risk: 'medium',
        executor: 'container',
        renderer: 'NmapResultRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'cidr'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'timing', label: 'Timing', type: 'select', required: true, defaultValue: 'T4', options: ['T2', 'T3', 'T4', 'T5'] }
        ]
      },
      {
        id: 'nmap_full_tcp',
        toolkitId: 'kali-full',
        name: 'Nmap Full TCP Port Scan',
        description: 'Scan all 65535 TCP ports.',
        risk: 'medium',
        executor: 'container',
        renderer: 'NmapResultRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'cidr'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'timing', label: 'Timing', type: 'select', required: true, defaultValue: 'T4', options: ['T3', 'T4', 'T5'] },
          { id: 'min_rate', label: 'Min rate (pps)', type: 'text', required: false, defaultValue: '1000' }
        ]
      },
      {
        id: 'nmap_service_os',
        toolkitId: 'kali-full',
        name: 'Nmap Service + OS Detection',
        description: 'Service version detection, default scripts, and OS fingerprinting.',
        risk: 'medium',
        executor: 'container',
        renderer: 'NmapResultRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'ports', label: 'Ports', type: 'text', required: false, defaultValue: '1-10000' }
        ]
      },
      {
        id: 'nmap_udp',
        toolkitId: 'kali-full',
        name: 'Nmap UDP Top Ports',
        description: 'UDP scan of top 200 ports.',
        risk: 'medium',
        executor: 'container',
        renderer: 'NmapResultRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'top_ports', label: 'Top ports', type: 'text', required: false, defaultValue: '200' },
          { id: 'timing', label: 'Timing', type: 'select', required: true, defaultValue: 'T4', options: ['T3', 'T4'] }
        ]
      },
      {
        id: 'nmap_vuln',
        toolkitId: 'kali-full',
        name: 'Nmap Vuln Scripts',
        description: 'Run NSE vuln category scripts against target.',
        risk: 'high',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'ports', label: 'Ports', type: 'text', required: false, defaultValue: '1-10000' }
        ]
      },
      {
        id: 'nmap_smb_enum',
        toolkitId: 'kali-full',
        name: 'Nmap SMB Enum',
        description: 'SMB enumeration scripts (smb-os-discovery, smb-enum-shares, etc).',
        risk: 'medium',
        executor: 'container',
        renderer: 'NmapResultRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true }
        ]
      },
      // ── Web Enumeration ──
      {
        id: 'gobuster_dir',
        toolkitId: 'kali-full',
        name: 'Gobuster Directory',
        description: 'Directory/file brute-force with gobuster.',
        risk: 'medium',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'scheme', label: 'Scheme', type: 'select', required: true, defaultValue: 'http', options: ['http', 'https'] },
          { id: 'port', label: 'Port (optional)', type: 'text', required: false, defaultValue: '' },
          { id: 'wordlist', label: 'Wordlist', type: 'text', required: false, defaultValue: '/usr/share/wordlists/dirb/common.txt' },
          { id: 'extensions', label: 'Extensions', type: 'text', required: false, defaultValue: 'php,html,txt,js' }
        ]
      },
      {
        id: 'gobuster_vhost',
        toolkitId: 'kali-full',
        name: 'Gobuster VHost',
        description: 'Virtual host brute-force.',
        risk: 'medium',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'scheme', label: 'Scheme', type: 'select', required: true, defaultValue: 'http', options: ['http', 'https'] },
          { id: 'wordlist', label: 'VHost wordlist', type: 'text', required: false, defaultValue: '/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt' }
        ]
      },
      {
        id: 'ffuf_dir',
        toolkitId: 'kali-full',
        name: 'FFUF Directory Fuzz',
        description: 'Fast web fuzzer for directories and files.',
        risk: 'medium',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'scheme', label: 'Scheme', type: 'select', required: true, defaultValue: 'http', options: ['http', 'https'] },
          { id: 'wordlist', label: 'Wordlist', type: 'text', required: false, defaultValue: '/usr/share/seclists/Discovery/Web-Content/common.txt' },
          { id: 'extensions', label: 'Extensions', type: 'text', required: false, defaultValue: '.php,.html,.txt' },
          { id: 'threads', label: 'Threads', type: 'text', required: false, defaultValue: '40' }
        ]
      },
      {
        id: 'ffuf_vhost',
        toolkitId: 'kali-full',
        name: 'FFUF VHost Fuzz',
        description: 'Virtual host fuzzing with FFUF.',
        risk: 'medium',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'scheme', label: 'Scheme', type: 'select', required: true, defaultValue: 'http', options: ['http', 'https'] },
          { id: 'wordlist', label: 'Wordlist', type: 'text', required: false, defaultValue: '/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt' }
        ]
      },
      {
        id: 'dirb',
        toolkitId: 'kali-full',
        name: 'Dirb Scan',
        description: 'Classic directory brute-force with dirb.',
        risk: 'low',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'scheme', label: 'Scheme', type: 'select', required: true, defaultValue: 'http', options: ['http', 'https'] },
          { id: 'wordlist', label: 'Wordlist', type: 'text', required: false, defaultValue: '/usr/share/wordlists/dirb/common.txt' },
          { id: 'extensions', label: 'Extensions', type: 'text', required: false, defaultValue: '' }
        ]
      },
      {
        id: 'nikto',
        toolkitId: 'kali-full',
        name: 'Nikto Web Scanner',
        description: 'Comprehensive web server vulnerability scanner.',
        risk: 'medium',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'port', label: 'Port (optional)', type: 'text', required: false, defaultValue: '' },
          { id: 'ssl', label: 'SSL', type: 'select', required: true, defaultValue: 'no', options: ['no', 'yes'] }
        ]
      },
      {
        id: 'whatweb',
        toolkitId: 'kali-full',
        name: 'WhatWeb',
        description: 'Identify technologies used by a website.',
        risk: 'low',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'aggression', label: 'Aggression', type: 'select', required: true, defaultValue: '3', options: ['1', '2', '3', '4'] }
        ]
      },
      {
        id: 'wpscan_basic',
        toolkitId: 'kali-full',
        name: 'WPScan Basic',
        description: 'WordPress vulnerability scanner — basic scan.',
        risk: 'medium',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true }
        ]
      },
      {
        id: 'wpscan_enum',
        toolkitId: 'kali-full',
        name: 'WPScan Full Enum',
        description: 'WordPress full enumeration (plugins, themes, users, timthumbs, db exports).',
        risk: 'medium',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'api_token', label: 'WPVulnDB API token (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      // ── SQL Injection ──
      {
        id: 'sqlmap_basic',
        toolkitId: 'kali-full',
        name: 'SQLMap Basic',
        description: 'Automated SQL injection detection and exploitation — basic GET request.',
        risk: 'high',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['url'] },
        params: [
          { id: 'targetAssetId', label: 'Target URL', type: 'asset', required: true },
          { id: 'batch', label: 'Batch mode', type: 'select', required: true, defaultValue: 'yes', options: ['yes', 'no'] },
          { id: 'risk', label: 'Risk level', type: 'select', required: true, defaultValue: '2', options: ['1', '2', '3'] },
          { id: 'level', label: 'Level', type: 'select', required: true, defaultValue: '3', options: ['1', '2', '3', '4', '5'] }
        ]
      },
      {
        id: 'sqlmap_dbs',
        toolkitId: 'kali-full',
        name: 'SQLMap — List Databases',
        description: 'Enumerate databases after confirming injection.',
        risk: 'high',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['url'] },
        params: [
          { id: 'targetAssetId', label: 'Target URL', type: 'asset', required: true },
          { id: 'cookie', label: 'Cookie (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      {
        id: 'sqlmap_dump',
        toolkitId: 'kali-full',
        name: 'SQLMap — Dump Table',
        description: 'Dump a specific database table.',
        risk: 'high',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['url'] },
        params: [
          { id: 'targetAssetId', label: 'Target URL', type: 'asset', required: true },
          { id: 'database', label: 'Database name', type: 'text', required: true, defaultValue: '' },
          { id: 'table', label: 'Table name', type: 'text', required: true, defaultValue: '' },
          { id: 'columns', label: 'Columns (comma-separated, blank = all)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      // ── SMB / Windows Enum ──
      {
        id: 'enum4linux',
        toolkitId: 'kali-full',
        name: 'Enum4linux Full',
        description: 'Full SMB/CIFS enumeration (users, shares, OS info, password policy).',
        risk: 'medium',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true }
        ]
      },
      {
        id: 'smbclient_list',
        toolkitId: 'kali-full',
        name: 'SMBClient List Shares',
        description: 'List SMB shares anonymously.',
        risk: 'low',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'username', label: 'Username', type: 'text', required: false, defaultValue: '' }
        ]
      },
      {
        id: 'smbmap',
        toolkitId: 'kali-full',
        name: 'SMBMap Enum',
        description: 'Enumerate SMB shares and permissions.',
        risk: 'medium',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'username', label: 'Username (optional)', type: 'text', required: false, defaultValue: '' },
          { id: 'password', label: 'Password (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      {
        id: 'rpcclient_null',
        toolkitId: 'kali-full',
        name: 'RPCClient Null Session',
        description: 'Connect via null session to enumerate users and groups.',
        risk: 'medium',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true }
        ]
      },
      {
        id: 'crackmapexec_smb',
        toolkitId: 'kali-full',
        name: 'CrackMapExec SMB',
        description: 'SMB enumeration with CrackMapExec (shares, sessions, password policy).',
        risk: 'medium',
        executor: 'container',
        renderer: 'TableRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'cidr'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'username', label: 'Username (optional)', type: 'text', required: false, defaultValue: '' },
          { id: 'password', label: 'Password (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      // ── Password Attacks ──
      {
        id: 'hydra_ssh',
        toolkitId: 'kali-full',
        name: 'Hydra — SSH Brute Force',
        description: 'Brute-force SSH credentials with hydra.',
        risk: 'high',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'username', label: 'Username / user list', type: 'text', required: true, defaultValue: 'root' },
          { id: 'wordlist', label: 'Password wordlist', type: 'text', required: true, defaultValue: '/usr/share/wordlists/rockyou.txt' },
          { id: 'threads', label: 'Threads', type: 'text', required: false, defaultValue: '16' },
          { id: 'port', label: 'Port', type: 'text', required: false, defaultValue: '22' }
        ]
      },
      {
        id: 'hydra_ftp',
        toolkitId: 'kali-full',
        name: 'Hydra — FTP Brute Force',
        description: 'Brute-force FTP credentials.',
        risk: 'high',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'username', label: 'Username / user list', type: 'text', required: true, defaultValue: 'admin' },
          { id: 'wordlist', label: 'Password wordlist', type: 'text', required: true, defaultValue: '/usr/share/wordlists/rockyou.txt' },
          { id: 'threads', label: 'Threads', type: 'text', required: false, defaultValue: '16' }
        ]
      },
      {
        id: 'hydra_http',
        toolkitId: 'kali-full',
        name: 'Hydra — HTTP Form Brute Force',
        description: 'Brute-force HTTP login forms.',
        risk: 'high',
        executor: 'container',
        renderer: 'FindingRenderer',
        permissions: ['network.http', 'container.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host', 'domain', 'url'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'username', label: 'Username / user list', type: 'text', required: true, defaultValue: 'admin' },
          { id: 'wordlist', label: 'Password wordlist', type: 'text', required: true, defaultValue: '/usr/share/wordlists/rockyou.txt' },
          { id: 'path', label: 'Login path', type: 'text', required: false, defaultValue: '/login' },
          { id: 'form_params', label: 'Form params (user^USER^&pass^PASS^:fail_msg)', type: 'text', required: true, defaultValue: 'username=^USER^&password=^PASS^:Invalid' }
        ]
      },
      // ── Hash Cracking ──
      {
        id: 'john_basic',
        toolkitId: 'kali-full',
        name: 'John the Ripper',
        description: 'Crack password hashes with John.',
        risk: 'medium',
        executor: 'local-safe',
        renderer: 'RawTextRenderer',
        permissions: ['local.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'hashfile', label: 'Hash file path', type: 'text', required: true, defaultValue: '' },
          { id: 'wordlist', label: 'Wordlist', type: 'text', required: false, defaultValue: '/usr/share/wordlists/rockyou.txt' },
          { id: 'format', label: 'Hash format (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      {
        id: 'hashcat',
        toolkitId: 'kali-full',
        name: 'Hashcat Dictionary',
        description: 'GPU-accelerated hash cracking.',
        risk: 'medium',
        executor: 'local-safe',
        renderer: 'RawTextRenderer',
        permissions: ['local.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'hashfile', label: 'Hash file path', type: 'text', required: true, defaultValue: '' },
          { id: 'hash_mode', label: 'Hash mode', type: 'text', required: true, defaultValue: '0' },
          { id: 'wordlist', label: 'Wordlist', type: 'text', required: false, defaultValue: '/usr/share/wordlists/rockyou.txt' },
          { id: 'rules', label: 'Rule file (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      // ── Exploitation ──
      {
        id: 'searchsploit',
        toolkitId: 'kali-full',
        name: 'SearchSploit',
        description: 'Search Exploit-DB for exploits by keyword.',
        risk: 'low',
        executor: 'local-safe',
        renderer: 'TableRenderer',
        permissions: ['local.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'query', label: 'Search query', type: 'text', required: true, defaultValue: '' },
          { id: 'exact', label: 'Exact match', type: 'select', required: true, defaultValue: 'no', options: ['no', 'yes'] }
        ]
      },
      {
        id: 'msfvenom',
        toolkitId: 'kali-full',
        name: 'MSFVenom Payload',
        description: 'Generate a Metasploit payload with msfvenom.',
        risk: 'high',
        executor: 'local-safe',
        renderer: 'RawTextRenderer',
        permissions: ['local.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'payload', label: 'Payload', type: 'select', required: true, defaultValue: 'linux/x64/shell_reverse_tcp', options: ['linux/x64/shell_reverse_tcp', 'linux/x64/meterpreter/reverse_tcp', 'windows/x64/shell_reverse_tcp', 'windows/x64/meterpreter/reverse_tcp', 'linux/x86/shell_reverse_tcp'] },
          { id: 'lhost', label: 'LHOST', type: 'text', required: true, defaultValue: '' },
          { id: 'lport', label: 'LPORT', type: 'text', required: true, defaultValue: '4444' },
          { id: 'format', label: 'Output format', type: 'select', required: true, defaultValue: 'elf', options: ['elf', 'exe', 'raw', 'python', 'bash', 'c', 'dll'] }
        ]
      },
      {
        id: 'metasploit_console',
        toolkitId: 'kali-full',
        name: 'Metasploit Console',
        description: 'Launch msfconsole with resource script. Paste msfconsole into terminal.',
        risk: 'high',
        executor: 'container',
        renderer: 'RawTextRenderer',
        permissions: ['local.execute', 'container.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'resource', label: 'Resource script (optional)', type: 'text', required: false, defaultValue: '' },
          { id: 'quiet', label: 'Quiet mode', type: 'select', required: true, defaultValue: 'yes', options: ['yes', 'no'] }
        ]
      },
      // ── Sniffing / Network ──
      {
        id: 'tcpdump',
        toolkitId: 'kali-full',
        name: 'TCPDump Capture',
        description: 'Capture packets on a network interface.',
        risk: 'medium',
        executor: 'container',
        renderer: 'RawTextRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'interface', label: 'Interface', type: 'text', required: true, defaultValue: 'eth0' },
          { id: 'filter', label: 'BPF filter', type: 'text', required: false, defaultValue: '' },
          { id: 'count', label: 'Packet count (0 = unlimited)', type: 'text', required: false, defaultValue: '100' },
          { id: 'write_file', label: 'Save to file (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      },
      {
        id: 'tshark',
        toolkitId: 'kali-full',
        name: 'TShark Live Capture',
        description: 'Wireshark CLI packet capture and analysis.',
        risk: 'medium',
        executor: 'container',
        renderer: 'RawTextRenderer',
        permissions: ['network.scan', 'container.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'interface', label: 'Interface', type: 'text', required: true, defaultValue: 'eth0' },
          { id: 'filter', label: 'Display filter', type: 'text', required: false, defaultValue: '' },
          { id: 'count', label: 'Packet count', type: 'text', required: false, defaultValue: '50' }
        ]
      },
      // ── Forensics / File Analysis ──
      {
        id: 'binwalk',
        toolkitId: 'kali-full',
        name: 'Binwalk Extract',
        description: 'Extract embedded files and data from firmware images.',
        risk: 'low',
        executor: 'local-safe',
        renderer: 'TableRenderer',
        permissions: ['local.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'filepath', label: 'File path', type: 'text', required: true, defaultValue: '' },
          { id: 'extract', label: 'Extract files', type: 'select', required: true, defaultValue: 'yes', options: ['yes', 'no'] },
          { id: 'entropy', label: 'Entropy analysis', type: 'select', required: true, defaultValue: 'no', options: ['no', 'yes'] }
        ]
      },
      {
        id: 'exiftool',
        toolkitId: 'kali-full',
        name: 'ExifTool',
        description: 'Read and write metadata in files.',
        risk: 'low',
        executor: 'local-safe',
        renderer: 'TableRenderer',
        permissions: ['local.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'filepath', label: 'File path', type: 'text', required: true, defaultValue: '' },
          { id: 'verbose', label: 'Verbose', type: 'select', required: true, defaultValue: 'no', options: ['no', 'yes'] }
        ]
      },
      // ── Netcat / Reverse Shell ──
      {
        id: 'nc_listener',
        toolkitId: 'kali-full',
        name: 'Netcat Listener',
        description: 'Start a netcat listener on a port.',
        risk: 'high',
        executor: 'local-safe',
        renderer: 'RawTextRenderer',
        permissions: ['network.scan', 'local.execute'],
        targetPolicy: { required: false, allowedAssetTypes: [] },
        params: [
          { id: 'port', label: 'Port', type: 'text', required: true, defaultValue: '4444' },
          { id: 'verbose', label: 'Verbose', type: 'select', required: true, defaultValue: 'yes', options: ['yes', 'no'] }
        ]
      },
      {
        id: 'nc_connect',
        toolkitId: 'kali-full',
        name: 'Netcat Connect',
        description: 'Connect to a host:port with netcat.',
        risk: 'medium',
        executor: 'local-safe',
        renderer: 'RawTextRenderer',
        permissions: ['network.scan', 'local.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['host'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'port', label: 'Port', type: 'text', required: true, defaultValue: '80' }
        ]
      },
      // ── DNS Enum ──
      {
        id: 'dig_enum',
        toolkitId: 'kali-full',
        name: 'Dig DNS Enum',
        description: 'DNS enumeration — ANY, AXFR, NS, MX queries.',
        risk: 'low',
        executor: 'local-safe',
        renderer: 'RawTextRenderer',
        permissions: ['network.scan', 'local.execute'],
        targetPolicy: { required: true, allowedAssetTypes: ['domain'] },
        params: [
          { id: 'targetAssetId', label: 'Target asset', type: 'asset', required: true },
          { id: 'query_type', label: 'Query type', type: 'select', required: true, defaultValue: 'ANY', options: ['ANY', 'A', 'AAAA', 'MX', 'NS', 'TXT', 'AXFR', 'SOA'] },
          { id: 'dns_server', label: 'DNS server (optional)', type: 'text', required: false, defaultValue: '' }
        ]
      }
    ]
  }
];
