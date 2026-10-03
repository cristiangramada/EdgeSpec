import unittest
from edgespec.models import ExtractedParam, ParamType, Category, Severity
from edgespec.engines.boundary import BoundaryEngine


class TestBoundaryEngine(unittest.TestCase):
    def test_numeric_boundaries(self):
        param = ExtractedParam(
            name="amount",
            param_type=ParamType.CURRENCY,
            min_value=1.0,
            max_value=100.0,
        )
        tests = BoundaryEngine.generate(param)
        self.assertTrue(len(tests) >= 5)

        titles = [t.title for t in tests]
        self.assertTrue(any("Exact Lower Bound" in t for t in titles))
        self.assertTrue(any("Off-By-One Below" in t for t in titles))
        self.assertTrue(any("Exact Upper Bound" in t for t in titles))
        self.assertTrue(any("Signed 32-Bit Integer Overflow" in t for t in titles))
        self.assertTrue(any("Negative Value" in t for t in titles))

        # Check negative is marked critical
        neg_test = next(t for t in tests if "Negative Value" in t.title)
        self.assertEqual(neg_test.severity, Severity.CRITICAL)


if __name__ == "__main__":
    unittest.main()
