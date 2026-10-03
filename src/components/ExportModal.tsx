import React, { useState } from 'react';
import { X, Copy, Download, CheckCircle2, FileCode, Terminal } from 'lucide-react';
import { AnalysisReport } from '../types';
import {
  exportToMarkdown,
  exportToJira,
  exportToPytest,
  exportToJest,
  exportToCurl,
} from '../engine/exporters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AnalysisReport | null;
}

type ExportTab = 'markdown' | 'jira' | 'pytest' | 'jest' | 'curl' | 'json';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, report }) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('markdown');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !report) return null;

  const getContent = (): { text: string; filename: string; mime: string } => {
    switch (activeTab) {
      case 'markdown':
        return {
          text: exportToMarkdown(report),
          filename: 'edgespec_test_matrix.md',
          mime: 'text/markdown',
        };
      case 'jira':
        return {
          text: exportToJira(report),
          filename: 'edgespec_jira_tickets.txt',
          mime: 'text/plain',
        };
      case 'pytest':
        return {
          text: exportToPytest(report),
          filename: 'test_edgespec_generated.py',
          mime: 'text/x-python',
        };
      case 'jest':
        return {
          text: exportToJest(report),
          filename: 'edgespec.test.ts',
          mime: 'text/typescript',
        };
      case 'curl':
        return {
          text: exportToCurl(report),
          filename: 'edgespec_curl_harness.sh',
          mime: 'application/x-sh',
        };
      case 'json':
        return {
          text: JSON.stringify(report, null, 2),
          filename: 'edgespec_report.json',
          mime: 'application/json',
        };
    }
  };

  const { text, filename, mime } = getContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">Export Test Suite Matrix</h2>
              <p className="text-xs text-slate-400">
                Generate ready-to-run automation code, Jira tables, or QA checklists.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-800 flex space-x-2 overflow-x-auto bg-slate-950/40">
          {[
            { id: 'markdown', label: 'Markdown Table' },
            { id: 'jira', label: 'Jira Wiki' },
            { id: 'pytest', label: 'Pytest (Python)' },
            { id: 'jest', label: 'Jest / Vitest (TS)' },
            { id: 'curl', label: 'cURL Harness' },
            { id: 'json', label: 'Raw JSON' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ExportTab);
                setIsCopied(false);
              }}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="p-4 sm:px-6 flex-1 overflow-y-auto bg-slate-950/80">
          <pre className="text-xs font-mono text-slate-300 p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto select-all leading-relaxed whitespace-pre-wrap">
            {text}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {filename} • {text.split('\n').length} lines
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 cursor-pointer ${
                isCopied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-indigo-500/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
