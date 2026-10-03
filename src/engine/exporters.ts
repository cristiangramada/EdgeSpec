import type { AnalysisReport } from '../types.ts';

export function exportToMarkdown(report: AnalysisReport): string {
  const lines: string[] = [
    '# EdgeSpec Technical Test Matrix',
    `**Format Detected:** \`${report.formatDetected}\`  `,
    `**Total Test Vectors:** ${report.metrics.totalTestCases}  `,
    `**Critical / High Severity:** ${report.metrics.criticalSeverity} Critical, ${report.metrics.highSeverity} High\n`,
    '## Extracted Parameters',
    '| Parameter | Type | Required | Constraints |',
    '|---|---|---|---|',
  ];

  for (const p of report.parameters) {
    const constraints: string[] = [];
    if (p.minValue !== undefined || p.maxValue !== undefined) {
      constraints.push(`Range: [${p.minValue ?? 0} .. ${p.maxValue ?? 'max'}]`);
    }
    if (p.minLength !== undefined || p.maxLength !== undefined) {
      constraints.push(`Len: [${p.minLength ?? 0} .. ${p.maxLength ?? 'max'}]`);
    }
    if (p.maxFileSizeBytes !== undefined) {
      constraints.push(`MaxBytes: ${p.maxFileSizeBytes.toLocaleString()}`);
    }
    lines.push(
      `| \`${p.name}\` | ${p.paramType} | ${p.required ? 'Yes' : 'No'} | ${constraints.join(', ') || '-'} |`
    );
  }

  lines.push('\n## Test Payloads & Verification Plan');
  lines.push(
    '| Target | Severity | Category | Test Objective | Payload Vector | Expected Behavior |'
  );
  lines.push('|---|---|---|---|---|---|');

  for (const tc of report.testCases) {
    const payloadEscaped = tc.payloadDisplay.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const expectedEscaped = tc.expectedBehavior.replace(/\|/g, '\\|');
    lines.push(
      `| \`${tc.targetParam}\` | **${tc.severity.toUpperCase()}** | ${tc.category} | ${tc.title} | \`${payloadEscaped}\` | ${tc.expectedStatus}: ${expectedEscaped} |`
    );
  }

  return lines.join('\n');
}

export function exportToJira(report: AnalysisReport): string {
  const lines: string[] = [
    'h2. EdgeSpec Test Matrix',
    `*Total Test Cases:* ${report.metrics.totalTestCases} | *Critical:* ${report.metrics.criticalSeverity}`,
    '||Target||Severity||Category||Objective||Payload||Expected Status / Behavior||',
  ];

  for (const tc of report.testCases) {
    lines.push(
      `|{{${tc.targetParam}}}|*${tc.severity.toUpperCase()}*|${tc.category}|${tc.title}|{{${tc.payloadDisplay}}}|${tc.expectedStatus} - ${tc.expectedBehavior}|`
    );
  }

  return lines.join('\n');
}

export function exportToPytest(report: AnalysisReport): string {
  const casesJson = report.testCases.map((tc) => ({
    id: tc.id,
    param: tc.targetParam,
    category: tc.category,
    severity: tc.severity,
    payload: tc.payload,
    expected_status: tc.expectedStatus,
    title: tc.title,
  }));

  return `\"\"\"
EdgeSpec API test starter.

Set EDGESPEC_TARGET_URL to enable the integration requests, then customize
the request construction and assertions for your application's contract.
\"\"\"

import json
import os
import pytest
import requests

TARGET_URL = os.getenv("EDGESPEC_TARGET_URL")

TEST_CASES = json.loads(r'''${JSON.stringify(casesJson, null, 2)}''')

@pytest.mark.parametrize("case", TEST_CASES, ids=lambda c: f"{c['param']}_{c['id']}")
def test_edgespec_contract(case):
    if not TARGET_URL:
        pytest.skip("Set EDGESPEC_TARGET_URL to run generated API tests")

    param_name = case["param"]
    payload_val = case["payload"]
    payload = {param_name: payload_val}

    response = requests.post(TARGET_URL, json=payload, timeout=10)
    assert response.status_code < 500, (
        f"{case['id']} triggered server error {response.status_code}; "
        f"review expected outcome: {case['expected_status']}"
    )
`;
}

export function exportToVitest(report: AnalysisReport): string {
  const casesJson = report.testCases.map((tc) => ({
    id: tc.id,
    param: tc.targetParam,
    category: tc.category,
    severity: tc.severity,
    payload: tc.payload,
    title: tc.title,
    expected: tc.expectedStatus,
  }));

  return `/**
 * EdgeSpec API test starter.
 * Set EDGESPEC_TARGET_URL, then customize request construction and assertions
 * for your application's contract.
 */

import { describe, test, expect } from 'vitest';

interface EdgeTestCase {
  id: string;
  param: string;
  category: string;
  severity: string;
  payload: any;
  title: string;
  expected: string;
}

const testCases: EdgeTestCase[] = ${JSON.stringify(casesJson, null, 2)};
const targetUrl = process.env.EDGESPEC_TARGET_URL;
const integrationTest = targetUrl ? test : test.skip;

describe('EdgeSpec Automated Verification Matrix', () => {
  integrationTest.each(testCases)(
    '[$severity] $param: $title',
    async ({ id, param, payload, expected }) => {
      const requestBody = { [param]: payload };
      const response = await fetch(targetUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(response.status, id + '; review expected outcome: ' + expected).toBeLessThan(500);
    }
  );
});
`;
}

export function exportToCurl(report: AnalysisReport, baseUrl = 'http://localhost:8000/api/endpoint'): string {
  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# EdgeSpec Automated Security & Boundary cURL Test Harness',
    'set -e',
    '',
    `BASE_URL="${baseUrl}"`,
    'echo "Running EdgeSpec automated fuzzing and boundary vectors against $BASE_URL..."',
    '',
  ];

  report.testCases.forEach((tc, idx) => {
    const payloadDict = { [tc.targetParam]: tc.payload };
    const jsonPayload = JSON.stringify(payloadDict).replace(/'/g, `'"'"'`);
    lines.push(
      `# [${idx + 1}/${report.testCases.length}] ${tc.severity.toUpperCase()} - ${tc.title}`,
      `# Expected: ${tc.expectedStatus}`,
      `curl -s -X POST "$BASE_URL" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '${jsonPayload}' -o /dev/null -w "HTTP %{http_code} for ${tc.id}\\n"`,
      ''
    );
  });

  lines.push('echo "All test vectors dispatched successfully."');
  return lines.join('\n');
}
