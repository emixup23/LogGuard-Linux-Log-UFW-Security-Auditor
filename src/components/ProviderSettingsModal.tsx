import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Check,
  AlertCircle,
  ExternalLink,
  KeyRound,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  HardDrive,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { AIProvider, ProviderConfig } from '../types/security';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProviderConfig;
  onChangeConfig: (newConfig: ProviderConfig) => void;
}

const POPULAR_HF_MODELS = [
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct',
    name: 'Llama 3.3 70B Instruct',
    desc: 'State-of-the-art open model with deep Linux SecOps & bash reasoning.',
    recommended: true,
  },
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Qwen 2.5 Coder 32B Instruct',
    desc: 'Specialized coding & system scripting model with high syntax accuracy.',
    recommended: false,
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    name: 'DeepSeek R1 Distill Qwen 32B',
    desc: 'Advanced step-by-step reasoning for complex multi-vector intrusion traces.',
    recommended: false,
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    name: 'Mistral 7B Instruct v0.3',
    desc: 'Fast, lightweight open-weight model for rapid rule generation.',
    recommended: false,
  },
];

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(config.provider);
  const [hfModel, setHfModel] = useState<string>(config.hfModel || 'meta-llama/Llama-3.3-70B-Instruct');
  const [customModel, setCustomModel] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [hfToken, setHfToken] = useState<string>(config.hfToken || '');
  const [showToken, setShowToken] = useState<boolean>(false);

  const [hasEnvToken, setHasEnvToken] = useState<boolean>(false);
  const [localHfStatus, setLocalHfStatus] = useState<{
    status: string;
    model: string;
    device?: string;
  }>({ status: 'unloaded', model: 'HuggingFaceTB/SmolLM2-135M-Instruct' });
  const [isPreloadingLocal, setIsPreloadingLocal] = useState<boolean>(false);

  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // Load server provider info on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/providers')
        .then((res) => res.json())
        .then((data) => {
          if (data?.huggingface?.hasEnvToken) {
            setHasEnvToken(true);
          }
          if (data?.localHf) {
            setLocalHfStatus(data.localHf);
          }
        })
        .catch(() => {});

      // Sync state from props
      setSelectedProvider(config.provider);
      setHfModel(config.hfModel || 'meta-llama/Llama-3.3-70B-Instruct');
      setHfToken(config.hfToken || '');

      const isKnown = POPULAR_HF_MODELS.some((m) => m.id === config.hfModel);
      if (!isKnown && config.hfModel) {
        setIsCustom(true);
        setCustomModel(config.hfModel);
      } else {
        setIsCustom(false);
      }
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handlePreloadLocalModel = async () => {
    setIsPreloadingLocal(true);
    try {
      const res = await fetch('/api/local-hf/load', { method: 'POST' });
      const data = await res.json();
      if (data?.status) {
        setLocalHfStatus(data.status);
      }
    } catch (err) {
      console.error('Error loading local model:', err);
    } finally {
      setIsPreloadingLocal(false);
    }
  };

  const handleTestHfConnection = async () => {
    setTestStatus({ loading: true });
    try {
      const activeModel = isCustom ? customModel.trim() : hfModel;
      const res = await fetch('/api/test-hf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: hfToken.trim(),
          model: activeModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({
          loading: false,
          success: true,
          message: data.message || 'Connected successfully to Hugging Face Inference API!',
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: data.error || 'Connection failed. Verify token and model availability.',
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: err.message || 'Network error while testing connection.',
      });
    }
  };

  const handleSave = () => {
    const finalModel = isCustom ? customModel.trim() : hfModel;
    onChangeConfig({
      provider: selectedProvider,
      hfModel: finalModel || 'meta-llama/Llama-3.3-70B-Instruct',
      hfToken: hfToken.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Engine & Model Provider</h3>
              <p className="text-xs text-slate-400">
                Choose local on-device Hugging Face, Google Gemini, or cloud HF router
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Provider Selection (3 choices) */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Select Execution Mode & Provider:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Local Hugging Face (Free / On-Device) */}
              <div
                onClick={() => setSelectedProvider('local_hf')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedProvider === 'local_hf'
                    ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      Local Hugging Face
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      100% Free
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Loads and runs <strong>SmolLM2-135M ONNX</strong> on-device via Transformers.js. Zero API key, completely private.
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-emerald-400 font-mono">
                  <span>No Token Needed</span>
                  <span className="text-slate-500">Local ONNX</span>
                </div>
              </div>

              {/* Option 2: Gemini */}
              <div
                onClick={() => setSelectedProvider('gemini')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedProvider === 'gemini'
                    ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Google Gemini
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Cloud
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    High-speed native multimodal cloud inference (gemini-3.8-flash) with structured JSON.
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Multimodal OCR</span>
                  <span className="text-slate-500">Cloud API</span>
                </div>
              </div>

              {/* Option 3: Hugging Face Cloud Router */}
              <div
                onClick={() => setSelectedProvider('huggingface')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedProvider === 'huggingface'
                    ? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                      Hugging Face Cloud
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                      Router
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Query remote 70B open models (Llama 3.3 70B, Qwen 2.5 Coder) via Hugging Face Router.
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-indigo-300 font-mono">
                  <span>Large 70B Models</span>
                  <span className="text-slate-500">Requires Token</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Panel for: Local Hugging Face */}
          {selectedProvider === 'local_hf' && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    Local Model: HuggingFaceTB/SmolLM2-135M-Instruct
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Quantized 4-bit ONNX weights executed directly in-process via Hugging Face Transformers.js
                  </p>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    localHfStatus.status === 'ready'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {localHfStatus.status === 'ready' ? '● Loaded in RAM' : '○ Ready on Demand'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase">Cost & License</span>
                  <span className="text-emerald-400 font-semibold">100% Free / Apache 2.0</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase">Privacy</span>
                  <span className="text-cyan-300 font-semibold">100% Local / Zero Egress</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase">Runtime Execution</span>
                  <span className="text-slate-200 font-semibold">ONNX Web/Node CPU</span>
                </div>
              </div>

              {/* Preload button */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {localHfStatus.status === 'ready'
                    ? 'Model is loaded and ready for immediate sub-second audit & chat.'
                    : 'The model loads automatically on your first audit, or you can warm it up now:'}
                </span>

                <button
                  type="button"
                  onClick={handlePreloadLocalModel}
                  disabled={isPreloadingLocal || localHfStatus.status === 'ready'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    localHfStatus.status === 'ready'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400 cursor-default'
                      : isPreloadingLocal
                      ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer'
                  }`}
                >
                  {isPreloadingLocal ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Loading ONNX Weights...</span>
                    </>
                  ) : localHfStatus.status === 'ready' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ready in Memory</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Warm Up Model Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Configuration Panel for: Hugging Face Cloud Router */}
          {selectedProvider === 'huggingface' && (
            <div className="space-y-4 p-4 bg-slate-950 border border-slate-800 rounded-xl animate-in fade-in duration-200">
              {/* HF Model Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Select Remote Hugging Face Model:
                </label>
                <div className="space-y-2">
                  {POPULAR_HF_MODELS.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        !isCustom && hfModel === m.id
                          ? 'border-indigo-500/60 bg-indigo-950/20'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="hfModelRadio"
                        checked={!isCustom && hfModel === m.id}
                        onChange={() => {
                          setIsCustom(false);
                          setHfModel(m.id);
                        }}
                        className="mt-1 text-indigo-500 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-100">{m.name}</span>
                          {m.recommended && (
                            <span className="text-[10px] font-mono text-indigo-400">Recommended</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{m.id}</div>
                      </div>
                    </label>
                  ))}

                  {/* Custom Model Option */}
                  <label
                    className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isCustom
                        ? 'border-indigo-500/60 bg-indigo-950/20'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="hfModelRadio"
                      checked={isCustom}
                      onChange={() => setIsCustom(true)}
                      className="mt-1 text-indigo-500 focus:ring-indigo-500"
                    />
                    <div className="flex-1 space-y-1.5">
                      <span className="font-semibold text-slate-100 block">Custom Hugging Face Model ID</span>
                      {isCustom && (
                        <input
                          type="text"
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder="e.g. Qwen/Qwen2.5-Coder-7B-Instruct or mistralai/Mistral-Small-24B-Instruct-2501"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* HF API Token Field */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    Hugging Face API Token:
                  </label>
                  {hasEnvToken && (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Set in server .env
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    placeholder={hasEnvToken ? 'Using server environment token (or enter override)' : 'hf_...'}
                    className="w-full pl-3 pr-16 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    Get your free token from{' '}
                    <a
                      href="https://huggingface.co/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Hugging Face Settings <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </p>
              </div>

              {/* Test Connection Button & Status */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestHfConnection}
                  disabled={testStatus.loading || (!hfToken && !hasEnvToken)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    testStatus.loading || (!hfToken && !hasEnvToken)
                      ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer'
                  }`}
                >
                  {testStatus.loading ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Testing Inference API...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Test Hugging Face Connection</span>
                    </>
                  )}
                </button>

                {testStatus.message && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg text-[11px] flex items-start gap-2 ${
                      testStatus.success
                        ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {testStatus.success ? (
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    )}
                    <span>{testStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Provider Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
