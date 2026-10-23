import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LogInputPanel } from './components/LogInputPanel';
import { RiskOverview } from './components/RiskOverview';
import { IpThreatMatrix } from './components/IpThreatMatrix';
import { RemediationPlaybook } from './components/RemediationPlaybook';
import { AuditChat } from './components/AuditChat';
import { LogViewer } from './components/LogViewer';
import { SysadminCheatsheet } from './components/SysadminCheatsheet';
import { SAMPLE_LOGS } from './data/sampleLogs';
import { AuditResult, ChatMessage, ProviderConfig } from './types/security';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import {
  ShieldAlert,
  AlertCircle,
  FileCode,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'audit' | 'chat' | 'cheatsheet'>('audit');
  const [logText, setLogText] = useState<string>(SAMPLE_LOGS[0].content);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [whitelistIp, setWhitelistIp] = useState<string>('');
  const [sshPort, setSshPort] = useState<string>('22');
  const [logCategory, setLogCategory] = useState<string>('auto');

  // Provider configuration (Google Gemini or Hugging Face API)
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(() => {
    try {
      const saved = localStorage.getItem('logguard_provider_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      provider: 'local_hf',
      hfModel: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    };
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedEvidenceLine, setSelectedEvidenceLine] = useState<string | null>(null);
  const [externalPrompt, setExternalPrompt] = useState<string | null>(null);

  // Pre-load default preset analysis on first mount so the user has immediate value
  useEffect(() => {
    // If not analyzed yet, run initial analysis on the default sample
    handleAnalyze();
  }, []);

  const handleSelectPreset = (presetId: string) => {
    const found = SAMPLE_LOGS.find((s) => s.id === presetId);
    if (found) {
      setLogText(found.content);
      setImageBase64(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!logText.trim() && !imageBase64) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logText: logText.trim(),
          imageBase64,
          imageMimeType,
          logCategory,
          whitelistIp,
          sshPort,
          provider: providerConfig.provider,
          hfModel: providerConfig.hfModel,
          hfToken: providerConfig.hfToken,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete audit');
      }

      setAuditResult(json.data);

      // Pre-seed an initial SecOps greeting in the audit chat if empty
      if (chatMessages.length === 0) {
        setChatMessages([
          {
            id: 'init-1',
            role: 'model',
            content: `I've finished analyzing your log feed. 
- **Threat Level**: ${json.data.overallRisk}
- **Vectors Detected**: ${json.data.attackVectors.join(', ')}
- **Identified Rogue Actors**: ${json.data.suspiciousIps.map((s: any) => s.ip).join(', ')}

I have prepared custom **UFW firewall rules** and a **Fail2ban jail snippet** in the Remediation tab. Ask me anything about these findings or how to harden your server!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Audit failure:', err);
      setError(err.message || 'Audit encountered an unexpected issue.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenChatWithPrompt = (prompt: string) => {
    setExternalPrompt(prompt);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasAnalysis={!!auditResult}
        onLoadPreset={(id) => {
          handleSelectPreset(id);
          setActiveTab('audit');
        }}
        providerConfig={providerConfig}
        onOpenProviderSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error notification banner */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 flex items-start gap-3 text-xs text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-rose-300">Analysis Error</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white text-xs underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View 1: Audit & Remediation Dashboard */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Multimodal Input Panel */}
            <LogInputPanel
              logText={logText}
              setLogText={setLogText}
              imageBase64={imageBase64}
              setImageBase64={setImageBase64}
              imageMimeType={imageMimeType}
              setImageMimeType={setImageMimeType}
              whitelistIp={whitelistIp}
              setWhitelistIp={setWhitelistIp}
              sshPort={sshPort}
              setSshPort={setSshPort}
              logCategory={logCategory}
              setLogCategory={setLogCategory}
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyze}
              onSelectPreset={handleSelectPreset}
              providerConfig={providerConfig}
              onOpenProviderSettings={() => setIsSettingsOpen(true)}
            />

            {/* Analysis Results View */}
            {auditResult && (
              <div className="space-y-6">
                {/* 1. Risk Overview & Threat Breakdown */}
                <RiskOverview
                  auditResult={auditResult}
                  onSelectLogLine={(line) => setSelectedEvidenceLine(line)}
                  onOpenChatWithPrompt={handleOpenChatWithPrompt}
                />

                {/* 2. Malicious Source IP Matrix */}
                {auditResult.suspiciousIps && auditResult.suspiciousIps.length > 0 && (
                  <IpThreatMatrix
                    suspiciousIps={auditResult.suspiciousIps}
                    onOpenChatWithPrompt={handleOpenChatWithPrompt}
                  />
                )}

                {/* 3. Automated Remediation Playbook */}
                {auditResult.remediation && (
                  <RemediationPlaybook
                    remediation={auditResult.remediation}
                    whitelistIp={whitelistIp}
                    sshPort={sshPort}
                  />
                )}

                {/* 4. Monospace Log Inspector & Highlighter */}
                <LogViewer
                  rawLog={logText}
                  selectedEvidenceLine={selectedEvidenceLine}
                />
              </div>
            )}
          </div>
        )}

        {/* View 2: Interactive Audit Chat */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            <AuditChat
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              logContext={logText}
              auditResult={auditResult}
              externalPrompt={externalPrompt}
              onClearExternalPrompt={() => setExternalPrompt(null)}
              providerConfig={providerConfig}
              onOpenProviderSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        )}

        {/* View 3: Sysadmin Hardening Cheatsheet */}
        {activeTab === 'cheatsheet' && (
          <div className="space-y-4">
            <SysadminCheatsheet />
          </div>
        )}
      </main>

      {/* Provider Configuration Modal */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={providerConfig}
        onChangeConfig={(newCfg) => {
          setProviderConfig(newCfg);
          try {
            localStorage.setItem('logguard_provider_config', JSON.stringify(newCfg));
          } catch {}
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">LogGuard</span>
            <span>·</span>
            <span>Intelligent Linux Log & UFW Security Auditor</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>UFW / iptables / Fail2ban / OpenSSH</span>
            <span>·</span>
            <span className="text-emerald-400/80">Production-Safe Rules</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
