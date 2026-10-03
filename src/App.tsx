import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SpecEditor } from './components/SpecEditor';
import { ResultsView } from './components/ResultsView';
import { ExportModal } from './components/ExportModal';
import { Category, AnalysisReport, SpecFormat } from './types';
import { PRESET_OPTIONS } from './data/presets';
import { detectSpecFormat } from './engine/parser';
import { runEdgeSpecAnalysis } from './engine';

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        onOpenExportModal={() => setIsExportModalOpen(true)}
        hasResults={Boolean(report && report.testCases.length > 0)}
      />

      <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-300">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>
            Deterministic, rule-based analysis runs locally in your browser. Specifications are not uploaded.
          </span>
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
            EdgeSpec • Rule-based test-design assistant • MIT License
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="hover:text-indigo-400 transition cursor-pointer"
            >
              Export test artifacts
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
    </div>
  );
}
