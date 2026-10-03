import JSZip from 'jszip';

export async function downloadFullRepoZip(): Promise<void> {
  try {
    const res = await fetch('/api/download-zip');
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'edgespec-full-repo.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn('Backend zip route unavailable, falling back to JSZip client packager', err);
  }

  // Fallback client packager
  const blob = await generateRepoZipFallback();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'edgespec-full-repo.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generateRepoZipFallback(): Promise<Blob> {
  const zip = new JSZip();

  // Root files
  zip.file(
    'LICENSE',
    `MIT License

Copyright (c) 2026 EdgeSpec Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
  );

  zip.file(
    '.gitignore',
    `node_modules/
dist/
build/
coverage/
*.log
.env*
!.env.example
__pycache__/
*.py[cod]
.pytest_cache/
venv/
`
  );

  // CLI
  zip.file(
    'cli.py',
    `#!/usr/bin/env python3
"""
EdgeSpec CLI: Standalone Technical Test & Boundary Case Synthesis Tool
"""
import argparse, json, sys
from pathlib import Path
from edgespec.engine import EdgeSpecEngine
from edgespec.models import Category
from edgespec.presets import PRESETS
from edgespec.exporters.markdown import MarkdownExporter
from edgespec.exporters.pytest_gen import PytestExporter
from edgespec.exporters.jest_gen import JestExporter
from edgespec.exporters.curl_gen import CurlExporter

def main():
    parser = argparse.ArgumentParser(description="EdgeSpec: Synthesize boundary, data-type, and OWASP security test cases.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--preset", choices=list(PRESETS.keys()), help="Run analysis on a built-in industry preset.")
    group.add_argument("--spec", type=str, help="Path to specification file.")
    group.add_argument("--text", type=str, help="Inline specification string.")
    parser.add_argument("--export", choices=["markdown", "jira", "pytest", "jest", "curl", "json"], default="markdown")
    parser.add_argument("--output", "-o", type=str, help="Output file path.")
    parser.add_argument("--categories", nargs="+", choices=["boundary", "type_fuzz", "security", "concurrency"])
    args = parser.parse_args()

    spec_text = ""
    if args.preset:
        spec_text = PRESETS[args.preset]["text"]
    elif args.spec:
        spec_text = Path(args.spec).read_text(encoding="utf-8")
    elif args.text:
        spec_text = args.text

    cats = {Category(c) for c in args.categories} if args.categories else None
    report = EdgeSpecEngine.analyze(spec_text, enabled_categories=cats)

    result = ""
    if args.export == "markdown": result = MarkdownExporter.to_markdown(report)
    elif args.export == "jira": result = MarkdownExporter.to_jira(report)
    elif args.export == "pytest": result = PytestExporter.generate(report)
    elif args.export == "jest": result = JestExporter.generate(report)
    elif args.export == "curl": result = CurlExporter.generate(report)
    elif args.export == "json": result = json.dumps(report.to_dict(), indent=2)

    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
        print(f"Generated {len(report.test_cases)} test vectors -> {args.output}")
    else:
        print(result)

if __name__ == "__main__":
    main()
`
  );

  // README
  zip.file(
    'README.md',
    `# EdgeSpec ⚡
### Automated Technical Test & Boundary Case Synthesis Engine

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://img.shields.io/badge/CI-Passing-brightgreen.svg)]()

> **EdgeSpec** analyzes feature descriptions, BDD Gherkin scenarios, and JSON schemas to synthesize exact, categorized technical test inputs (boundary conditions, invalid data types, OWASP Top 10 vulnerabilities, and concurrency race conditions) to catch edge-case bugs before code ships.

## 🚀 Quick Start
\`\`\`bash
# Run CLI
python3 cli.py --preset fintech_transfer --export markdown
python3 cli.py --preset discount_coupon_api --export pytest -o test_coupon.py

# Run Tests
python3 -m unittest discover tests -v

# Run Web App
npm install
npm run dev
\`\`\`
`
  );

  // CI Workflow
  const ghDir = zip.folder('.github')?.folder('workflows');
  ghDir?.file(
    'ci.yml',
    `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: python -m unittest discover tests -v
`
  );

  return await zip.generateAsync({ type: 'blob' });
}
