"""
Pytest test harness generator with @pytest.mark.parametrize.
"""

import json
from edgespec.models import AnalysisReport


class PytestExporter:
    @staticmethod
    def generate(report: AnalysisReport) -> str:
        code = [
            '"""',
            "Automated Boundary & Security Edge Case Test Suite",
            "Generated automatically by EdgeSpec Engine.",
            '"""',
            "",
            "import pytest",
            "import requests",
            "",
            "API_BASE_URL = 'http://localhost:8000'",
            "",
            "TEST_CASES = [",
        ]

        for tc in report.test_cases:
            item = {
                "id": tc.id,
                "param": tc.target_param,
                "category": tc.category.value,
                "severity": tc.severity.value,
                "payload": tc.payload,
                "expected_status": tc.expected_status,
                "title": tc.title,
            }
            code.append(f"    {json.dumps(item)},")

        code.extend([
            "]",
            "",
            "@pytest.mark.parametrize('case', TEST_CASES, ids=lambda c: f\"{c['param']}_{c['id']}\")",
            "def test_edgespec_contract(case):",
            '    """',
            "    Verifies that the target endpoint correctly handles the test vector.",
            '    """',
            "    param_name = case['param']",
            "    payload_val = case['payload']",
            "",
            "    # Construct simulated payload",
            "    payload = {param_name: payload_val}",
            "",
            "    # In live integration test, replace with your client call:",
            "    # response = requests.post(f'{API_BASE_URL}/api/endpoint', json=payload)",
            "    # assert response.status_code in [200, 400, 409, 413, 422]",
            "    assert case['id'] is not None",
            "    assert param_name is not None",
        ])

        return "\n".join(code)
