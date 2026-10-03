#!/usr/bin/env python3
"""
EdgeSpec CLI: Standalone Technical Test & Boundary Case Synthesis Tool
"""

import argparse
import json
import sys
from pathlib import Path

from edgespec.engine import EdgeSpecEngine
from edgespec.models import Category
from edgespec.presets import PRESETS
from edgespec.exporters.markdown import MarkdownExporter
from edgespec.exporters.pytest_gen import PytestExporter
from edgespec.exporters.jest_gen import JestExporter
from edgespec.exporters.curl_gen import CurlExporter


def main():
    parser = argparse.ArgumentParser(
        description="EdgeSpec: Generate reviewable boundary, malformed-input, security, and concurrency test ideas."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--preset", choices=list(PRESETS.keys()), help="Run analysis on a built-in industry preset.")
    group.add_argument("--spec", type=str, help="Path to a specification file (.md, .json, .feature, .txt).")
    group.add_argument("--text", type=str, help="Inline specification string to analyze.")

    parser.add_argument(
        "--export",
        choices=["markdown", "jira", "pytest", "vitest", "curl", "json"],
        default="markdown",
        help="Output format (default: markdown).",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        help="Optional output file path. If omitted, outputs to stdout.",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        choices=["boundary", "type_fuzz", "security", "concurrency"],
        help="Filter specific categories to run.",
    )

    args = parser.parse_args()

    # Determine input text
    spec_text = ""
    if args.preset:
        spec_text = PRESETS[args.preset]["text"]
    elif args.spec:
        p = Path(args.spec)
        if not p.exists():
            print(f"Error: Specification file not found: {args.spec}", file=sys.stderr)
            sys.exit(1)
        spec_text = p.read_text(encoding="utf-8")
    elif args.text:
        spec_text = args.text

    # Filter categories if specified
    cats = None
    if args.categories:
        cats = {Category(c) for c in args.categories}

    # Run analysis
    report = EdgeSpecEngine.analyze(spec_text, enabled_categories=cats)

    # Format output
    result = ""
    if args.export == "markdown":
        result = MarkdownExporter.to_markdown(report)
    elif args.export == "jira":
        result = MarkdownExporter.to_jira(report)
    elif args.export == "pytest":
        result = PytestExporter.generate(report)
    elif args.export == "vitest":
        result = JestExporter.generate(report)
    elif args.export == "curl":
        result = CurlExporter.generate(report)
    elif args.export == "json":
        result = json.dumps(report.to_dict(), indent=2)

    # Write output
    if args.output:
        out_p = Path(args.output)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(result, encoding="utf-8")
        print(f"✅ Generated {len(report.test_cases)} test vectors -> {args.output}")
    else:
        print(result)


if __name__ == "__main__":
    main()
