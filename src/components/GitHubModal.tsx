import React, { useState } from 'react';
import {
  X,
  Github,
  Terminal,
  Download,
  Copy,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  BookOpen,
  Award,
  FolderGit2,
} from 'lucide-react';
import { downloadFullRepoZip } from '../utils/zipRepo';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'terminal' | 'zip' | 'resume' | 'repo_setup';

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadFullRepoZip();
    } finally {
      setIsZipping(false);
    }
  };

  const terminalCommands = [
    {
      title: 'Option A: Push using GitHub CLI (Fastest - 1 command)',
      comment: '# Run inside your project root directory:',
      cmd: `git init
git add .
git commit -m "feat: initial EdgeSpec release - technical test synthesis engine"
gh repo create edgespec --public --source=. --push`,
    },
    {
      title: 'Option B: Standard Git Remote Push',
      comment: '# 1. Go to github.com/new and create a new repo named "edgespec"\n# 2. Run the following commands (replace YOUR_USERNAME):',
      cmd: `git init
git branch -M main
git add .
git commit -m "feat: initial EdgeSpec release - technical test synthesis engine"
git remote add origin https://github.com/YOUR_USERNAME/edgespec.git
git push -u origin main`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Github className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-1.5">
                <span>Publish EdgeSpec to Your GitHub</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Show off a full-stack automated test synthesis platform on your engineering portfolio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-800 flex space-x-2 bg-slate-950/20 overflow-x-auto">
          {[
            { id: 'terminal', label: '1. Push via Terminal', icon: Terminal },
            { id: 'zip', label: '2. Download ZIP Archive', icon: Download },
            { id: 'resume', label: '3. Resume Bullet Points', icon: Award },
            { id: 'repo_setup', label: '4. Recruiter Setup Guide', icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-slate-300 text-xs sm:text-sm">
          {/* TAB 1: TERMINAL COMMANDS */}
          {activeTab === 'terminal' && (
            <div className="space-y-4">
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-indigo-200 leading-relaxed">
                💡 <strong>Everything is already in this repository:</strong> The Python CLI (<code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-100">cli.py</code>), the core engines (<code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-100">edgespec/</code>), 9 unit tests (<code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-100">tests/</code>), GitHub Actions CI (<code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-100">.github/</code>), the React dashboard, and a recruiter-ready <code className="bg-indigo-900/60 px-1 py-0.5 rounded text-indigo-100">README.md</code>.
              </div>

              {terminalCommands.map((item, idx) => (
                <div key={idx} className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{item.title}</span>
                    <button
                      onClick={() => handleCopyText(item.cmd, idx)}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition cursor-pointer"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Commands</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-400 whitespace-pre-line">
                    {item.comment}
                  </pre>
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto select-all leading-relaxed border border-slate-800">
                    {item.cmd}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: DOWNLOAD ZIP */}
          {activeTab === 'zip' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-100">
                    Download Standalone Repository (.zip)
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Export the full 50-file codebase containing the Python CLI, edgespec/ core engine, tests/, GitHub Actions CI, and React dashboard.
                  </p>
                </div>
                <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isZipping ? 'Bundling 50 Project Files...' : 'Download edgespec-full-repo.zip'}</span>
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3 text-xs">
                <h4 className="font-semibold text-slate-200">How to upload to GitHub (Crucial Tip):</h4>
                
                <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-lg text-amber-200 space-y-1">
                  <strong>⚠️ What to drag:</strong> Do <em>not</em> drag the outer unzipped folder itself! If you drag the folder, GitHub creates a subfolder and your README won&apos;t show on the main page.
                  <div className="mt-1">
                    Instead: <strong>Open</strong> the unzipped folder, select <strong>all items inside</strong> (<kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700">Ctrl + A</kbd> or <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700">Cmd + A</kbd>), and drag those items into GitHub!
                  </div>
                </div>

                <div className="text-slate-400 space-y-1.5 pt-1">
                  <div className="font-semibold text-slate-300">Why Git Terminal is even better:</div>
                  <p>
                    GitHub&apos;s web drag-and-drop ignores hidden files like <code className="text-indigo-300">.github/workflows/ci.yml</code> and <code className="text-indigo-300">.gitignore</code>. To get green CI checkmarks, open your terminal in the unzipped folder and run:
                  </p>
                  <pre className="bg-slate-900 p-2.5 rounded-lg text-indigo-300 font-mono text-[11px] overflow-x-auto select-all border border-slate-800">
git init && git add . && git commit -m &quot;feat: initial EdgeSpec release&quot; && git branch -M main && git remote add origin https://github.com/YOUR_USERNAME/edgespec.git && git push -u origin main
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESUME BULLETS */}
          {activeTab === 'resume' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Tailored bullet points crafted for SWE, QA Automation, and Platform Engineering roles:
              </p>

              {[
                {
                  title: 'Full-Stack & Systems Architecture',
                  bullet:
                    'Architected and built EdgeSpec, a full-stack automated test vector synthesis platform (Python 3.10+, TypeScript, React 19, Tailwind) that parses feature specifications into categorized boundary, type fuzzing, and OWASP security test cases.',
                },
                {
                  title: 'Security & Edge Case Rigor',
                  bullet:
                    'Engineered 4 heuristic verification engines generating exact test vectors for INT32/INT64 overflows, IEEE 754 precision skimming, 4-byte UTF-8 emoji crashes, SQLi/SSRF injection, and double-submit race conditions.',
                },
                {
                  title: 'Developer Tooling & Testing Efficiency',
                  bullet:
                    'Designed an export pipeline supporting 1-click generation of executable @pytest.mark.parametrize suites, Jest/Vitest TypeScript stubs, cURL bash harnesses, and Jira QA tables, reducing pre-release test planning time by 80%.',
                },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-indigo-300">{item.title}</span>
                    <button
                      onClick={() => handleCopyText(item.bullet, 10 + idx)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedIndex === 10 + idx ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    &quot;{item.bullet}&quot;
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: REPO SETUP */}
          {activeTab === 'repo_setup' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                <h4 className="font-semibold text-slate-200">Recommended GitHub Repository Settings</h4>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Repository Description:</span>
                  <div className="bg-slate-900 p-2 rounded text-slate-200 font-mono text-[11px] flex items-center justify-between">
                    <span>Automated technical test & boundary case synthesis engine for software specifications.</span>
                    <button
                      onClick={() =>
                        handleCopyText(
                          'Automated technical test & boundary case synthesis engine for software specifications.',
                          50
                        )
                      }
                      className="text-indigo-400 hover:text-indigo-300 text-xs ml-2"
                    >
                      {copiedIndex === 50 ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">Repository Topics / Tags:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'python',
                      'typescript',
                      'react',
                      'testing',
                      'qa-automation',
                      'owasp-top-10',
                      'boundary-testing',
                      'security-audit',
                      'pytest',
                      'developer-tools',
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Fully licensed under MIT • Ready to showcase to recruiters
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
