import React from 'react';
import {
  ShieldAlert,
  Terminal,
  MessageSquareCode,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Cpu,
  Settings,
} from 'lucide-react';
import { ProviderConfig } from '../types/security';

interface HeaderProps {
  activeTab: 'audit' | 'chat' | 'cheatsheet';
  setActiveTab: (tab: 'audit' | 'chat' | 'cheatsheet') => void;
  hasAnalysis: boolean;
  onLoadPreset: (presetId: string) => void;
  providerConfig: ProviderConfig;
  onOpenProviderSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasAnalysis,
  onLoadPreset,
  providerConfig,
  onOpenProviderSettings,
}) => {
  const isLocal = providerConfig.provider === 'local_hf';
  const isHF = providerConfig.provider === 'huggingface';
  const shortHfModel = providerConfig.hfModel.split('/').pop() || providerConfig.hfModel;

  return (
    <header className="border-b border-slate-800 bg-[#0d131f]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  LogGuard
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 text-emerald-300">
                  UFW & SecOps
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Intelligent Linux Log & UFW Security Auditor
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'audit'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audit & Remediation</span>
              {hasAnalysis && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'chat'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquareCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive Audit Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('cheatsheet')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'cheatsheet'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">UFW & Hardening Cheatsheet</span>
              <span className="sm:hidden">Cheatsheet</span>
            </button>
          </nav>

          {/* Right Controls: AI Provider Selector & Incident Presets */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            {/* AI Provider Switcher Button */}
            <button
              onClick={onOpenProviderSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isLocal
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : isHF
                  ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/60 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50'
              }`}
              title="Configure AI Provider (Local Hugging Face, Google Gemini, or HF Cloud)"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px] max-w-[140px] sm:max-w-[170px] truncate">
                {isLocal
                  ? 'Local HF: SmolLM2'
                  : isHF
                  ? `HF Cloud: ${shortHfModel}`
                  : 'Gemini 3.8'}
              </span>
              <Settings className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Quick Presets (desktop only) */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs pl-2 border-l border-slate-800">
              <span className="text-slate-500 font-medium">Quick Incident:</span>
              <button
                onClick={() => onLoadPreset('ssh-bruteforce')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
                title="Load SSH Brute Force sample"
              >
                SSH Brute
              </button>
              <button
                onClick={() => onLoadPreset('ufw-portscan')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
                title="Load UFW Port Scan sample"
              >
                Port Scan
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
