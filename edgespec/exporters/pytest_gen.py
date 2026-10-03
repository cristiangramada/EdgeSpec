"""
Pytest test harness generator with @pytest.mark.parametrize.
"""

import json
from edgespec.models import AnalysisReport


class PytestExporter:
    @staticmethod
    def generate(report: AnalysisReport) -> str:
        cases = []
        for tc in report.test_cases:
            cases.append({
                "id": tc.id,
                "param": tc.target_param,
                "category": tc.category.value,
                "severity": tc.severity.value,
                "payload": tc.payload,
                "expected_status": tc.expected_status,
                "title": tc.title,
            })

        cases_json = json.dumps(cases, indent=2)
        code = [
            '"""',
            "EdgeSpec API test starter.",
            "",
            "Set EDGESPEC_TARGET_URL to enable integration requests, then customize",
            "request construction and assertions for your application's contract.",
            '"""',
            "",
            "import json",
            "import os",
            "import pytest",
            "import requests",
            "",
            "TARGET_URL = os.getenv('EDGESPEC_TARGET_URL')",
            "",
            f"TEST_CASES = json.loads(r'''{cases_json}''')",
            "",
            "@pytest.mark.parametrize('case', TEST_CASES, ids=lambda c: f\"{c['param']}_{c['id']}\")",
            "def test_edgespec_contract(case):",
            "    if not TARGET_URL:",
            "        pytest.skip('Set EDGESPEC_TARGET_URL to run generated API tests')",
            "",
            "    param_name = case['param']",
            "    payload_val = case['payload']",
            "    payload = {param_name: payload_val}",
            "",
            "    response = requests.post(TARGET_URL, json=payload, timeout=10)",
            "    assert response.status_code < 500, (",
            "        f\"{case['id']} triggered server error {response.status_code}; \"",
            "        f\"review expected outcome: {case['expected_status']}\"",
            "    )",
        ]

        return "\n".join(code)
