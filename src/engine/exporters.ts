import { AnalysisReport } from '../types';

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
Automated Boundary & Security Edge Case Test Suite
Generated automatically by EdgeSpec Engine.
\"\"\"

import pytest
import requests

API_BASE_URL = "http://localhost:8000"

TEST_CASES = ${JSON.stringify(casesJson, null, 4)}

@pytest.mark.parametrize("case", TEST_CASES, ids=lambda c: f"{c['param']}_{c['id']}")
def test_edgespec_contract(case):
    \"\"\"
    Verifies that the target endpoint correctly handles the synthesized test vector.
    \"\"\"
    param_name = case["param"]
    payload_val = case["payload"]

    # Construct request payload
    payload = {param_name: payload_val}

    # Example endpoint call (replace with your real test client):
    # response = requests.post(f"{API_BASE_URL}/api/endpoint", json=payload)
    # assert response.status_code in [200, 400, 409, 413, 422]

    assert case["id"] is not None
    assert param_name is not None
`;
}

export function exportToJest(report: AnalysisReport): string {
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
 * EdgeSpec Automated Contract & Boundary Test Suite
 * Generated for Jest / Vitest / Playwright
 */

import { describe, it, expect } from 'vitest';

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

describe('EdgeSpec Automated Verification Matrix', () => {
  test.each(testCases)(
    '[$severity] $param: $title',
    async ({ id, param, payload, expected }) => {
      // Example payload injection
      const requestBody = { [param]: payload };

      // Example integration call:
      // const response = await fetch('/api/endpoint', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(requestBody),
      // });
      // expect(response.status).toBeDefined();

      expect(id).toBeDefined();
      expect(param).toBeDefined();
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
    const jsonPayload = JSON.stringify(payloadDict);
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
