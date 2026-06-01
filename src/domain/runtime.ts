import type { ActionDefinition, AuthorizedAsset, CommandBlock, Job } from './models';

export function validateActionParams(
  action: ActionDefinition,
  params: Record<string, string>,
  assets: AuthorizedAsset[]
): string[] {
  const errors: string[] = [];

  for (const param of action.params) {
    const value = params[param.id];
    if (param.required && !value) {
      errors.push(`${param.label} is required.`);
      continue;
    }

    if (param.pattern && value && !new RegExp(param.pattern).test(value)) {
      errors.push(`${param.label} does not match the required format.`);
    }
  }

  if (action.targetPolicy.required) {
    const targetAssetId = params.targetAssetId;
    const asset = assets.find((candidate) => candidate.id === targetAssetId);
    if (!asset) {
      errors.push('Target must come from the authorized asset inventory.');
    } else if (!action.targetPolicy.allowedAssetTypes.includes(asset.type)) {
      errors.push(`Asset type ${asset.type} is not allowed for this action.`);
    }
  }

  return errors;
}

function assetValue(
  params: Record<string, string>,
  assets: AuthorizedAsset[]
): string {
  const asset = assets.find((candidate) => candidate.id === params.targetAssetId);
  return asset?.value ?? '<target>';
}

function assetHost(params: Record<string, string>, assets: AuthorizedAsset[]): string {
  const asset = assets.find((candidate) => candidate.id === params.targetAssetId);
  return asset?.value ?? '<target>';
}

function buildUrl(params: Record<string, string>, assets: AuthorizedAsset[]): string {
  const asset = assets.find((candidate) => candidate.id === params.targetAssetId);
  const scheme = params.scheme || 'http';
  let host = asset?.value ?? '<target>';

  // If the value is already a full URL, extract host:port
  if (host.startsWith('http://') || host.startsWith('https://')) {
    const parsed = new URL(host);
    host = parsed.host;
  }

  const portPart = params.port ? `:${params.port}` : '';
  return `${scheme}://${host}${portPart}`;
}

export function buildCommandPreview(
  action: ActionDefinition,
  params: Record<string, string>,
  assets: AuthorizedAsset[]
): string {
  const host = assetHost(params, assets);
  const url = buildUrl(params, assets);
  const val = assetValue(params, assets);

  switch (action.id) {
    // ── Network Recon ──
    case 'nmap_quick':
      return `nmap -T${params.timing || 'T4'} -F ${host}`;

    case 'nmap_full_tcp':
      return `nmap -sT -p- -T${params.timing || 'T4'} --min-rate ${params.min_rate || '1000'} ${host}`;

    case 'nmap_service_os':
      return `nmap -sV -sC -O -p ${params.ports || '1-10000'} ${host}`;

    case 'nmap_udp':
      return `sudo nmap -sU --top-ports ${params.top_ports || '200'} -T${params.timing || 'T4'} ${host}`;

    case 'nmap_vuln':
      return `nmap --script vuln -p ${params.ports || '1-10000'} ${host}`;

    case 'nmap_smb_enum':
      return `nmap -p 139,445 --script smb-os-discovery,smb-enum-shares,smb-enum-users,smb-enum-domains,smb-enum-sessions ${host}`;

    // ── Web Enumeration ──
    case 'gobuster_dir': {
      let cmd = `gobuster dir -u ${url}`;
      if (params.wordlist) cmd += ` -w ${params.wordlist}`;
      if (params.extensions) cmd += ` -x ${params.extensions}`;
      return cmd;
    }

    case 'gobuster_vhost': {
      let cmd = `gobuster vhost -u ${url}`;
      if (params.wordlist) cmd += ` -w ${params.wordlist}`;
      return cmd;
    }

    case 'ffuf_dir': {
      let ffufUrl = url;
      if (!ffufUrl.endsWith('/')) ffufUrl += '/';
      ffufUrl += 'FUZZ';
      let cmd = `ffuf -u ${ffufUrl} -w ${params.wordlist || '/usr/share/seclists/Discovery/Web-Content/common.txt'}`;
      if (params.extensions) cmd += ` -e ${params.extensions}`;
      if (params.threads) cmd += ` -t ${params.threads}`;
      return cmd;
    }

    case 'ffuf_vhost': {
      let cmd = `ffuf -u ${url} -H "Host: FUZZ" -w ${params.wordlist || '/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt'}`;
      return cmd;
    }

    case 'dirb': {
      let cmd = `dirb ${url}`;
      if (params.wordlist) cmd += ` ${params.wordlist}`;
      if (params.extensions) cmd += ` -X ${params.extensions}`;
      return cmd;
    }

    case 'nikto': {
      let cmd = `nikto -h ${host}`;
      if (params.port) cmd += ` -p ${params.port}`;
      if (params.ssl === 'yes') cmd += ' -ssl';
      return cmd;
    }

    case 'whatweb':
      return `whatweb -a ${params.aggression || '3'} ${host}`;

    case 'wpscan_basic':
      return `wpscan --url ${url}`;

    case 'wpscan_enum': {
      let cmd = `wpscan --url ${url} -e ap,at,tt,cb,dbe,u,m`;
      if (params.api_token) cmd += ` --api-token ${params.api_token}`;
      return cmd;
    }

    // ── SQL Injection ──
    case 'sqlmap_basic': {
      let cmd = `sqlmap -u "${val}" --risk ${params.risk || '2'} --level ${params.level || '3'}`;
      if (params.batch === 'yes') cmd += ' --batch';
      return cmd;
    }

    case 'sqlmap_dbs': {
      let cmd = `sqlmap -u "${val}" --dbs`;
      if (params.cookie) cmd += ` --cookie="${params.cookie}"`;
      return cmd;
    }

    case 'sqlmap_dump': {
      let cmd = `sqlmap -u "${val}" -D ${params.database} -T ${params.table} --dump`;
      if (params.columns) cmd += ` -C ${params.columns}`;
      return cmd;
    }

    // ── SMB / Windows Enum ──
    case 'enum4linux':
      return `enum4linux -a ${host}`;

    case 'smbclient_list': {
      const userFlag = params.username ? `-U "${params.username}"` : '-N';
      return `smbclient -L //${host} ${userFlag}`;
    }

    case 'smbmap': {
      let cmd = `smbmap -H ${host}`;
      if (params.username) cmd += ` -u "${params.username}"`;
      if (params.password) cmd += ` -p "${params.password}"`;
      return cmd;
    }

    case 'rpcclient_null':
      return `rpcclient -U "" -N ${host}`;

    case 'crackmapexec_smb': {
      let cmd = `crackmapexec smb ${host}`;
      if (params.username) cmd += ` -u "${params.username}"`;
      if (params.password) cmd += ` -p "${params.password}"`;
      return cmd;
    }

    // ── Password Attacks ──
    case 'hydra_ssh':
      return `hydra -l ${params.username || 'root'} -P ${params.wordlist || '/usr/share/wordlists/rockyou.txt'} -t ${params.threads || '16'} -s ${params.port || '22'} ssh://${host}`;

    case 'hydra_ftp':
      return `hydra -l ${params.username || 'admin'} -P ${params.wordlist || '/usr/share/wordlists/rockyou.txt'} -t ${params.threads || '16'} ftp://${host}`;

    case 'hydra_http': {
      let cmd = `hydra -l ${params.username || 'admin'} -P ${params.wordlist || '/usr/share/wordlists/rockyou.txt'}`;
      cmd += ` ${host} http-post-form "${params.path || '/login'}:${params.form_params || 'username=^USER^&password=^PASS^:Invalid'}"`;
      return cmd;
    }

    // ── Hash Cracking ──
    case 'john_basic': {
      let cmd = `john ${params.hashfile || '<hashfile>'}`;
      if (params.wordlist) cmd += ` --wordlist=${params.wordlist}`;
      if (params.format) cmd += ` --format=${params.format}`;
      return cmd;
    }

    case 'hashcat': {
      let cmd = `hashcat -m ${params.hash_mode || '0'} -a 0 ${params.hashfile || '<hashfile>'} ${params.wordlist || '/usr/share/wordlists/rockyou.txt'}`;
      if (params.rules) cmd += ` -r ${params.rules}`;
      return cmd;
    }

    // ── Exploitation ──
    case 'searchsploit': {
      let cmd = `searchsploit ${params.query || '<query>'}`;
      if (params.exact === 'yes') cmd += ' -e';
      return cmd;
    }

    case 'msfvenom':
      return `msfvenom -p ${params.payload || 'linux/x64/shell_reverse_tcp'} LHOST=${params.lhost || '<LHOST>'} LPORT=${params.lport || '4444'} -f ${params.format || 'elf'} -o payload.${params.format || 'elf'}`;

    case 'metasploit_console': {
      let cmd = 'msfconsole';
      if (params.quiet === 'yes') cmd += ' -q';
      if (params.resource) cmd += ` -r ${params.resource}`;
      return cmd;
    }

    // ── Sniffing / Network ──
    case 'tcpdump': {
      let cmd = `sudo tcpdump -i ${params.interface || 'eth0'} -nn`;
      if (params.filter) cmd += ` '${params.filter}'`;
      if (params.count && params.count !== '0') cmd += ` -c ${params.count}`;
      if (params.write_file) cmd += ` -w ${params.write_file}`;
      return cmd;
    }

    case 'tshark': {
      let cmd = `tshark -i ${params.interface || 'eth0'}`;
      if (params.filter) cmd += ` -Y '${params.filter}'`;
      if (params.count) cmd += ` -c ${params.count}`;
      return cmd;
    }

    // ── Forensics / File Analysis ──
    case 'binwalk': {
      let cmd = `binwalk ${params.filepath || '<file>'}`;
      if (params.extract === 'yes') cmd += ' -e';
      if (params.entropy === 'yes') cmd += ' -E';
      return cmd;
    }

    case 'exiftool': {
      let cmd = `exiftool ${params.filepath || '<file>'}`;
      if (params.verbose === 'yes') cmd += ' -v';
      return cmd;
    }

    // ── Netcat ──
    case 'nc_listener':
      return `nc -lvnp ${params.port || '4444'}`;

    case 'nc_connect':
      return `nc -nv ${host} ${params.port || '80'}`;

    // ── DNS Enum ──
    case 'dig_enum': {
      let cmd = `dig ${params.query_type || 'ANY'} ${host}`;
      if (params.dns_server) cmd += ` @${params.dns_server}`;
      return cmd;
    }

    default:
      return `${action.id} --target ${val}`;
  }
}

export function createJob(
  action: ActionDefinition,
  params: Record<string, string>
): Job {
  const now = new Date().toISOString();
  return {
    id: `job_${crypto.randomUUID().slice(0, 8)}`,
    actionId: action.id,
    actionName: action.name,
    status: 'queued',
    risk: action.risk,
    targetAssetId: params.targetAssetId,
    createdAt: now,
    renderer: action.renderer,
    output: ['job.requested: action accepted by registry', 'job.queued: waiting for executor']
  };
}

export function createCommandBlock(job: Job, commandPreview: string): CommandBlock {
  return {
    id: `block_${crypto.randomUUID().slice(0, 8)}`,
    jobId: job.id,
    actionName: job.actionName,
    commandPreview,
    status: job.status,
    renderer: job.renderer,
    pinned: false
  };
}

export function nextOutput(job: Job): string {
  const lines = [
    `audit: ${job.id} permission check passed`,
    `executor: ${job.risk === 'high' ? 'vm' : 'container'} sandbox prepared`,
    `stream: collecting stdout/stderr chunks`,
    `parser: selected ${job.renderer}`,
    `artifact: immutable result stored`
  ];

  return lines[Math.min(job.output.length - 2, lines.length - 1)];
}
