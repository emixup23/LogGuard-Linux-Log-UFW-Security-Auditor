import React, { useState, useMemo } from 'react';
import {
  Terminal,
  Search,
  Filter,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

interface LogViewerProps {
  rawLog: string;
  selectedEvidenceLine?: string | null;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  rawLog,
  selectedEvidenceLine,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [filterSeverityOnly, setFilterSeverityOnly] = useState(false);

  const lines = useMemo(() => {
    if (!rawLog) return [];
    return rawLog.split('\n');
  }, [rawLog]);

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuspiciousLine = (line: string) => {
    return (
      /failed|invalid|illegal|refused|denied|drop|block|syn|attack|error/i.test(line)
    );
  };

  const filteredLines = useMemo(() => {
    return lines
      .map((line, index) => ({ line, originalIndex: index + 1 }))
      .filter(({ line }) => {
        if (filterSeverityOnly && !isSuspiciousLine(line)) return false;
        if (!searchTerm) return true;
        return line.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [lines, searchTerm, filterSeverityOnly]);

  const highlightMatches = (text: string) => {
    if (!searchTerm) {
      // Highlight common security patterns
      return text
        .replace(
          /(Failed password|Invalid user|authentication failure|UFW BLOCK|SYN|COMMAND=)/g,
          '<span class="text-rose-400 font-bold">$1</span>'
        )
        .replace(/(Accepted publickey|Accepted password)/g, '<span class="text-emerald-400 font-bold">$1</span>')
        .replace(/SRC=([0-9.]+)/g, 'SRC=<span class="text-amber-300 font-semibold">$1</span>')
        .replace(/DPT=([0-9]+)/g, 'DPT=<span class="text-cyan-300 font-semibold">$1</span>');
    }

    const regex = new RegExp(`(${searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-amber-400/30 text-amber-200 px-0.5 rounded">$1</mark>');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Viewer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            Log Inspector & Stream Highlighter
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            ({filteredLines.length} / {lines.length} lines)
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter log lines..."
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => setFilterSeverityOnly(!filterSeverityOnly)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
              filterSeverityOnly
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Suspect Only
          </button>

          <button
            onClick={handleCopyRaw}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      <div className="bg-black/95 font-mono text-xs overflow-x-auto max-h-[440px] divide-y divide-slate-900 select-text">
        {filteredLines.length === 0 ? (
          <div className="p-8 text-center text-slate-600 font-sans">
            No matching log lines found.
          </div>
        ) : (
          filteredLines.map(({ line, originalIndex }) => {
            const isEvidence = selectedEvidenceLine && line.includes(selectedEvidenceLine);
            const isSuspicious = isSuspiciousLine(line);

            return (
              <div
                key={originalIndex}
                className={`flex items-start px-3 py-1 hover:bg-slate-900/70 transition-colors ${
                  isEvidence
                    ? 'bg-emerald-950/40 border-l-2 border-emerald-400'
                    : isSuspicious
                    ? 'hover:bg-rose-950/20'
                    : ''
                }`}
              >
                {/* Line number */}
                <span className="w-10 shrink-0 text-right pr-3 select-none text-slate-600 text-[11px]">
                  {originalIndex}
                </span>

                {/* Content */}
                <div
                  className="whitespace-pre overflow-x-auto leading-relaxed text-slate-300"
                  dangerouslySetInnerHTML={{
                    __html: highlightMatches(line),
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
