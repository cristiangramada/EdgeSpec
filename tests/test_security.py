import unittest
from edgespec.models import ExtractedParam, ParamType, Category, Severity
from edgespec.engines.security import SecurityEngine


class TestSecurityEngine(unittest.TestCase):
    def test_sql_and_xss_injection(self):
        param = ExtractedParam(name="username", param_type=ParamType.STRING)
        tests = SecurityEngine.generate(param)

        categories = [t.category for t in tests]
        self.assertTrue(all(c == Category.SECURITY for c in categories))

        titles = [t.title for t in tests]
        self.assertTrue(any("SQL Injection" in t for t in titles))
        self.assertTrue(any("XSS" in t for t in titles))
        self.assertTrue(any("Mass Assignment" in t for t in titles))

    def test_path_traversal_on_file(self):
        param = ExtractedParam(name="avatarFile", param_type=ParamType.FILE)
        tests = SecurityEngine.generate(param)
        titles = [t.title for t in tests]
        self.assertTrue(any("Directory Path Traversal" in t for t in titles))


if __name__ == "__main__":
    unittest.main()
