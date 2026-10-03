import unittest
from edgespec.engine import EdgeSpecEngine
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

    def test_jest_exporter(self):
        preset = PRESETS["discount_coupon_api"]["text"]
        report = EdgeSpecEngine.analyze(preset)
        code = JestExporter.generate(report)
        self.assertIn("describe('EdgeSpec Automated Verification Matrix'", code)
        self.assertIn("test.each", code)


if __name__ == "__main__":
    unittest.main()
