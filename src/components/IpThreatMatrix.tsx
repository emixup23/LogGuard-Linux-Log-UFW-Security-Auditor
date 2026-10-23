import React, { useState } from 'react';
import {
  ShieldX,
  Copy,
  Check,
  Search,
  ExternalLink,
  SlidersHorizontal,
  Flame,
  Globe,
  Network,
} from 'lucide-react';
import { SuspiciousIP } from '../types/security';

interface IpThreatMatrixProps {
  suspiciousIps: SuspiciousIP[];
  onAddUfwRule?: (command: string) => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

export const IpThreatMatrix: React.FC<IpThreatMatrixProps> = ({
  suspiciousIps,
  onAddUfwRule,
  onOpenChatWithPrompt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [copiedRule, setCopiedRule] = useState<string | null>(null);

  const handleCopy = (text: string, type: 'ip' | 'rule') => {
    navigator.clipboard.writeText(text);
    if (type === 'ip') {
      setCopiedIp(text);
      setTimeout(() => setCopiedIp(null), 2000);
    } else {
      setCopiedRule(text);
      setTimeout(() => setCopiedRule(null), 2000);
    }
  };

  const getSubnet24 = (ip: string) => {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return ip;
  };

  const filteredIps = suspiciousIps.filter(
    (item) =>
      item.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reputation && item.reputation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.targetedService && item.targetedService.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-rose-400" />
            Malicious & Suspicious Source IP Matrix ({suspiciousIps.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Extract and block unauthorized reconnaissance and brute-force actors
          </p>
        </div>

        {/* Actions & Filter Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {suspiciousIps.length > 0 && (
            <button
              onClick={() => {
                const oneBlock = [
                  '# Block all detected rogue IPs in one block',
                  ...suspiciousIps.map(
                    (item) => `sudo ufw insert 1 deny from ${item.ip} to any comment 'LogGuard: Auto-blocked'`
                  ),
                  'sudo ufw reload',
                ].join('\n');
                handleCopy(oneBlock, 'rule');
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-medium transition-colors"
            >
              {copiedRule?.startsWith('# Block all') ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied All in 1 Block!</span>
                </>
              ) : (
                <>
                  <ShieldX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Block All ({suspiciousIps.length}) in 1 Block</span>
                </>
              )}
            </button>
          )}

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search IP, vector..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* IP Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-4">Suspicious IP Address</th>
              <th className="py-2.5 px-4">Attempts</th>
              <th className="py-2.5 px-4">Risk Score</th>
              <th className="py-2.5 px-4">Behavior / Threat Category</th>
              <th className="py-2.5 px-4 text-right">Quick Remediation Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
            {filteredIps.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                  No suspicious IPs matched the search query.
                </td>
              </tr>
            ) : (
              filteredIps.map((item) => {
                const subnet = getSubnet24(item.ip);
                const ufwCommand = `sudo ufw insert 1 deny from ${item.ip} to any comment 'LogGuard: Auto-blocked'`;
                const ufwSubnetCommand = `sudo ufw insert 1 deny from ${subnet} to any comment 'LogGuard: Block /24 Subnet'`;

                return (
                  <tr
                    key={item.ip}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* IP and Copy */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white tracking-wide">
                          {item.ip}
                        </span>
                        <button
                          onClick={() => handleCopy(item.ip, 'ip')}
                          className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Copy IP"
                        >
                          {copiedIp === item.ip ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {item.firstSeen && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Seen: {item.firstSeen}
                        </div>
                      )}
                    </td>

                    {/* Attempt count */}
                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-semibold">{item.attemptCount}</span>
                      <span className="text-[10px] text-slate-500 ml-1">events</span>
                    </td>

                    {/* Risk score progress */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.riskScore >= 80
                                ? 'bg-rose-500'
                                : item.riskScore >= 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(item.riskScore, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`font-semibold text-xs ${
                            item.riskScore >= 80
                              ? 'text-rose-400'
                              : item.riskScore >= 50
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {item.riskScore}/100
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 font-sans">
                      <div className="text-slate-200 text-xs">
                        {item.reputation || 'Aggressive access attempts'}
                      </div>
                      {item.targetedService && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Target: {item.targetedService}
                        </div>
                      )}
                    </td>

                    {/* Quick actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleCopy(ufwCommand, 'rule')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-[11px] text-rose-300 transition-colors"
                          title="Copy: sudo ufw insert 1 deny from <IP>"
                        >
                          {copiedRule === ufwCommand ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <ShieldX className="w-3 h-3 text-rose-400" />
                              <span>Deny IP</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCopy(ufwSubnetCommand, 'rule')}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                          title={`Block Entire /24 Subnet: ${subnet}`}
                        >
                          <span>/24</span>
                        </button>

                        <button
                          onClick={() => {
                            if (onOpenChatWithPrompt) {
                              onOpenChatWithPrompt(
                                `What is the risk profile of IP ${item.ip}? Did it execute any successful logins or exploit payloads in these logs?`
                              );
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors"
                          title="Ask AI about this IP"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
