import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SpecEditor } from './components/SpecEditor';
import { ResultsView } from './components/ResultsView';
import { ExportModal } from './components/ExportModal';
import { GitHubModal } from './components/GitHubModal';
import { Category, AnalysisReport, SpecFormat } from './types';
import { PRESET_OPTIONS } from './data/presets';
import { detectSpecFormat } from './engine/parser';
import { runEdgeSpecAnalysis } from './engine';
import { downloadFullRepoZip } from './utils/zipRepo';
import { Github, Sparkles, Terminal, CheckCircle2 } from 'lucide-react';

export default function App() {
  const initialPreset = PRESET_OPTIONS[0];

  const [specText, setSpecText] = useState(initialPreset.text);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPreset.id);
  const [enabledCategories, setEnabledCategories] = useState<Category[]>([
    'boundary',
    'type_fuzz',
    'security',
    'concurrency',
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  // Modals
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Initial load analysis
  useEffect(() => {
    handleRunAnalysis(initialPreset.text, enabledCategories);
  }, []);

  const detectedFormat: SpecFormat = detectSpecFormat(specText);

  const handleRunAnalysis = (textToAnalyze: string, categories: Category[]) => {
    if (!textToAnalyze.trim() || categories.length === 0) return;
    setIsAnalyzing(true);
    // Instant client-side deterministic analysis
    try {
      const generatedReport = runEdgeSpecAnalysis(textToAnalyze, categories);
      setReport(generatedReport);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_OPTIONS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(preset.id);
      setSpecText(preset.text);
      handleRunAnalysis(preset.text, enabledCategories);
    }
  };

  const handleToggleCategory = (category: Category) => {
    const nextCategories = enabledCategories.includes(category)
      ? enabledCategories.filter((c) => c !== category)
      : [...enabledCategories, category];

    setEnabledCategories(nextCategories);
    if (specText.trim() && nextCategories.length > 0) {
      handleRunAnalysis(specText, nextCategories);
    }
  };

  const handleDownloadZip = async () => {
    await downloadFullRepoZip();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onDownloadZip={handleDownloadZip}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        hasResults={Boolean(report && report.testCases.length > 0)}
      />

      {/* GitHub Callout Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border-b border-indigo-500/20 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-indigo-200">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              <strong>Resume-Ready Project:</strong> Full Python CLI, 4 heuristic engines, unit tests, and GitHub Actions CI workflow are built in.
            </span>
          </div>
          <button
            onClick={() => setIsGitHubModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-medium transition cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>See Step-by-Step GitHub Push Guide</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Spec Editor */}
        <SpecEditor
          specText={specText}
          onChangeSpecText={(val) => {
            setSpecText(val);
            setSelectedPresetId(null);
          }}
          detectedFormat={detectedFormat}
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
          enabledCategories={enabledCategories}
          onToggleCategory={handleToggleCategory}
          onAnalyze={() => handleRunAnalysis(specText, enabledCategories)}
          isAnalyzing={isAnalyzing}
          onClear={() => {
            setSpecText('');
            setSelectedPresetId(null);
            setReport(null);
          }}
        />

        {/* Results View */}
        {report && (
          <ResultsView
            report={report}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            EdgeSpec • Technical Edge-Case Synthesis Engine • Licensed under MIT
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              className="hover:text-indigo-400 transition cursor-pointer"
            >
              GitHub Setup
            </button>
            <button
              onClick={handleDownloadZip}
              className="hover:text-indigo-400 transition cursor-pointer"
            >
              Download Repo (.zip)
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="hover:text-indigo-400 transition cursor-pointer"
            >
              Export Code Stubs
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        report={report}
      />

      <GitHubModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </div>
  );
}
