import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Copy,
  Check,
  Shield,
  FileCode,
  Flame,
  Search,
  ExternalLink,
} from 'lucide-react';

interface CheatItem {
  command: string;
  description: string;
  category: 'ufw' | 'ssh' | 'fail2ban' | 'logs';
}

const CHEAT_ITEMS: CheatItem[] = [
  // UFW
  {
    category: 'ufw',
    command: 'sudo ufw status numbered',
    description: 'List all firewall rules with line indices (required before deleting specific rules).',
  },
  {
    category: 'ufw',
    command: 'sudo ufw insert 1 deny from 198.51.100.5 to any comment "LogGuard: Ban"',
    description: 'Insert highest priority block rule at line 1 (prevents allow-rules from matching first).',
  },
  {
    category: 'ufw',
    command: 'sudo ufw limit 22/tcp comment "Rate-limit SSH against brute force"',
    description: 'Enables built-in rate-limiting (denies connections from an IP that attempts 6+ connections in 30s).',
  },
  {
    category: 'ufw',
    command: 'sudo ufw delete 3',
    description: 'Delete rule number 3 based on index from ufw status numbered.',
  },
  {
    category: 'ufw',
    command: 'sudo ufw reload',
    description: 'Reload firewall rules without severing active connections.',
  },

  // SSH Hardening
  {
    category: 'ssh',
    command: 'sudo sshd -t',
    description: 'Test SSH daemon configuration syntax without reloading (crucial to prevent lockout).',
  },
  {
    category: 'ssh',
    command: 'sudo systemctl reload sshd',
    description: 'Gracefully reload OpenSSH server configuration without dropping active sessions.',
  },
  {
    category: 'ssh',
    command: 'echo "PasswordAuthentication no" | sudo tee /etc/ssh/sshd_config.d/50-keys-only.conf',
    description: 'Enforce public-key authentication only via modern Ubuntu sshd_config.d drop-in file.',
  },
  {
    category: 'ssh',
    command: 'echo "PermitRootLogin prohibit-password" | sudo tee -a /etc/ssh/sshd_config.d/50-keys-only.conf',
    description: 'Disable password authentication for the root user while allowing authorized SSH keys.',
  },

  // Fail2ban
  {
    category: 'fail2ban',
    command: 'sudo fail2ban-client status sshd',
    description: 'Inspect currently jailed IPs, total banned count, and active filter regex for SSH.',
  },
  {
    category: 'fail2ban',
    command: 'sudo fail2ban-client set sshd unbanip 192.168.1.50',
    description: 'Manually unban an mistakenly blocked administrator IP from the sshd jail.',
  },
  {
    category: 'fail2ban',
    command: 'sudo fail2ban-client banned',
    description: 'List all IPs currently banned across every active jail.',
  },

  // Log Analysis CLI
  {
    category: 'logs',
    command: 'journalctl -u ssh --since "2 hours ago" | grep "Failed password"',
    description: 'Query systemd journal for recent failed password attempts with timestamps.',
  },
  {
    category: 'logs',
    command: "grep -E 'Failed password|Invalid user' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head -n 20",
    description: 'Extract top 20 attacker IPs attempting failed SSH logins in /var/log/auth.log.',
  },
  {
    category: 'logs',
    command: "grep 'UFW BLOCK' /var/log/syslog | awk '{for(i=1;i<=NF;i++)if($i~/^SRC=/)print $i}' | sort | uniq -c | sort -nr",
    description: 'Count dropped packet frequency grouped by source IP address.',
  },
  {
    category: 'logs',
    command: 'sudo ss -tulpn | grep -E ":(22|80|443|3306|5432|6379)"',
    description: 'Audit listening TCP/UDP ports and daemon PID bindings.',
  },
];

export const SysadminCheatsheet: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'ufw' | 'ssh' | 'fail2ban' | 'logs'>('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filtered = CHEAT_ITEMS.filter((item) =>
    activeCategory === 'all' ? true : item.category === activeCategory
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Linux SysAdmin SecOps & Hardening Cheatsheet
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ready-to-run terminal commands for UFW, Fail2ban, SSHD, and Linux audit logs
          </p>
        </div>

        {/* Category switcher & One-Block Copy */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {(['all', 'ufw', 'ssh', 'fail2ban', 'logs'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                  activeCategory === cat
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'All Commands' : cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const oneBlock = [
                `# Linux SecOps Cheatsheet (${activeCategory.toUpperCase()}) - Run as one block`,
                ...filtered.map((item) => `${item.command} # ${item.description}`),
              ].join('\n');
              handleCopy(oneBlock);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors"
          >
            {copiedCmd?.startsWith('# Linux SecOps') ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied All in 1 Block!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All in 1 Block</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Commands List */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item, index) => (
          <div
            key={index}
            className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-lg flex flex-col justify-between gap-2.5 group transition-all"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                <span className="uppercase text-amber-400/80 font-bold">{item.category}</span>
                <span className="text-[10px] text-slate-600">Linux CLI</span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 bg-black/80 p-2 rounded border border-slate-850">
              <code className="text-xs font-mono text-emerald-400 truncate select-all">
                {item.command}
              </code>
              <button
                onClick={() => handleCopy(item.command)}
                className="shrink-0 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Copy Command"
              >
                {copiedCmd === item.command ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
