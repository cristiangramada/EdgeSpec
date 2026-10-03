import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Search,
  Filter,
  Sliders,
  Layers,
  ShieldAlert,
  Repeat,
  Info,
  KeyRound,
  FileCode,
  Tag,
  ArrowUpDown,
} from 'lucide-react';
import { AnalysisReport, Category, Severity, TestCase } from '../types';

interface ResultsViewProps {
  report: AnalysisReport;
  onOpenExportModal: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ report, onOpenExportModal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<Category | 'all'>('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<Severity | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPayload = (tc: TestCase) => {
    const textToCopy =
      typeof tc.payload === 'object' && tc.payload !== null
        ? JSON.stringify(tc.payload, null, 2)
        : String(tc.payload);

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(tc.id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === tc.id ? null : curr));
    }, 2000);
  };

  const filteredCases = useMemo(() => {
    return report.testCases.filter((tc) => {
      if (selectedCategoryFilter !== 'all' && tc.category !== selectedCategoryFilter) return false;
      if (selectedSeverityFilter !== 'all' && tc.severity !== selectedSeverityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTarget = tc.targetParam.toLowerCase().includes(q);
        const matchesTitle = tc.title.toLowerCase().includes(q);
        const matchesRationale = tc.technicalRationale.toLowerCase().includes(q);
        const matchesDisplay = tc.payloadDisplay.toLowerCase().includes(q);
        if (!matchesTarget && !matchesTitle && !matchesRationale && !matchesDisplay) return false;
      }
      return true;
    });
  }, [report.testCases, selectedCategoryFilter, selectedSeverityFilter, searchQuery]);

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case 'critical':
        return {
          bg: 'bg-red-500/10 text-red-400 border-red-500/30',
          dot: 'bg-red-400 animate-pulse',
        };
      case 'high':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'medium':
        return {
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          dot: 'bg-sky-400',
        };
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
        };
    }
  };

  const getCategoryIcon = (cat: Category) => {
    switch (cat) {
      case 'boundary':
        return <Sliders className="w-3 h-3 text-amber-400" />;
      case 'type_fuzz':
        return <Layers className="w-3 h-3 text-sky-400" />;
      case 'security':
        return <ShieldAlert className="w-3 h-3 text-rose-400" />;
      case 'concurrency':
        return <Repeat className="w-3 h-3 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Metrics Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-xs text-slate-400 font-medium">Test Vectors</div>
          <div className="text-2xl font-bold text-slate-100 mt-0.5">
            {report.metrics.totalTestCases}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across 4 Engines</div>
        </div>

        <div className="bg-slate-900/90 border border-red-950/60 rounded-xl p-3 shadow-md">
          <div className="text-xs text-red-400 font-medium flex items-center justify-between">
            <span>Critical Severity</span>
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-red-300 mt-0.5">
            {report.metrics.criticalSeverity}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Direct Exploit/Panic</div>
        </div>

        <div className="bg-slate-900/90 border border-amber-950/60 rounded-xl p-3 shadow-md">
          <div className="text-xs text-amber-400 font-medium">High Severity</div>
          <div className="text-2xl font-bold text-amber-300 mt-0.5">
            {report.metrics.highSeverity}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Contract / Bounds Violations</div>
        </div>

        <div className="bg-slate-900/90 border border-sky-950/60 rounded-xl p-3 shadow-md">
          <div className="text-xs text-sky-400 font-medium">Medium & Low</div>
          <div className="text-2xl font-bold text-sky-300 mt-0.5">
            {report.metrics.mediumSeverity + report.metrics.lowSeverity}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Sanitization & Formats</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
          <div className="text-xs text-slate-400 font-medium">Entities Discovered</div>
          <div className="text-2xl font-bold text-indigo-300 mt-0.5">
            {report.metrics.parametersDetected}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Target Parameters</div>
        </div>
      </div>

      {/* 2. Discovered Parameters Bar */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>Inferred Fields & Constraints</span>
          <span className="text-[11px] font-normal lowercase text-slate-500">
            {report.parameters.length} extracted
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.parameters.map((p) => (
            <div
              key={p.name}
              className="inline-flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
            >
              <KeyRound className="w-3 h-3 text-indigo-400" />
              <span className="font-mono text-slate-200">{p.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                {p.paramType}
              </span>
              {p.minValue !== undefined && (
                <span className="text-[10px] text-amber-400 font-mono">
                  [{p.minValue}..{p.maxValue ?? '∞'}]
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payload, target, or rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 border border-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end overflow-x-auto">
          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
            className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="boundary">Boundary Conditions</option>
            <option value="type_fuzz">Type Fuzzing</option>
            <option value="security">Security / OWASP</option>
            <option value="concurrency">Concurrency & State</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value as any)}
            className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={onOpenExportModal}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer"
          >
            Export All
          </button>
        </div>
      </div>

      {/* 4. Test Vector Matrix Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Showing <strong className="text-slate-200">{filteredCases.length}</strong> of{' '}
            {report.testCases.length} synthesized test cases
          </span>
          {filteredCases.length !== report.testCases.length && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('all');
                setSelectedSeverityFilter('all');
              }}
              className="text-indigo-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredCases.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-300">No matching test vectors</div>
            <p className="text-xs text-slate-500 mt-1">Try relaxing your search query or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredCases.map((tc) => {
              const sevBadge = getSeverityBadge(tc.severity);
              const isCopied = copiedId === tc.id;

              return (
                <div
                  key={tc.id}
                  className="bg-slate-900/90 rounded-xl border border-slate-800 hover:border-slate-700/80 p-4 transition shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    {/* Title and Parameter Target */}
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                          {tc.targetParam}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-100">{tc.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {tc.technicalRationale}
                      </p>
                    </div>

                    {/* Category & Severity Badges */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {getCategoryIcon(tc.category)}
                        <span>{tc.category.replace('_', ' ')}</span>
                      </div>
                      <div
                        className={`inline-flex items-center space-x-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${sevBadge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sevBadge.dot}`} />
                        <span>{tc.severity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Concrete Test Payload & Expected Behavior */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80">
                    {/* Left: Copyable Test Payload */}
                    <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800/80 flex items-center justify-between">
                      <div className="space-y-0.5 overflow-hidden pr-2">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                          Exact Test Payload / Vector:
                        </span>
                        <div className="font-mono text-xs text-amber-300 truncate select-all">
                          {tc.payloadDisplay}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyPayload(tc)}
                        className={`p-1.5 rounded-md border text-xs flex items-center space-x-1 transition shrink-0 cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title="Copy exact input payload to clipboard"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Right: Expected System Response & Mitigation */}
                    <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800/80 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                          Expected Response:
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          {tc.expectedStatus}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 leading-snug">
                        {tc.expectedBehavior}
                      </div>
                    </div>
                  </div>

                  {/* Mitigation note */}
                  {tc.mitigation && (
                    <div className="mt-2 text-[11px] text-emerald-400/90 flex items-center space-x-1.5">
                      <span className="font-semibold text-emerald-500">Defensive Fix:</span>
                      <span>{tc.mitigation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
