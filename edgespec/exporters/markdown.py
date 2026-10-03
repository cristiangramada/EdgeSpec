"""
Markdown and Jira table exporter.
"""

from edgespec.models import AnalysisReport


class MarkdownExporter:
    @staticmethod
    def to_markdown(report: AnalysisReport) -> str:
        lines = [
            "# EdgeSpec Technical Test Matrix",
            f"**Format Detected:** `{report.format_detected.value}`  ",
            f"**Total Test Vectors:** {report.metrics.get('total_test_cases', 0)}  ",
            f"**Critical / High Severity:** {report.metrics.get('critical_severity', 0)} Critical, {report.metrics.get('high_severity', 0)} High\n",
            "## Extracted Parameters",
            "| Parameter | Type | Required | Constraints |",
            "|---|---|---|---|",
        ]

        for p in report.parameters:
            constraints = []
            if p.min_value is not None or p.max_value is not None:
                constraints.append(f"Range: [{p.min_value} .. {p.max_value}]")
            if p.min_length is not None or p.max_length is not None:
                constraints.append(f"Len: [{p.min_length} .. {p.max_length}]")
            if p.max_file_size_bytes is not None:
                constraints.append(f"MaxBytes: {p.max_file_size_bytes}")
            cstr = ", ".join(constraints) if constraints else "-"
            lines.append(f"| `{p.name}` | {p.param_type.value} | {'Yes' if p.required else 'No'} | {cstr} |")

        lines.extend([
            "\n## Test Payloads & Verification Plan",
            "| Target | Severity | Category | Test Objective | Payload Vector | Expected Behavior |",
            "|---|---|---|---|---|---|",
        ])

        for tc in report.test_cases:
            payload_escaped = tc.payload_display.replace("|", "\\|").replace("\n", " ")
            expected_escaped = tc.expected_behavior.replace("|", "\\|")
            lines.append(
                f"| `{tc.target_param}` | **{tc.severity.value.upper()}** | {tc.category.value} | {tc.title} | `{payload_escaped}` | {tc.expected_status}: {expected_escaped} |"
            )

        return "\n".join(lines)

    @staticmethod
    def to_jira(report: AnalysisReport) -> str:
        lines = [
            "h2. EdgeSpec Test Matrix",
            f"*Total Test Cases:* {report.metrics.get('total_test_cases', 0)} | *Critical:* {report.metrics.get('critical_severity', 0)}",
            "||Target||Severity||Category||Objective||Payload||Expected Status / Behavior||",
        ]
        for tc in report.test_cases:
            lines.append(
                f"|{{{{{tc.target_param}}}}}|*{tc.severity.value.upper()}*|{tc.category.value}|{tc.title}|{{{{{tc.payload_display}}}}}|{tc.expected_status} - {tc.expected_behavior}|"
            )
        return "\n".join(lines)
