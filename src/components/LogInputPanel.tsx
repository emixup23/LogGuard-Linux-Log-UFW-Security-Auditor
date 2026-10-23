import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Play,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  X,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { SAMPLE_LOGS } from '../data/sampleLogs';
import { ProviderConfig } from '../types/security';

interface LogInputPanelProps {
  logText: string;
  setLogText: (val: string) => void;
  imageBase64: string | null;
  setImageBase64: (val: string | null) => void;
  imageMimeType: string;
  setImageMimeType: (val: string) => void;
  whitelistIp: string;
  setWhitelistIp: (val: string) => void;
  sshPort: string;
  setSshPort: (val: string) => void;
  logCategory: string;
  setLogCategory: (val: string) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onSelectPreset: (id: string) => void;
  providerConfig: ProviderConfig;
  onOpenProviderSettings: () => void;
}

export const LogInputPanel: React.FC<LogInputPanelProps> = ({
  logText,
  setLogText,
  imageBase64,
  setImageBase64,
  imageMimeType,
  setImageMimeType,
  whitelistIp,
  setWhitelistIp,
  sshPort,
  setSshPort,
  logCategory,
  setLogCategory,
  isAnalyzing,
  onAnalyze,
  onSelectPreset,
  providerConfig,
  onOpenProviderSettings,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Listen for paste event to capture clipboard screenshot directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setImageBase64(event.target.result as string);
                setImageMimeType(blob.type || 'image/png');
                setInputMode('image');
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setImageBase64, setImageMimeType]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageBase64(e.target?.result as string);
        setImageMimeType(file.type || 'image/png');
        setInputMode('image');
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogText(e.target?.result as string);
        setInputMode('text');
      };
      reader.readAsText(file);
    }
  };

  const handleClearAll = () => {
    setLogText('');
    setImageBase64(null);
  };

  const lineCount = logText ? logText.trim().split('\n').length : 0;
  const charCount = logText.length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Top Bar / Presets Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              Multimodal Log Ingestion
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste raw log streams or upload screenshots of terminal windows / SIEM dashboards
            </p>
          </div>

          {/* Input Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                inputMode === 'text'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Raw Text Log
              {logText && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
            <button
              onClick={() => setInputMode('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                inputMode === 'image'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Terminal Screenshot
              {imageBase64 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span className="font-medium text-slate-300">Test Incident Scenarios:</span>
            <span>(Click to load authentic Linux incident logs)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SAMPLE_LOGS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => onSelectPreset(sample.id)}
                className="text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-400">{sample.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-emerald-950/60 group-hover:text-emerald-300 transition-colors">
                    {sample.badge}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                  {sample.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {sample.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Input Area */}
      <div className="p-4 sm:p-5 space-y-4">
        {inputMode === 'text' ? (
          <div>
            <div className="relative">
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder={`Paste your Linux logs here (e.g., from /var/log/auth.log, syslog, or /var/log/ufw.log)...
Example:
Oct 22 04:12:02 server sshd[14201]: Failed password for invalid user admin from 185.220.101.5 port 42812 ssh2
Oct 22 05:01:14 kernel: [UFW BLOCK] IN=eth0 SRC=198.51.100.88 DST=192.168.1.10 PROTO=TCP DPT=22 SYN`}
                className="w-full h-56 p-3.5 bg-slate-950/90 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-y leading-relaxed"
                spellCheck={false}
              />

              {/* Status and Character Counter */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                <div className="flex items-center gap-3">
                  <span>Lines: <strong className="text-slate-300 font-mono">{lineCount}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Characters: <strong className="text-slate-300 font-mono">{charCount.toLocaleString()}</strong></span>
                  {lineCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready for analysis
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) processUploadedFile(e.target.files[0]);
                    }}
                    accept=".log,.txt,.audit,.csv"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload .log file
                  </button>
                  {logText && (
                    <button
                      onClick={handleClearAll}
                      className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Screenshot upload zone */}
            {!imageBase64 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => imageInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) processUploadedFile(e.target.files[0]);
                  }}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-cyan-400 mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium text-slate-200">
                  Drop a terminal or SIEM alert screenshot here, or click to browse
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Tip: You can also copy a screenshot directly from your clipboard and press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                    Ctrl+V
                  </kbd>{' '}
                  / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Cmd+V</kbd> anywhere on this screen!
                </p>
              </div>
            ) : (
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    Attached Screenshot ({imageMimeType})
                  </div>
                  <button
                    onClick={() => setImageBase64(null)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-800/80 bg-black/60 flex items-center justify-center p-2">
                  <img
                    src={imageBase64}
                    alt="Uploaded log snippet"
                    className="max-h-64 object-contain rounded"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Gemini will transcribe the terminal text, classify threat patterns, and construct UFW rules.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SysAdmin Environment Controls & Safeguards */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Production Safety Guardrails & Context
            </span>
            <span className="text-[11px] text-slate-500">
              Guarantees generated rules won&apos;t lock out your admin access
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Admin Whitelist IP / Subnet (Safe from blocking):
              </label>
              <input
                type="text"
                value={whitelistIp}
                onChange={(e) => setWhitelistIp(e.target.value)}
                placeholder="e.g. 203.0.113.50/32 or 10.0.0.0/24"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Active SSH Port:
              </label>
              <input
                type="text"
                value={sshPort}
                onChange={(e) => setSshPort(e.target.value)}
                placeholder="22"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Log Source Type Hint:
              </label>
              <select
                value={logCategory}
                onChange={(e) => setLogCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="auto">Auto-Detect Format</option>
                <option value="auth.log">/var/log/auth.log (OpenSSH / PAM)</option>
                <option value="ufw.log">/var/log/ufw.log (Kernel Netfilter)</option>
                <option value="syslog">/var/log/syslog (System Events)</option>
                <option value="journalctl">journalctl -xe / systemd logs</option>
                <option value="web-access">Nginx / Apache Access & Security</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Button & Active Model Indicator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                providerConfig.provider === 'local_hf'
                  ? 'bg-emerald-400 animate-pulse'
                  : providerConfig.provider === 'huggingface'
                  ? 'bg-indigo-400'
                  : 'bg-cyan-400'
              }`}
            />
            <span>
              Provider:{' '}
              <strong className="text-slate-200">
                {providerConfig.provider === 'local_hf'
                  ? 'Local Hugging Face (100% Free · On-Device)'
                  : providerConfig.provider === 'huggingface'
                  ? 'Hugging Face Cloud Router'
                  : 'Google Gemini'}
              </strong>{' '}
              <span className="text-slate-500 font-mono text-[11px]">
                ({providerConfig.provider === 'local_hf'
                  ? 'SmolLM2-135M ONNX'
                  : providerConfig.provider === 'huggingface'
                  ? providerConfig.hfModel.split('/').pop()
                  : 'gemini-3.8-flash'})
              </span>
            </span>
            <button
              onClick={onOpenProviderSettings}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-1 cursor-pointer"
            >
              Change
            </button>
          </div>

          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || (!logText.trim() && !imageBase64)}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              isAnalyzing || (!logText.trim() && !imageBase64)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-slate-400" />
                <span>
                  {providerConfig.provider === 'local_hf'
                    ? 'Running Local Hugging Face Audit...'
                    : providerConfig.provider === 'huggingface'
                    ? 'Querying Hugging Face & Generating Rules...'
                    : 'Auditing Logs & Synthesizing Rules...'}
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {providerConfig.provider === 'local_hf'
                    ? 'Run Local Free HF Audit & Generate UFW Rules'
                    : 'Run Security Audit & Generate UFW Rules'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
