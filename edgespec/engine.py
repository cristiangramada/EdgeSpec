"""
Core orchestrator for EdgeSpec analysis.
"""

from typing import List, Set, Optional
from edgespec.models import (
    AnalysisReport,
    Category,
    Severity,
    TestCase,
)
from edgespec.parser import SpecParser
from edgespec.engines.boundary import BoundaryEngine
from edgespec.engines.type_fuzzer import TypeFuzzerEngine
from edgespec.engines.security import SecurityEngine
from edgespec.engines.concurrency import ConcurrencyEngine


class EdgeSpecEngine:
    @classmethod
    def analyze(
        cls,
        raw_text: str,
        enabled_categories: Optional[Set[Category]] = None,
    ) -> AnalysisReport:
        if enabled_categories is None:
            enabled_categories = {
                Category.BOUNDARY,
                Category.TYPE_FUZZ,
                Category.SECURITY,
                Category.CONCURRENCY,
            }

        spec_format, parameters = SpecParser.parse(raw_text)
        test_cases: List[TestCase] = []

        for param in parameters:
            if Category.BOUNDARY in enabled_categories:
                test_cases.extend(BoundaryEngine.generate(param))

            if Category.TYPE_FUZZ in enabled_categories:
                test_cases.extend(TypeFuzzerEngine.generate(param))

            if Category.SECURITY in enabled_categories:
                test_cases.extend(SecurityEngine.generate(param))

        # Concurrency scenarios apply to the request as a whole. Generate them
        # once and associate them with an idempotency field when one exists.
        if Category.CONCURRENCY in enabled_categories and parameters:
            concurrency_target = next(
                (p for p in parameters if "idempotency" in p.name.lower()),
                parameters[0],
            )
            test_cases.extend(ConcurrencyEngine.generate(concurrency_target))

        # Metrics calculation
        critical_count = sum(1 for tc in test_cases if tc.severity == Severity.CRITICAL)
        high_count = sum(1 for tc in test_cases if tc.severity == Severity.HIGH)
        medium_count = sum(1 for tc in test_cases if tc.severity == Severity.MEDIUM)
        low_count = sum(1 for tc in test_cases if tc.severity == Severity.LOW)

        metrics = {
            "total_test_cases": len(test_cases),
            "parameters_detected": len(parameters),
            "critical_severity": critical_count,
            "high_severity": high_count,
            "medium_severity": medium_count,
            "low_severity": low_count,
            "categories_active": [c.value for c in enabled_categories],
        }

        return AnalysisReport(
            format_detected=spec_format,
            parameters=parameters,
            test_cases=test_cases,
            metrics=metrics,
        )
