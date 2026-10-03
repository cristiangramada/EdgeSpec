import React from 'react';
import { ShieldCheck, Github, Download, Sparkles, BookOpen } from 'lucide-react';

interface HeaderProps {
  onOpenGitHubModal: () => void;
  onDownloadZip: () => void;
  onOpenExportModal: () => void;
  hasResults: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGitHubModal,
  onDownloadZip,
  onOpenExportModal,
  hasResults,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-sky-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">EdgeSpec</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                v1.0 • Multi-Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Technical Boundary & OWASP Edge-Case Synthesis Engine
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {hasResults && (
            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
              title="Export as Markdown, Jira, Pytest, or Jest"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Export Matrix</span>
            </button>
          )}

          <button
            onClick={onDownloadZip}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            title="Download full project archive with Python CLI and Tests"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Download ZIP</span>
          </button>

          <button
            onClick={onOpenGitHubModal}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 transition active:scale-95 cursor-pointer"
          >
            <Github className="w-4 h-4" />
            <span>Push to GitHub</span>
            <Sparkles className="w-3 h-3 text-amber-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
