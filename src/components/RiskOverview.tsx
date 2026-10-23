import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Terminal,
  ExternalLink,
  Target,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import { AuditResult, Threat, ThreatSeverity } from '../types/security';

interface RiskOverviewProps {
  auditResult: AuditResult;
  onSelectLogLine?: (line: string) => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

export const RiskOverview: React.FC<RiskOverviewProps> = ({
  auditResult,
  onSelectLogLine,
  onOpenChatWithPrompt,
}) => {
  const [expandedThreats, setExpandedThreats] = useState<Record<string, boolean>>({
    '0': true, // Expand first threat by default
  });

  const toggleThreat = (id: string) => {
    setExpandedThreats((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getSeverityStyle = (severity: ThreatSeverity) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return {
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/40',
          bgColor: 'bg-rose-950/20',
          indicatorColor: 'bg-rose-500',
          icon: AlertOctagon,
        };
      case 'HIGH':
        return {
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/40',
          bgColor: 'bg-amber-950/20',
          indicatorColor: 'bg-amber-500',
          icon: AlertTriangle,
        };
      case 'MEDIUM':
        return {
          textColor: 'text-yellow-400',
          borderColor: 'border-yellow-500/40',
          bgColor: 'bg-yellow-950/20',
          indicatorColor: 'bg-yellow-500',
          icon: AlertTriangle,
        };
      default:
        return {
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/40',
          bgColor: 'bg-emerald-950/20',
          indicatorColor: 'bg-emerald-500',
          icon: Info,
        };
    }
  };

  const overallStyle = getSeverityStyle(auditResult.overallRisk);
  const OverallIcon = overallStyle.icon;

  const downloadIncidentReport = () => {
    const markdown = `# LogGuard Security Incident Report
Generated: ${new Date().toISOString()}

## Executive Posture
- Overall Risk: ${auditResult.overallRisk}
- Detected Log Format: ${auditResult.logTypeDetected}
- Total Log Lines Evaluated: ${auditResult.totalEventsAnalyzed}
- Identified Attack Vectors: ${auditResult.attackVectors.join(', ')}

### Summary
${auditResult.summary}

## Identified Threats (${auditResult.threats.length})
${auditResult.threats
  .map(
    (t, idx) => `
### ${idx + 1}. [${t.severity}] ${t.title}
- Vector: ${t.attackVector}
- Frequency: ${t.frequency || 'N/A'}
- Source IPs: ${t.sourceIps.join(', ')}
- Description: ${t.description}
- Recommended Action: ${t.recommendedAction}
- Evidence:
\`\`\`
${t.evidenceLogLines.join('\n')}
\`\`\`
`
  )
  .join('\n')}

## Suspicious Source IPs (${auditResult.suspiciousIps.length})
${auditResult.suspiciousIps
  .map(
    (ip) =>
      `- IP: ${ip.ip} | Attempts: ${ip.attemptCount} | Risk: ${ip.riskScore}/100 | Action: ${ip.suggestedAction} | Reputation: ${ip.reputation || 'N/A'}`
  )
  .join('\n')}

## Automated UFW Remediation Commands
\`\`\`bash
${auditResult.remediation.ufwRules.map((r) => r.command).join('\n')}
\`\`\`

## Fail2ban Configuration Snippet
\`\`\`ini
${auditResult.remediation.fail2banConfig.jailLocalSnippet}
\`\`\`

## Complete Hardening Bash Script
\`\`\`bash
${auditResult.remediation.bashScript}
\`\`\`
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logguard-incident-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Executive Risk Posture Card */}
      <div
        className={`rounded-xl border ${overallStyle.borderColor} ${overallStyle.bgColor} p-4 sm:p-6 backdrop-blur-sm relative overflow-hidden`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-lg border ${overallStyle.borderColor} bg-slate-900/80 text-white shrink-0`}
            >
              <OverallIcon className={`w-6 h-6 ${overallStyle.textColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-mono font-medium">
                  Overall Risk Level
                </span>
                <span className="text-slate-600">·</span>
                <span className={`text-xs font-mono font-bold ${overallStyle.textColor}`}>
                  {auditResult.overallRisk} SEVERITY
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Linux Threat Assessment & Audit Findings
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {auditResult.summary}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>{auditResult.totalEventsAnalyzed} events parsed</span>
              <span aria-hidden="true">·</span>
              <span>{auditResult.threats.length} threat patterns</span>
              <span aria-hidden="true">·</span>
              <span className="text-rose-400 font-semibold">{auditResult.suspiciousIps.length} malicious IPs</span>
            </div>

            <button
              onClick={downloadIncidentReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Incident Report (.md)</span>
            </button>
          </div>
        </div>

        {/* Clean Unboxed Attack Vectors (Adheres to zero-pill rule) */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-400 font-medium">Attack Vectors Detected:</span>
          {auditResult.attackVectors.map((vector, index) => (
            <React.Fragment key={vector}>
              {index > 0 && <span className="text-slate-600" aria-hidden="true">/</span>}
              <span className="text-slate-200 font-mono">{vector}</span>
            </React.Fragment>
          ))}
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400 font-mono">Source Type: {auditResult.logTypeDetected}</span>
        </div>
      </div>

      {/* Threat List Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Detected Threat Vectors & Incidents ({auditResult.threats.length})
          </h3>
          <span className="text-xs text-slate-400">
            Click threat to review evidence log lines
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {auditResult.threats.map((threat, index) => {
            const style = getSeverityStyle(threat.severity);
            const isExpanded = expandedThreats[threat.id || index.toString()];

            return (
              <div
                key={threat.id || index}
                className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden transition-all hover:border-slate-700/80"
              >
                {/* Header */}
                <div
                  onClick={() => toggleThreat(threat.id || index.toString())}
                  className="p-4 cursor-pointer flex items-start justify-between gap-3 select-none hover:bg-slate-850"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.indicatorColor}`}
                    />
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-mono font-bold ${style.textColor}`}>
                          {threat.severity}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-slate-300 font-mono">{threat.attackVector}</span>
                        {threat.frequency && (
                          <>
                            <span className="text-slate-600" aria-hidden="true">·</span>
                            <span className="text-slate-400 flex items-center gap-1 font-mono">
                              <Activity className="w-3 h-3 text-slate-500" />
                              {threat.frequency}
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white mt-0.5">
                        {threat.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {threat.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenChatWithPrompt) {
                          onOpenChatWithPrompt(
                            `Can you explain how threat "${threat.title}" works in Linux, and what specific steps are needed to permanently prevent it?`
                          );
                        }
                      }}
                      className="hidden sm:flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-950/30 border border-cyan-800/40 hover:bg-cyan-950/60 transition-colors"
                      title="Drill down in Audit Chat"
                    >
                      <span>Drill Down</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/60 space-y-3">
                    {/* Metadata specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">
                          Source IPs
                        </span>
                        <span className="text-slate-200 font-mono font-medium truncate block">
                          {threat.sourceIps?.length > 0 ? threat.sourceIps.join(', ') : 'None extracted'}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">
                          Targeted Ports / Services
                        </span>
                        <span className="text-slate-200 font-mono font-medium truncate block">
                          {threat.targetedPorts && threat.targetedPorts.length > 0
                            ? threat.targetedPorts.join(', ')
                            : 'Port 22 (SSH)'}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">
                          Targeted User Accounts
                        </span>
                        <span className="text-slate-200 font-mono font-medium truncate block">
                          {threat.targetedUsers && threat.targetedUsers.length > 0
                            ? threat.targetedUsers.join(', ')
                            : 'root, admin, guest'}
                        </span>
                      </div>
                    </div>

                    {/* Recommended remediation */}
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs">
                      <span className="font-semibold text-emerald-400 block mb-0.5">
                        Recommended SysAdmin Action:
                      </span>
                      <span className="text-slate-200">{threat.recommendedAction}</span>
                    </div>

                    {/* Evidence log lines with clickable highlight */}
                    {threat.evidenceLogLines && threat.evidenceLogLines.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                          <span className="font-medium flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-slate-400" />
                            Log Evidence Snippet ({threat.evidenceLogLines.length} lines):
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Click line to locate in Log Viewer
                          </span>
                        </div>
                        <div className="bg-black/80 rounded-lg p-2.5 border border-slate-800 font-mono text-[11px] space-y-1 max-h-36 overflow-auto">
                          {threat.evidenceLogLines.map((line, lIdx) => (
                            <div
                              key={lIdx}
                              onClick={() => onSelectLogLine && onSelectLogLine(line)}
                              className="text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80 px-1.5 py-0.5 rounded cursor-pointer transition-colors truncate"
                              title="Click to view in log viewer"
                            >
                              <span className="text-slate-600 select-none mr-2">
                                {lIdx + 1}
                              </span>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
