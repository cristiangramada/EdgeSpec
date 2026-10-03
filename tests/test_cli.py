import unittest
from edgespec.engine import EdgeSpecEngine
from edgespec.models import Category
from edgespec.presets import PRESETS
from edgespec.exporters.pytest_gen import PytestExporter
from edgespec.exporters.jest_gen import JestExporter


class TestEngineAndExporters(unittest.TestCase):
    def test_full_preset_analysis(self):
        preset = PRESETS["fintech_transfer"]["text"]
        report = EdgeSpecEngine.analyze(preset)
        self.assertGreater(len(report.parameters), 0)
        self.assertGreater(len(report.test_cases), 10)
        self.assertGreater(report.metrics["critical_severity"], 0)

    def test_pytest_exporter(self):
        preset = PRESETS["fintech_transfer"]["text"]
        report = EdgeSpecEngine.analyze(preset)
        code = PytestExporter.generate(report)
        self.assertIn("@pytest.mark.parametrize", code)
        self.assertIn("def test_edgespec_contract", code)
        self.assertIn("TEST_CASES = json.loads", code)
        self.assertIn("EDGESPEC_TARGET_URL", code)
        compile(code, "<generated-pytest>", "exec")

    def test_vitest_exporter(self):
        preset = PRESETS["discount_coupon_api"]["text"]
        report = EdgeSpecEngine.analyze(preset)
        code = JestExporter.generate(report)
        self.assertIn("describe('EdgeSpec Automated Verification Matrix'", code)
        self.assertIn("integrationTest.each", code)
        self.assertIn("import { describe, test, expect }", code)

    def test_concurrency_cases_are_not_duplicated_per_parameter(self):
        preset = PRESETS["discount_coupon_api"]["text"]
        report = EdgeSpecEngine.analyze(preset, enabled_categories={Category.CONCURRENCY})
        self.assertEqual(len(report.test_cases), 4)


if __name__ == "__main__":
    unittest.main()
