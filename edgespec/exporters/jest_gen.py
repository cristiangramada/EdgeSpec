"""
Jest / Vitest TypeScript test suite generator.
"""

import json
from edgespec.models import AnalysisReport


class JestExporter:
    @staticmethod
    def generate(report: AnalysisReport) -> str:
        cases_json = []
        for tc in report.test_cases:
            cases_json.append({
                "id": tc.id,
                "param": tc.target_param,
                "category": tc.category.value,
                "severity": tc.severity.value,
                "payload": tc.payload,
                "title": tc.title,
                "expected": tc.expected_status,
            })

        json_str = json.dumps(cases_json, indent=2)

        return f"""/**
 * EdgeSpec Automated Contract & Boundary Test Suite
 * Generated for Jest / Vitest / Playwright
 */

import {{ describe, it, expect }} from 'vitest';

interface EdgeTestCase {{
  id: string;
  param: string;
  category: string;
  severity: string;
  payload: any;
  title: string;
  expected: string;
}}

const testCases: EdgeTestCase[] = {json_str};

describe('EdgeSpec Automated Verification Matrix', () => {{
  test.each(testCases)(
    '[$severity] $param: $title',
    async ({{ id, param, payload, expected }}) => {{
      // Example payload injection
      const requestBody = {{ [param]: payload }};

      // Replace with your real API client or service call:
      // const response = await fetch('/api/endpoint', {{
      //   method: 'POST',
      //   headers: {{ 'Content-Type': 'application/json' }},
      //   body: JSON.stringify(requestBody),
      // }});
      // expect(response.status).toBeDefined();

      expect(id).toBeDefined();
      expect(param).toBeDefined();
    }}
  );
}});
"""
