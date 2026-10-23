import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquareCode,
  Send,
  RotateCcw,
  Bot,
  User,
  Copy,
  Check,
  Terminal,
  Sparkles,
  HelpCircle,
  Shield,
} from 'lucide-react';
import { ChatMessage, AuditResult, ProviderConfig } from '../types/security';

interface AuditChatProps {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  logContext: string;
  auditResult: AuditResult | null;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
  providerConfig: ProviderConfig;
  onOpenProviderSettings?: () => void;
}

export const AuditChat: React.FC<AuditChatProps> = ({
  chatMessages,
  setChatMessages,
  logContext,
  auditResult,
  externalPrompt,
  onClearExternalPrompt,
  providerConfig,
  onOpenProviderSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestedQuestions = [
    'How do I test these rules without locking myself out of SSH?',
    'Did any of these brute-force attempts succeed in authenticating?',
    'Convert the UFW rules into raw iptables / nftables commands.',
    'How do I configure Fail2ban recidive jail for 7-day bans?',
    'Should I change my default SSH port to something non-standard?',
  ];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  // Handle external drill-down prompt from other cards
  useEffect(() => {
    if (externalPrompt) {
      sendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    try {
      const summaryContext = auditResult
        ? `Audit Summary: ${auditResult.summary} | Overall Risk: ${auditResult.overallRisk} | Detected Vectors: ${auditResult.attackVectors.join(
            ', '
          )} | Malicious IPs: ${auditResult.suspiciousIps.map((s) => s.ip).join(', ')}`
        : '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: newHistory.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          logContext: logContext.slice(0, 8000),
          analysisSummary: summaryContext,
          provider: providerConfig.provider,
          hfModel: providerConfig.hfModel,
          hfToken: providerConfig.hfToken,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(data.error || 'No reply received');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `Error connecting to SecOps advisor: ${err.message || 'Please retry.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Render formatted markdown with code blocks
  const renderMessageContent = (content: string, msgIdx: number) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
        const copyKey = msgIdx * 1000 + pIdx;

        return (
          <div key={pIdx} className="my-2.5 rounded-lg overflow-hidden border border-slate-800 bg-black/90">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
              <span>{lang || 'bash / terminal'}</span>
              <button
                onClick={() => copyToClipboard(code, copyKey)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedIndex === copyKey ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed select-all">
              {code}
            </pre>
          </div>
        );
      }

      return (
        <div key={pIdx} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[680px]">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <MessageSquareCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Interactive Audit & Hardening Advisor
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Grounded in current logs</span>
              <span aria-hidden="true">·</span>
              <button
                onClick={onOpenProviderSettings}
                className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] underline"
              >
                {providerConfig.provider === 'local_hf'
                  ? 'Local HF: SmolLM2 (Free)'
                  : providerConfig.provider === 'huggingface'
                  ? `HF: ${providerConfig.hfModel.split('/').pop()}`
                  : 'Google Gemini 3.8'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenProviderSettings && (
            <button
              onClick={onOpenProviderSettings}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
            >
              Switch Model
            </button>
          )}
          {chatMessages.length > 0 && (
            <button
              onClick={() => setChatMessages([])}
              className="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Live Linux SecOps Consultation
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Ask deep-dive questions about suspicious IP origins, syntax differences between UFW and iptables, or hardening SSH against brute-force attacks.
              </p>
            </div>

            {/* Suggested Question Chips */}
            <div className="space-y-2 max-w-lg w-full pt-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">
                Suggested Inquiries:
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-left">
                {suggestedQuestions.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => sendMessage(q)}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <span className="text-slate-600 group-hover:text-cyan-400 font-mono text-[10px]">
                      &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          chatMessages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-3.5 text-xs shadow-md ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-br-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-75 font-mono">
                  <span>{msg.role === 'user' ? 'SysAdmin' : 'LogGuard Advisor'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                {renderMessageContent(msg.content, index)}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Analyzing audit context and formulating advice...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex items-end gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-2 focus-within:ring-1 focus-within:ring-cyan-500/50">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a log line, verify a UFW rule, or ask for SSH hardening advice... (Press Enter to send)"
            rows={2}
            className="flex-1 bg-transparent border-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className={`p-2 rounded-lg transition-all ${
              !inputText.trim() || isLoading
                ? 'text-slate-600 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
