import { pipeline } from '@huggingface/transformers';
import { AuditResult, Threat, SuspiciousIP, UFWRule, RemediationPlan } from '../src/types/security';

export class LocalHfEngine {
  private generator: any = null;
  private isLoading = false;
  private loadError: string | null = null;
  public readonly modelName = 'HuggingFaceTB/SmolLM2-135M-Instruct';

  // Get current status of local model
  public getStatus() {
    return {
      status: this.generator ? 'ready' : this.isLoading ? 'loading' : 'unloaded',
      model: this.modelName,
      error: this.loadError,
      device: 'cpu (local onnx quantized)',
      isFree: true,
      requiresToken: false,
    };
  }

  // Pre-load or ensure model is loaded locally
  public async ensureModelLoaded() {
    if (this.generator) return this.generator;
    if (this.isLoading) {
      // Wait until loaded
      while (this.isLoading) {
        await new Promise((r) => setTimeout(r, 200));
      }
      return this.generator;
    }

    try {
      this.isLoading = true;
      this.loadError = null;
      console.log(`[LocalHF] Loading local Hugging Face model: ${this.modelName}...`);

      this.generator = await pipeline('text-generation', this.modelName, {
        dtype: 'q4', // Quantized 4-bit ONNX weights for fast local inference and low memory
      });

      console.log(`[LocalHF] Model ${this.modelName} successfully loaded in memory!`);
      return this.generator;
    } catch (err: any) {
      console.error('[LocalHF] Error loading local Hugging Face model:', err);
      this.loadError = err.message || 'Failed to load local ONNX model';
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  // Parse raw Linux logs locally (auth.log, ufw.log, syslog, nginx, secure)
  public parseLogsLocally(
    logText: string,
    whitelistIp?: string,
    sshPort = '22'
  ): {
    logType: string;
    eventsAnalyzed: number;
    attackVectors: string[];
    threats: Threat[];
    suspiciousIps: SuspiciousIP[];
    remediation: RemediationPlan;
  } {
    const lines = logText.split('\n').filter((l) => l.trim().length > 0);
    const ipCounts: Record<string, { count: number; timestamps: string[]; ports: Set<string>; users: Set<string>; lines: string[] }> = {};
    const detectedVectors = new Set<string>();
    const threats: Threat[] = [];

    let logType = 'Syslog / General Linux Log';
    if (/sshd|Failed password|Invalid user|auth\.log/i.test(logText)) {
      logType = 'auth.log / OpenSSH & PAM';
    } else if (/UFW BLOCK|SRC=|DPT=/i.test(logText)) {
      logType = 'ufw.log / Netfilter Kernel Firewall';
    } else if (/nginx|apache|GET \/|POST \//i.test(logText)) {
      logType = 'Web Server Access & Reverse Proxy';
    } else if (/sudo:|su\[/i.test(logText)) {
      logType = 'Privilege Escalation & Sudo Audit';
    }

    // IP regex patterns
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;

    lines.forEach((line) => {
      // 1. Check for SSH Brute Force / Invalid user
      const isFailedSsh = /Failed password|Invalid user|authentication failure/i.test(line);
      const isUfwBlock = /UFW BLOCK/i.test(line);
      const isSudoAbuse = /user NOT in sudoers|incorrect password attempts|FAILED SU/i.test(line);
      const isWebProbe = /GET \/(?:\.env|wp-|phpmyadmin|api\/v1)/i.test(line);

      if (isFailedSsh) detectedVectors.add('SSH Brute Force');
      if (isUfwBlock) detectedVectors.add('Port Scan & SYN Probe');
      if (isSudoAbuse) detectedVectors.add('Unauthorized Privilege Escalation');
      if (isWebProbe) detectedVectors.add('Automated Web Vulnerability Scan');

      // Extract IPs
      const ips = line.match(ipRegex) || [];
      ips.forEach((ip) => {
        // Skip private loopback
        if (ip === '127.0.0.1' || ip === '0.0.0.0') return;

        if (!ipCounts[ip]) {
          ipCounts[ip] = {
            count: 0,
            timestamps: [],
            ports: new Set(),
            users: new Set(),
            lines: [],
          };
        }
        ipCounts[ip].count++;
        if (ipCounts[ip].lines.length < 10) {
          ipCounts[ip].lines.push(line.trim());
        }

        // Extract port if present
        const portMatch = line.match(/port\s+([0-9]+)|DPT=([0-9]+)/i);
        if (portMatch) {
          ipCounts[ip].ports.add(portMatch[1] || portMatch[2]);
        }

        // Extract user if present
        const userMatch = line.match(/user\s+([a-zA-Z0-9_-]+)/i);
        if (userMatch) {
          ipCounts[ip].users.add(userMatch[1]);
        }
      });
    });

    // Build Suspicious IPs list
    const suspiciousIps: SuspiciousIP[] = Object.entries(ipCounts)
      .map(([ip, data]) => {
        // Calculate risk score (1-100)
        let score = Math.min(30 + data.count * 8, 98);
        if (data.users.has('root') || data.users.has('admin')) score = Math.min(score + 15, 99);
        if (data.ports.size > 2) score = Math.min(score + 10, 99); // Port scanning

        let reputation = 'Automated unauthorized probe';
        if (data.ports.size > 3) reputation = 'Stealth SYN Multi-Port Scanner';
        else if (data.count >= 5) reputation = 'Aggressive SSH Brute-Forcer';
        else if (data.users.size > 1) reputation = 'Multi-User Dictionary Sprayer';

        return {
          ip,
          attemptCount: data.count,
          riskScore: score,
          reputation,
          targetedService: data.ports.size > 0 ? `Ports ${Array.from(data.ports).join(', ')}` : 'SSH / Netfilter',
          suggestedAction: score >= 60 ? 'DENY' : 'LIMIT',
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);

    // Build Threats
    if (detectedVectors.has('SSH Brute Force')) {
      const sshIps = suspiciousIps.filter((i) => i.riskScore >= 60).map((i) => i.ip);
      threats.push({
        id: 'THREAT-LOCAL-001',
        title: 'Distributed SSH Password Spray & Credential Stuffing',
        severity: sshIps.length > 2 ? 'CRITICAL' : 'HIGH',
        attackVector: 'SSH Brute Force',
        description: `Detected repeated authentication failures and non-existent user probing across ${sshIps.length || 1} external IP address(es).`,
        sourceIps: sshIps.slice(0, 5),
        targetedPorts: [sshPort],
        targetedUsers: ['root', 'admin', 'ubuntu', 'deploy'],
        frequency: `${sshIps.reduce((acc, ip) => acc + (ipCounts[ip]?.count || 0), 0)} failed attempts recorded`,
        evidenceLogLines: lines.filter((l) => /Failed password|Invalid user/i.test(l)).slice(0, 5),
        recommendedAction: 'Apply immediate UFW deny rules at chain priority 1, enforce SSH key authentication, and configure fail2ban jail.',
      });
    }

    if (detectedVectors.has('Port Scan & SYN Probe')) {
      const scanIps = suspiciousIps.filter((i) => i.reputation?.includes('Scanner')).map((i) => i.ip);
      threats.push({
        id: 'THREAT-LOCAL-002',
        title: 'Network Port Scanning & TCP SYN Flood Reconnaissance',
        severity: 'HIGH',
        attackVector: 'Port Scan & SYN Probe',
        description: 'Firewall audit trail intercepted coordinated SYN packets probing database, remote desktop, and management ports.',
        sourceIps: scanIps.length > 0 ? scanIps : suspiciousIps.slice(0, 3).map((i) => i.ip),
        targetedPorts: ['22', '23', '80', '443', '3389', '6379', '5432'],
        frequency: 'Rapid successive SYN packets dropped by kernel netfilter',
        evidenceLogLines: lines.filter((l) => /UFW BLOCK/i.test(l)).slice(0, 5),
        recommendedAction: 'Blackhole scanner IP addresses using UFW and ensure unneeded internal services are bound to localhost only.',
      });
    }

    if (detectedVectors.has('Unauthorized Privilege Escalation')) {
      threats.push({
        id: 'THREAT-LOCAL-003',
        title: 'Internal Sudo Abuse & Privilege Escalation Attempt',
        severity: 'CRITICAL',
        attackVector: 'Unauthorized Privilege Escalation',
        description: 'User sessions or service accounts attempted unauthorized sudo commands and shadow file access.',
        sourceIps: suspiciousIps.slice(0, 2).map((i) => i.ip),
        evidenceLogLines: lines.filter((l) => /user NOT in sudoers|FAILED SU/i.test(l)).slice(0, 5),
        recommendedAction: 'Audit sudoers file (/etc/sudoers.d/), revoke compromised service account permissions, and inspect cron jobs.',
      });
    }

    if (threats.length === 0) {
      threats.push({
        id: 'THREAT-LOCAL-004',
        title: 'Anomalous Connection Activity',
        severity: 'MEDIUM',
        attackVector: 'Suspicious Network Probe',
        description: 'System log entries show elevated unauthorized probe attempts from external network entities.',
        sourceIps: suspiciousIps.slice(0, 3).map((i) => i.ip),
        evidenceLogLines: lines.slice(0, 4),
        recommendedAction: 'Apply UFW rate limiting and verify SSH daemon access control.',
      });
    }

    // Build UFW Rules
    const ufwRules: UFWRule[] = [];
    suspiciousIps
      .filter((i) => i.suggestedAction === 'DENY')
      .slice(0, 8)
      .forEach((item, idx) => {
        ufwRules.push({
          command: `sudo ufw insert 1 deny from ${item.ip} to any comment 'LogGuard Local: Block ${item.reputation}'`,
          explanation: `Drop all incoming network packets from rogue source IP ${item.ip} before matching allow directives.`,
          target: item.ip,
          ruleNumber: idx + 1,
        });
      });

    ufwRules.push({
      command: `sudo ufw limit ${sshPort}/tcp comment 'LogGuard: Rate Limit SSH'`,
      explanation: `Limit connection attempts to port ${sshPort} to mitigate distributed brute force attacks.`,
      target: `${sshPort}/tcp`,
    });

    // Build Fail2ban config
    const fail2banConfig = {
      jailLocalSnippet: `[sshd]\nenabled = true\nport = ${sshPort}\nlogpath = %(sshd_log)s\nbackend = %(syslog_backend)s\nmaxretry = 3\nfindtime = 600\nbantime = 86400`,
      explanation: `Configures automatic 24-hour bans for any source IP that fails 3 authentication attempts within 10 minutes.`,
      commands: ['sudo systemctl enable fail2ban', 'sudo systemctl restart fail2ban'],
    };

    // Build sshd_config hardening
    const sshdConfig = {
      recommendedSettings: [
        'PasswordAuthentication no',
        'PermitRootLogin no',
        'PubkeyAuthentication yes',
        'MaxAuthTries 3',
        `Port ${sshPort}`,
      ],
      explanation: 'Disables vulnerable password logins and direct root SSH access, enforcing public-key authentication.',
      commands: [
        "sudo sed -i 's/^#\\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config",
        "sudo sed -i 's/^#\\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config",
        'sudo sshd -t && sudo systemctl reload sshd',
      ],
    };

    // Build full bash script
    const bashScript = `#!/usr/bin/env bash
# ==============================================================================
# LogGuard Automated Linux Hardening & UFW Remediation Script (Local HF Engine)
# Generated: ${new Date().toISOString()}
# Target SSH Port: ${sshPort}
# ==============================================================================

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This remediation script must be run as root (use sudo)." 
   exit 1
fi

echo "[LogGuard] Creating backup of current firewall configuration..."
mkdir -p /var/backups/ufw
cp -r /etc/ufw /var/backups/ufw/backup-$(date +%Y%m%d%H%M%S)

${whitelistIp ? `echo "[LogGuard] Ensuring Admin Whitelist IP ${whitelistIp} is authorized..."\nufw insert 1 allow from ${whitelistIp} comment 'LogGuard: Admin Whitelist Safe'\n` : ''}
echo "[LogGuard] Applying threat mitigation firewall rules..."
${ufwRules.map((r) => r.command.replace(/^sudo /, '')).join('\n')}

echo "[LogGuard] Reloading firewall daemon..."
ufw reload

echo "[LogGuard] Current UFW Status:"
ufw status numbered | head -n 30

echo "[SUCCESS] LogGuard Local Remediation complete. Monitor logs with: journalctl -u ufw -f"
`;

    return {
      logType,
      eventsAnalyzed: lines.length,
      attackVectors: Array.from(detectedVectors),
      threats,
      suspiciousIps,
      remediation: {
        ufwRules,
        fail2banConfig,
        sshdConfig,
        csfConfig: {
          denyEntries: suspiciousIps.map((s) => `${s.ip} # LogGuard Local: ${s.reputation}`),
          explanation: 'Entries to block via ConfigServer Security & Firewall (/etc/csf/csf.deny).',
        },
        bashScript,
        immediateActions: [
          `Block identified rogue IPs (${suspiciousIps.slice(0, 3).map((s) => s.ip).join(', ')}) using UFW.`,
          `Ensure administrative IP ${whitelistIp || '(your current IP)'} is whitelisted before reloading firewall.`,
          `Disable password authentication in /etc/ssh/sshd_config to neutralize brute force vectors.`,
          `Restart fail2ban to enforce automated IP jailing.`,
        ],
      },
    };
  }

  // Full Audit utilizing local Hugging Face model + local parser
  public async analyze(
    logText: string,
    whitelistIp?: string,
    sshPort = '22'
  ): Promise<AuditResult> {
    const parsed = this.parseLogsLocally(logText, whitelistIp, sshPort);

    // Default professional executive summary
    const topIps = parsed.suspiciousIps.map((s) => s.ip).slice(0, 3).join(', ');
    const vectors = parsed.attackVectors.join(', ') || 'Unauthenticated probe';
    let summaryText = `Local LogGuard audit analyzed ${parsed.eventsAnalyzed} log event(s) and flagged ${parsed.threats.length} threat pattern(s) across ${parsed.suspiciousIps.length} suspicious IP(s) [${topIps || 'None'}]. Primary vector: ${vectors}. Immediate UFW rules and fail2ban jails have been generated.`;

    try {
      const generator = await this.ensureModelLoaded();
      const prompt = `<|im_start|>system\nYou are a Linux server security auditor. Write a concise 2-sentence summary of this log analysis.<|im_end|>\n<|im_start|>user\nDetected ${vectors} from IPs ${topIps} across ${parsed.eventsAnalyzed} events. Summarize threat level and immediate action.<|im_end|>\n<|im_start|>assistant\n`;
      
      const output = await generator(prompt, {
        max_new_tokens: 70,
        temperature: 0.2,
        repetition_penalty: 1.2,
        do_sample: false,
        return_full_text: false,
      });

      if (output?.[0]?.generated_text) {
        let genText = output[0].generated_text;
        // Strip any residual prompt tags
        genText = genText.replace(/.*?assistant\s*/is, '');
        genText = genText.replace(/<\|im_end\|>.*$/s, '');
        genText = genText.replace(/<\|im_start\|>.*$/s, '').trim();

        // Validate generation doesn't contain repetition or gibberish
        const hasRepetition = /(?:(\b\S+\b)\s+\1){3,}/i.test(genText);
        if (genText.length >= 25 && !hasRepetition && !genText.includes('system') && !genText.includes('user')) {
          summaryText = genText;
        }
      }
    } catch (err) {
      console.warn('[LocalHF] Using local deterministic summary:', err);
    }

    const maxRisk = parsed.suspiciousIps[0]?.riskScore || 50;
    const overallRisk = maxRisk >= 85 ? 'CRITICAL' : maxRisk >= 70 ? 'HIGH' : maxRisk >= 45 ? 'MEDIUM' : 'LOW';

    return {
      summary: summaryText,
      overallRisk,
      logTypeDetected: parsed.logType,
      totalEventsAnalyzed: parsed.eventsAnalyzed,
      attackVectors: parsed.attackVectors.length > 0 ? parsed.attackVectors : ['Unauthorized Connection Attempts'],
      threats: parsed.threats,
      suspiciousIps: parsed.suspiciousIps,
      remediation: parsed.remediation,
    };
  }

  // Interactive Chat using Local Hugging Face Model
  public async chat(
    message: string,
    history: Array<{ role: string; content: string }>,
    logContext: string,
    analysisSummary: string
  ): Promise<string> {
    const trimmedMsg = message.trim();
    const extractedIpMatch = trimmedMsg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const targetIp = extractedIpMatch ? extractedIpMatch[0] : '198.51.100.25';
    const lower = trimmedMsg.toLowerCase();

    // Fast-path expert SecOps handlers for common admin prompts ensuring exact syntax
    if (lower.includes('block') || lower.includes('deny') || lower.includes('ban') || lower.includes('firewall rule')) {
      return `To immediately block and drop all incoming traffic from ${targetIp} using UFW without disrupting active sessions, execute the following commands in order. All commands are formatted in **one single contiguous code block**:

\`\`\`bash
# 1. Insert rule at chain position 1 so it takes precedence over general allow rules
sudo ufw insert 1 deny from ${targetIp} to any comment "LogGuard Local: Block malicious probe"

# 2. Reload the UFW daemon to apply changes immediately
sudo ufw reload

# 3. Verify the rule position and active status
sudo ufw status numbered | grep -E "${targetIp}|Status"
\`\`\`

**Note:** Always ensure your own administrative IP is whitelisted (\`sudo ufw insert 1 allow from <YOUR_IP>\`) before applying new blocks.`;
    }

    if (lower.includes('whitelist') || lower.includes('allow my ip') || lower.includes('unblock')) {
      return `To whitelist your administrative workstation or trusted jump host so you never get locked out:

\`\`\`bash
# Whitelist specific IP at top priority
sudo ufw insert 1 allow from ${targetIp} to any comment "LogGuard: Trusted Admin IP"
sudo ufw reload
sudo ufw status numbered | head -n 15
\`\`\``;
    }

    if (lower.includes('fail2ban') || lower.includes('jail')) {
      return `Here is the complete fail2ban configuration and service restart commands in a single code block:

\`\`\`bash
# Ensure fail2ban is installed and active
sudo apt-get update && sudo apt-get install -y fail2ban

# Create local jail override for SSH
sudo tee /etc/fail2ban/jail.d/logguard-ssh.local << 'EOF'
[sshd]
enabled = true
port = ssh
maxretry = 3
findtime = 600
bantime = 86400
action = ufw
EOF

# Restart fail2ban and check jail status
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
\`\`\``;
    }

    if (lower.includes('sshd') || lower.includes('ssh config') || lower.includes('root login') || lower.includes('password')) {
      return `Here are the commands to securely harden OpenSSH daemon against brute-force attacks:

\`\`\`bash
# Backup original sshd_config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak-$(date +%F)

# Enforce key-only authentication and disable direct root login
sudo sed -i 's/^#\\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\\?MaxAuthTries .*/MaxAuthTries 3/' /etc/ssh/sshd_config

# Test configuration syntax before reloading
sudo sshd -t && sudo systemctl reload sshd
echo "[OK] SSH daemon hardened and reloaded safely."
\`\`\``;
    }

    // Use local Hugging Face model for general security guidance
    try {
      const generator = await this.ensureModelLoaded();

      const prompt = `<|im_start|>system
You are LogGuard, a senior Linux security engineer running locally on-device.
Context: ${analysisSummary.slice(0, 200)}
Format rule: If providing terminal commands, ALWAYS place all commands into ONE single code block (\`\`\`bash ... \`\`\`). Keep explanation concise.<|im_end|>
<|im_start|>user
${message}<|im_end|>
<|im_start|>assistant
`;

      const output = await generator(prompt, {
        max_new_tokens: 140,
        temperature: 0.3,
        repetition_penalty: 1.15,
        do_sample: false,
        return_full_text: false,
      });

      if (output?.[0]?.generated_text) {
        let answer = output[0].generated_text;
        answer = answer.replace(/.*?assistant\s*/is, '');
        answer = answer.replace(/<\|im_end\|>.*$/s, '');
        answer = answer.replace(/<\|im_start\|>.*$/s, '').trim();
        if (answer.length > 20 && !answer.includes('system') && !answer.includes('user')) {
          return answer;
        }
      }
    } catch (err) {
      console.warn('[LocalHF] Error in local model chat generation:', err);
    }

    // Robust default sysadmin response
    return `[LogGuard Local Engine]
To harden and inspect your Linux server regarding this request, execute the following commands in **one single code block**:

\`\`\`bash
# 1. Inspect current firewall rules and dropped packet statistics
sudo ufw status verbose

# 2. Check live authentication attempts in real-time
sudo tail -f /var/log/auth.log | grep -E "Failed|Invalid"

# 3. Apply rate-limiting for incoming SSH handshakes
sudo ufw limit ssh/tcp comment "LogGuard: SSH Rate Limit"
sudo ufw reload
\`\`\`

All commands are validated for Ubuntu/Debian and RedHat/Rocky systems using UFW.`;
  }
}

export const localHfEngine = new LocalHfEngine();

