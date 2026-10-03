import React from 'react';
import {
  Sparkles,
  FileCode,
  FileText,
  Sliders,
  CheckCircle2,
  Trash2,
  Cpu,
  Layers,
  ShieldAlert,
  Repeat,
} from 'lucide-react';
import { Category, SpecFormat } from '../types';
import { PRESET_OPTIONS } from '../data/presets';

interface SpecEditorProps {
  specText: string;
  onChangeSpecText: (text: string) => void;
  detectedFormat: SpecFormat;
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  enabledCategories: Category[];
  onToggleCategory: (category: Category) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onClear: () => void;
}

const CATEGORY_CONFIG: {
  key: Category;
  label: string;
  icon: React.ElementType;
  color: string;
  bgActive: string;
  borderActive: string;
}[] = [
  {
    key: 'boundary',
    label: 'Boundary & Fenceposts',
    icon: Sliders,
    color: 'text-amber-400',
    bgActive: 'bg-amber-950/40 text-amber-200',
    borderActive: 'border-amber-500/50',
  },
  {
    key: 'type_fuzz',
    label: 'Type Fuzzing & Formats',
    icon: Layers,
    color: 'text-sky-400',
    bgActive: 'bg-sky-950/40 text-sky-200',
    borderActive: 'border-sky-500/50',
  },
  {
    key: 'security',
    label: 'OWASP Top 10 Security',
    icon: ShieldAlert,
    color: 'text-rose-400',
    bgActive: 'bg-rose-950/40 text-rose-200',
    borderActive: 'border-rose-500/50',
  },
  {
    key: 'concurrency',
    label: 'Concurrency & Race',
    icon: Repeat,
    color: 'text-purple-400',
    bgActive: 'bg-purple-950/40 text-purple-200',
    borderActive: 'border-purple-500/50',
  },
];

export const SpecEditor: React.FC<SpecEditorProps> = ({
  specText,
  onChangeSpecText,
  detectedFormat,
  selectedPresetId,
  onSelectPreset,
  enabledCategories,
  onToggleCategory,
  onAnalyze,
  isAnalyzing,
  onClear,
}) => {
  const getFormatBadge = () => {
    switch (detectedFormat) {
      case 'json_schema':
        return { label: 'JSON Schema (draft-07)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'api_spec':
        return { label: 'REST API Endpoint', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
      case 'gherkin':
        return { label: 'Gherkin BDD Scenario', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      default:
        return { label: 'Natural Language User Story', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
    }
  };

  const badge = getFormatBadge();

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col space-y-4">
      {/* Top Bar: Presets & Format Detection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
              Specification Input
            </h2>
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-500" />
            Presets:
          </span>
          {PRESET_OPTIONS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={preset.description}
              >
                {preset.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Textarea Editor */}
      <div className="relative">
        <textarea
          value={specText}
          onChange={(e) => onChangeSpecText(e.target.value)}
          placeholder="Paste your PRD user story, BDD acceptance criteria, OpenAPI endpoint, or JSON schema here..."
          rows={11}
          className="w-full bg-slate-950/80 rounded-xl border border-slate-800/80 p-3.5 text-xs sm:text-sm font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition resize-y leading-relaxed shadow-inner"
        />
        <div className="absolute right-3 bottom-3 flex items-center space-x-2 bg-slate-900/90 px-2 py-1 rounded-md border border-slate-800 text-[11px] text-slate-400 font-mono">
          <span>{specText.length} chars</span>
          <span>•</span>
          <span>{specText.split('\n').length} lines</span>
        </div>
      </div>

      {/* Engine Category Toggles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Verification Engines
          </span>
          <span className="text-[11px] text-slate-400">
            {enabledCategories.length} of 4 selected
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORY_CONFIG.map(({ key, label, icon: Icon, color, bgActive, borderActive }) => {
            const isEnabled = enabledCategories.includes(key);
            return (
              <button
                key={key}
                onClick={() => onToggleCategory(key)}
                className={`p-2 rounded-xl border text-left transition flex items-center space-x-2 cursor-pointer ${
                  isEnabled
                    ? `${bgActive} ${borderActive}`
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <div className={`p-1 rounded-lg ${isEnabled ? 'bg-slate-900' : 'bg-slate-900/50'}`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div className="truncate text-xs font-medium">{label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <button
          onClick={onClear}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Editor</span>
        </button>

        <button
          onClick={onAnalyze}
          disabled={!specText.trim() || isAnalyzing || enabledCategories.length === 0}
          className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-500/25 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          <Cpu className="w-4 h-4" />
          <span>{isAnalyzing ? 'Analyzing Spec...' : 'Synthesize Edge Cases'}</span>
        </button>
      </div>
    </div>
  );
};
