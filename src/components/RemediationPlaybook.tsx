import React, { useState } from 'react';
import {
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  Download,
  Flame,
  FileCode,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  Info,
  Server,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RemediationPlan, UFWRule } from '../types/security';

interface RemediationPlaybookProps {
  remediation: RemediationPlan;
  whitelistIp?: string;
  sshPort?: string;
}

export const RemediationPlaybook: React.FC<RemediationPlaybookProps> = ({
  remediation,
  whitelistIp,
  sshPort = '22',
}) => {
  const [activeTab, setActiveTab] = useState<'ufw' | 'script' | 'fail2ban' | 'sshd' | 'terminal'>(
    'ufw'
  );
  const [copiedBashBlock, setCopiedBashBlock] = useState<string | null>(null);
  const [showDetailedRules, setShowDetailedRules] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Construct one unified bash command block for UFW
  const ufwUnifiedBashBlock = [
    '# ==============================================================================#',
    '# LogGuard UFW Firewall Remediation (Execute all in one terminal block)          #',
    '# ==============================================================================#',
    whitelistIp
      ? `# 1. Preserve SysAdmin Access (Whitelist takes priority at chain position 1)\nsudo ufw insert 1 allow from ${whitelistIp} comment 'LogGuard: Admin Whitelist Safe'\n`
      : null,
    '# 2. Block Rogue Threat Actors at top of chain (insert 1)',
    ...remediation.ufwRules.map((r) => r.command),
    '',
    '# 3. Reload Firewall and Verify Active Numbered Chain',
    'sudo ufw reload',
    'sudo ufw status numbered',
  ]
    .filter(Boolean)
    .join('\n');

  // Construct one unified bash command block for Fail2ban
  const fail2banUnifiedBashBlock = [
    '# ==============================================================================#',
    '# LogGuard Fail2ban Hardening (Execute all in one terminal block)               #',
    '# ==============================================================================#',
    '# 1. Append jail configuration to /etc/fail2ban/jail.local',
    `sudo tee -a /etc/fail2ban/jail.local > /dev/null << 'EOF'`,
    remediation.fail2banConfig.jailLocalSnippet.trim(),
    'EOF',
    '',
    '# 2. Enable service on boot and reload active jails',
    'sudo systemctl enable fail2ban',
    'sudo systemctl restart fail2ban',
    'sudo fail2ban-client status sshd',
  ].join('\n');

  // Construct one unified bash command block for OpenSSH
  const sshdUnifiedBashBlock = [
    '# ==============================================================================#',
    '# LogGuard OpenSSH Daemon Hardening (Execute all in one terminal block)         #',
    '# ==============================================================================#',
    '# 1. Create timestamped backup of current SSH configuration',
    'sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F_%H%M%S)',
    '',
    '# 2. Apply recommended security directives',
    ...remediation.sshdConfig.recommendedSettings.map((setting) => {
      const key = setting.split(' ')[0];
      return `sudo sed -i 's/^#\\?${key} .*/${setting}/' /etc/ssh/sshd_config`;
    }),
    '',
    '# 3. Test config syntax (prevents lockout) and reload daemon',
    'sudo sshd -t && sudo systemctl reload sshd',
  ].join('\n');

  const handleCopyBlock = (text: string, blockName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBashBlock(blockName);
    setTimeout(() => setCopiedBashBlock(null), 2000);
  };

  const downloadBashScript = () => {
    const scriptContent = remediation.bashScript.startsWith('#!/bin/bash')
      ? remediation.bashScript
      : `#!/usr/bin/env bash
# ==============================================================================
# LogGuard Automated Linux Hardening & UFW Remediation Script
# Generated: ${new Date().toISOString()}
# Target SSH Port: ${sshPort}
# ==============================================================================

set -euo pipefail

# Ensure running as root
if [[ $EUID -ne 0 ]]; then
   echo "[ERROR] This remediation script must be run as root (use sudo)." 
   exit 1
fi

echo "[LogGuard] Creating backup of current firewall configuration..."
mkdir -p /var/backups/ufw
cp -r /etc/ufw /var/backups/ufw/backup-$(date +%Y%m%d%H%M%S)

${
  whitelistIp
    ? `echo "[LogGuard] Ensuring Admin Whitelist IP ${whitelistIp} is authorized..."\nufw insert 1 allow from ${whitelistIp} comment 'LogGuard: Admin Whitelist Safe'\n`
    : ''
}
echo "[LogGuard] Applying threat mitigation firewall rules..."
${remediation.ufwRules.map((r) => r.command.replace(/^sudo /, '')).join('\n')}

echo "[LogGuard] Reloading firewall daemon..."
ufw reload

echo "[LogGuard] Current UFW Status:"
ufw status numbered | head -n 30

echo "[SUCCESS] LogGuard Remediation complete. Monitor logs with: journalctl -u ufw -f"
`;

    const blob = new Blob([scriptContent], { type: 'text/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logguard-remediation-${Date.now()}.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runSimulation = () => {
    setIsSimulating(true);
    setSimulatedLogs(['$ sudo ./apply-logguard-remediation.sh', '[*] Verifying root privileges... OK']);

    const steps = [
      '[*] Generating backup: /var/backups/ufw/backup-20261022.rules',
      whitelistIp
        ? `[*] Whitelisting sysadmin safe IP: ${whitelistIp}`
        : '[*] Checking active SSH connection state to prevent lockout... (Port ' + sshPort + ')',
      ...remediation.ufwRules.map((r) => `[+] Rule added: ${r.command.replace(/^sudo /, '')}`),
      '[*] Firewall reloaded: ufw reload (Active and enabled on system startup)',
      '[*] Status: 0 packets dropped on safe ports, malicious IPs routed to blackhole.',
      '[SUCCESS] System environment hardened against observed vectors.',
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setSimulatedLogs((prev) => [...prev, steps[current]]);
        current++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 400);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Playbook Header & Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Automated Remediation Generator
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Single-block terminal commands and production-safe hardening scripts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyBlock(ufwUnifiedBashBlock, 'ufw-top')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-400 transition-colors"
            >
              {copiedBashBlock === 'ufw-top' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBashBlock === 'ufw-top' ? 'Copied in One Block!' : 'Copy All Commands (1 Block)'}</span>
            </button>

            <button
              onClick={downloadBashScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download .sh Script</span>
            </button>
          </div>
        </div>

        {/* Playbook Tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-slate-950/80 border border-slate-800 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('ufw')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
              activeTab === 'ufw'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>UFW Commands (1 Block)</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
              activeTab === 'script'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Full Bash Hardening Script</span>
          </button>

          <button
            onClick={() => setActiveTab('fail2ban')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
              activeTab === 'fail2ban'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fail2ban Commands (1 Block)</span>
          </button>

          <button
            onClick={() => setActiveTab('sshd')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
              activeTab === 'sshd'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>OpenSSH Hardening (1 Block)</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
              activeTab === 'terminal'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulate Terminal Run</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-4 sm:p-5">
        {/* Tab 1: UFW Commands Unified in One Block */}
        {activeTab === 'ufw' && (
          <div className="space-y-4">
            {/* Rule ordering safety callout */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-slate-300 leading-relaxed">
                <span className="font-semibold text-white">Rule Priority Order:</span> All rules use{' '}
                <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded font-mono">
                  ufw insert 1
                </code>{' '}
                so that malicious IPs are dropped at the highest priority before hitting any general allow rules. Copy and run the single command block below.
              </div>
            </div>

            {/* UNIFIED BASH COMMAND BLOCK */}
            <div className="rounded-xl border border-slate-800 bg-black/95 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-850 text-xs">
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>bash · All UFW remediation commands</span>
                </div>

                <button
                  onClick={() => handleCopyBlock(ufwUnifiedBashBlock, 'ufw-main')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-all"
                >
                  {copiedBashBlock === 'ufw-main' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied in 1 Block!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Entire Command Block</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed select-all">
                {ufwUnifiedBashBlock}
              </pre>
            </div>

            {/* Optional detailed rule explanation dropdown */}
            <div className="pt-1">
              <button
                onClick={() => setShowDetailedRules(!showDetailedRules)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 select-none"
              >
                {showDetailedRules ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {showDetailedRules
                    ? 'Hide individual rule rationales'
                    : `View individual rule breakdown & rationales (${remediation.ufwRules.length} rules)`}
                </span>
              </button>

              {showDetailedRules && (
                <div className="mt-3 space-y-2 border-t border-slate-800/60 pt-3">
                  {remediation.ufwRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold">Rule #{idx + 1}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-300 font-sans">{rule.explanation}</span>
                        </div>
                        <code className="text-[11px] font-mono text-slate-300 block">
                          {rule.command}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Full Bash Script */}
        {activeTab === 'script' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Self-contained, idempotent bash hardening script with automatic firewall backups:
              </span>
              <button
                onClick={() => handleCopyBlock(remediation.bashScript, 'full-script')}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                {copiedBashBlock === 'full-script' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Script Block</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-black/95 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto max-h-96 leading-relaxed select-all">
              {remediation.bashScript}
            </pre>
          </div>
        )}

        {/* Tab 3: Fail2ban Config Unified in One Block */}
        {activeTab === 'fail2ban' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-300">
              <span className="font-semibold text-white block mb-1">
                Fail2ban Automated Intrusion Prevention:
              </span>
              {remediation.fail2banConfig.explanation}
            </div>

            {/* UNIFIED FAIL2BAN BASH BLOCK */}
            <div className="rounded-xl border border-slate-800 bg-black/95 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-850 text-xs">
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>bash · Append config & reload Fail2ban in one block</span>
                </div>

                <button
                  onClick={() => handleCopyBlock(fail2banUnifiedBashBlock, 'fail2ban-main')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all"
                >
                  {copiedBashBlock === 'fail2ban-main' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied in 1 Block!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Entire Command Block</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-amber-300 overflow-x-auto leading-relaxed select-all">
                {fail2banUnifiedBashBlock}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: sshd_config Hardening Unified in One Block */}
        {activeTab === 'sshd' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-300">
              <span className="font-semibold text-white block mb-1">
                OpenSSH Server Hardening (/etc/ssh/sshd_config):
              </span>
              {remediation.sshdConfig.explanation}
            </div>

            {/* UNIFIED SSHD BASH BLOCK */}
            <div className="rounded-xl border border-slate-800 bg-black/95 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-850 text-xs">
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>bash · Backup, harden sshd, test syntax & reload in one block</span>
                </div>

                <button
                  onClick={() => handleCopyBlock(sshdUnifiedBashBlock, 'sshd-main')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-all"
                >
                  {copiedBashBlock === 'sshd-main' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied in 1 Block!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Entire Command Block</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed select-all">
                {sshdUnifiedBashBlock}
              </pre>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-400">
              <strong className="text-slate-200">Safety Tip:</strong> The command{' '}
              <code className="text-emerald-400 font-mono">sshd -t</code> validates the syntax of{' '}
              <code className="font-mono text-slate-300">/etc/ssh/sshd_config</code> before reloading the daemon, guaranteeing you never lock yourself out due to a typo.
            </div>
          </div>
        )}

        {/* Tab 5: Terminal Simulation */}
        {activeTab === 'terminal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Simulate executing the generated rules in a virtual Ubuntu 24.04 LTS shell:
              </span>
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
              >
                {isSimulating ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isSimulating ? 'Executing...' : 'Run Simulated Execution'}</span>
              </button>
            </div>

            <div className="bg-black border border-slate-800 rounded-lg p-4 font-mono text-xs min-h-[220px] max-h-80 overflow-y-auto space-y-1.5">
              <div className="text-slate-500">
                # LogGuard Virtual Execution Shell [Ubuntu 24.04.1 LTS - Linux 6.8.0-generic]
              </div>
              {simulatedLogs.length === 0 ? (
                <div className="text-slate-600 italic pt-6 text-center">
                  Click &quot;Run Simulated Execution&quot; above to preview rule application and firewall reload.
                </div>
              ) : (
                simulatedLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`${
                      log.startsWith('[SUCCESS]')
                        ? 'text-emerald-400 font-bold'
                        : log.startsWith('[+]')
                        ? 'text-cyan-300'
                        : log.startsWith('[$]')
                        ? 'text-white'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
