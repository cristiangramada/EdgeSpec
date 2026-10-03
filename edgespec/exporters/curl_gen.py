"""
cURL bash test harness generator.
"""

import json
from edgespec.models import AnalysisReport


class CurlExporter:
    @staticmethod
    def generate(report: AnalysisReport, base_url: str = "http://localhost:8000/api/endpoint") -> str:
        lines = [
            "#!/usr/bin/env bash",
            "# EdgeSpec Automated Security & Boundary cURL Test Harness",
            "set -e",
            "",
            f"BASE_URL=\"{base_url}\"",
            "echo \"Running EdgeSpec automated fuzzing and boundary vectors against $BASE_URL...\"",
            "",
        ]

        for idx, tc in enumerate(report.test_cases, 1):
            payload_dict = {tc.target_param: tc.payload}
            json_payload = json.dumps(payload_dict)
            lines.extend([
                f"# [{idx}/{len(report.test_cases)}] {tc.severity.value.upper()} - {tc.title}",
                f"# Expected: {tc.expected_status}",
                f"curl -s -X POST \"$BASE_URL\" \\",
                "  -H \"Content-Type: application/json\" \\",
                f"  -d '{json_payload}' -o /dev/null -w \"HTTP %{{http_code}} for {tc.id}\\n\"",
                "",
            ])

        lines.append("echo \"All test vectors dispatched successfully.\"")
        return "\n".join(lines)
