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
 * EdgeSpec API test starter.
 * Set EDGESPEC_TARGET_URL, then customize request construction and assertions
 * for your application's contract.
 */

import {{ describe, test, expect }} from 'vitest';

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
const targetUrl = process.env.EDGESPEC_TARGET_URL;
const integrationTest = targetUrl ? test : test.skip;

describe('EdgeSpec Automated Verification Matrix', () => {{
  integrationTest.each(testCases)(
    '[$severity] $param: $title',
    async ({{ id, param, payload, expected }}) => {{
      const requestBody = {{ [param]: payload }};
      const response = await fetch(targetUrl!, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(requestBody),
      }});

      expect(response.status, `${{id}}; review expected outcome: ${{expected}}`).toBeLessThan(500);
    }}
  );
}});
"""
