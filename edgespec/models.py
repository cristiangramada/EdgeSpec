"""
Core data structures for EdgeSpec test vector generation.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import List, Dict, Any, Optional


class Category(str, Enum):
    BOUNDARY = "boundary"
    TYPE_FUZZ = "type_fuzz"
    SECURITY = "security"
    CONCURRENCY = "concurrency"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ParamType(str, Enum):
    INTEGER = "integer"
    FLOAT = "float"
    CURRENCY = "currency"
    STRING = "string"
    EMAIL = "email"
    DATE = "date"
    UUID = "uuid"
    FILE = "file"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    UNKNOWN = "unknown"


class SpecFormat(str, Enum):
    USER_STORY = "user_story"
    GHERKIN = "gherkin"
    JSON_SCHEMA = "json_schema"
    API_SPEC = "api_spec"


@dataclass
class ExtractedParam:
    name: str
    param_type: ParamType
    required: bool = True
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    allowed_values: Optional[List[str]] = None
    max_file_size_bytes: Optional[int] = None
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TestCase:
    id: str
    target_param: str
    category: Category
    severity: Severity
    title: str
    payload: Any
    payload_display: str
    expected_status: str
    expected_behavior: str
    technical_rationale: str
    mitigation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["category"] = self.category.value
        d["severity"] = self.severity.value
        return d


@dataclass
class AnalysisReport:
    format_detected: SpecFormat
    parameters: List[ExtractedParam]
    test_cases: List[TestCase]
    metrics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "format_detected": self.format_detected.value,
            "parameters": [p.to_dict() for p in self.parameters],
            "test_cases": [tc.to_dict() for tc in self.test_cases],
            "metrics": self.metrics,
        }
