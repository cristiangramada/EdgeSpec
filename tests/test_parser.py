import unittest
import json
from pathlib import Path
from edgespec.parser import SpecParser
from edgespec.models import SpecFormat, ParamType


class TestSpecParser(unittest.TestCase):
    def test_shared_parser_fixtures(self):
        fixture_path = Path(__file__).parent / "fixtures" / "parser_cases.json"
        cases = json.loads(fixture_path.read_text(encoding="utf-8"))

        for case in cases:
            with self.subTest(case=case["name"]):
                fmt, params = SpecParser.parse(case["input"])
                self.assertEqual(fmt.value, case["format"])
                self.assertEqual([p.name for p in params], case["parameters"])

    def test_json_schema_detection(self):
        schema = '{"title": "User", "properties": {"age": {"type": "integer"}}}'
        fmt, params = SpecParser.parse(schema)
        self.assertEqual(fmt, SpecFormat.JSON_SCHEMA)
        self.assertEqual(len(params), 1)
        self.assertEqual(params[0].name, "age")
        self.assertEqual(params[0].param_type, ParamType.INTEGER)

    def test_gherkin_detection(self):
        gherkin = """Feature: Checkout
  Scenario: Customer pays
    Given customer with ID "cust_123" has cart $50.00
    When customer submits quantity 2
"""
        fmt, params = SpecParser.parse(gherkin)
        self.assertEqual(fmt, SpecFormat.GHERKIN)
        names = [p.name for p in params]
        self.assertIn("quantity", names)

    def test_user_story_detection_and_currency(self):
        story = "User transfers between $10.00 and $2,500.00 to email user@example.com."
        fmt, params = SpecParser.parse(story)
        self.assertEqual(fmt, SpecFormat.USER_STORY)
        amount_param = next(p for p in params if p.name == "transferAmount")
        self.assertEqual(amount_param.min_value, 10.0)
        self.assertEqual(amount_param.max_value, 2500.0)


if __name__ == "__main__":
    unittest.main()
