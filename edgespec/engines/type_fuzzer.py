"""
Type Fuzzer & Data Violation Engine:
Tests nullability, type juggling (True==1, string-for-int), malformed emails/UUIDs,
UTF-8 4-byte emoji database crashes, Y2038 epoch, and Unicode collision traps.
"""

from typing import List
from edgespec.models import ExtractedParam, TestCase, Category, Severity, ParamType


class TypeFuzzerEngine:
    @classmethod
    def generate(cls, param: ExtractedParam) -> List[TestCase]:
        tests: List[TestCase] = []
        p_name = param.name
        p_type = param.param_type

        # 1. Null / Undefined / Omission
        tests.append(
            TestCase(
                id=f"{p_name}_type_explicit_null",
                target_param=p_name,
                category=Category.TYPE_FUZZ,
                severity=Severity.HIGH if param.required else Severity.LOW,
                title="Explicit Null Literal (null)",
                payload=None,
                payload_display="null",
                expected_status="HTTP 422 Unprocessable Entity" if param.required else "HTTP 200 OK",
                expected_behavior="Descriptive validation failure if field is required; no 500 NullPointerException.",
                technical_rationale="Verifies that database nullability constraints match API layer deserializer contracts.",
                mitigation="Mark field as non-nullable in schema and DTO validator.",
            )
        )

        tests.append(
            TestCase(
                id=f"{p_name}_type_omitted_field",
                target_param=p_name,
                category=Category.TYPE_FUZZ,
                severity=Severity.HIGH if param.required else Severity.LOW,
                title="Completely Omitted Property / Undefined",
                payload="<OMITTED_PROPERTY>",
                payload_display="[Property key omitted from JSON body]",
                expected_status="HTTP 422 Unprocessable Entity" if param.required else "HTTP 200 OK",
                expected_behavior="Identifies missing required property and responds with specific field error.",
                technical_rationale="Tests default value handling and prevents undefined index / key error panics.",
                mitigation="Validate schema required array before processing request body.",
            )
        )

        # 2. Type Juggling for Numbers
        if p_type in [ParamType.INTEGER, ParamType.FLOAT, ParamType.CURRENCY]:
            # Boolean Coercion
            tests.append(
                TestCase(
                    id=f"{p_name}_type_boolean_coercion",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.HIGH,
                    title="Boolean Coercion (true / false)",
                    payload=True,
                    payload_display="true",
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Strict type validator rejects boolean value without evaluating `true == 1`.",
                    technical_rationale="In weakly typed runtimes (PHP, JS, Python), `true` evaluates to integer `1`, causing unintended transactions.",
                    mitigation="Use strict type assertion (`isinstance(v, int) and not isinstance(v, bool)` in Python).",
                )
            )

            # String representation of text
            tests.append(
                TestCase(
                    id=f"{p_name}_type_string_for_number",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.MEDIUM,
                    title="Alphabetical String for Numeric Field",
                    payload="one_hundred",
                    payload_display='"one_hundred"',
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected by deserializer with type mismatch error.",
                    technical_rationale="Catches uncaught NumberFormatException or ValueError during string-to-number parsing.",
                    mitigation="Validate numeric format before attempting parse.",
                )
            )

            # Array injected into scalar
            tests.append(
                TestCase(
                    id=f"{p_name}_type_array_for_scalar",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.HIGH,
                    title="Array Passed Instead of Primitive Number",
                    payload=[100, 200],
                    payload_display="[100, 200]",
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected as schema violation.",
                    technical_rationale="Can cause unexpected ORM query modification or parameter pollution.",
                    mitigation="Verify type schema strictly disallows array containers.",
                )
            )

        # 3. Email-specific Violations
        if p_type == ParamType.EMAIL or "email" in p_name.lower():
            tests.append(
                TestCase(
                    id=f"{p_name}_type_malformed_email_no_domain",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.MEDIUM,
                    title="Malformed Email Without TLD (user@localhost)",
                    payload="user@localhost",
                    payload_display='"user@localhost"',
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected as non-routable public email address.",
                    technical_rationale="Prevents internal server routing or internal mail spoofing.",
                    mitigation="Enforce FQDN domain validation with public suffix verification.",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_type_homograph_unicode_email",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.HIGH,
                    title="Cyrillic Homograph Unicode Spoof (аdmin@apple.com)",
                    payload="аdmin@apple.com",  # Cyrillic 'а' (U+0430)
                    payload_display='"\\u0430dmin@apple.com" (Cyrillic "а")',
                    expected_status="HTTP 422 / Normalized Punycode",
                    expected_behavior="Either rejected or normalized to Punycode `xn--...` to prevent identity spoofing.",
                    technical_rationale="Unicode homoglyphs appear identical to users but point to completely different accounts.",
                    mitigation="Apply NFKC normalization or restrict allowable character scripts in usernames.",
                )
            )

        # 4. Text & String Traps (4-byte UTF-8, Zero-width, RTLO)
        if p_type in [ParamType.STRING, ParamType.EMAIL, ParamType.UUID]:
            tests.append(
                TestCase(
                    id=f"{p_name}_type_utf8_4byte_emoji",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.HIGH,
                    title="4-Byte UTF-8 Emoji (👨‍👩‍👧‍👦🚀)",
                    payload="👨‍👩‍👧‍👦🚀",
                    payload_display='"👨‍👩‍👧‍👦🚀" (4-byte UTF-8 sequence)',
                    expected_status="HTTP 200 OK / Graceful handling",
                    expected_behavior="Successfully stored without truncation or database character encoding crash.",
                    technical_rationale="Crashes legacy MySQL databases configured with 3-byte `utf8` instead of `utf8mb4`.",
                    mitigation="Ensure database collation is `utf8mb4_unicode_ci` and connection charset is `utf8mb4`.",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_type_zero_width_space",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.MEDIUM,
                    title="Zero-Width Whitespace Characters (\\u200B\\uFEFF)",
                    payload="test\u200b\ufeffuser",
                    payload_display='"test\\u200B\\uFEFFuser"',
                    expected_status="HTTP 422 or Sanitized Clean String",
                    expected_behavior="Invisible characters stripped or rejected during input sanitization.",
                    technical_rationale="Invisible zero-width spaces allow duplicate visual usernames and bypass unique constraints.",
                    mitigation="Strip invisible zero-width and format characters in string normalizer.",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_type_rtlo_spoof",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.HIGH,
                    title="Right-to-Left Override Character (\\u202E)",
                    payload="document\u202Eexe.pdf",
                    payload_display='"document\\u202Eexe.pdf"',
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected or RTLO control character stripped.",
                    technical_rationale="RTLO reverses string rendering in browsers/OS, tricking users into running dangerous files.",
                    mitigation="Reject or sanitize bidirectional control characters (U+202A to U+202E).",
                )
            )

        # 5. Date / Time Epoch Overflow (Y2038)
        if p_type == ParamType.DATE or "date" in p_name.lower() or "time" in p_name.lower():
            tests.append(
                TestCase(
                    id=f"{p_name}_type_y2038_overflow",
                    target_param=p_name,
                    category=Category.TYPE_FUZZ,
                    severity=Severity.HIGH,
                    title="Year 2038 32-Bit Signed Epoch Overflow (2038-01-19T03:14:08Z)",
                    payload="2038-01-19T03:14:08Z",
                    payload_display='"2038-01-19T03:14:08Z"',
                    expected_status="HTTP 200 OK / Correct 64-bit Timestamp",
                    expected_behavior="Correctly parsed without wrapping around to 1901.",
                    technical_rationale="32-bit signed timestamps wrap around to negative values on January 19, 2038.",
                    mitigation="Use 64-bit integer timestamps (BIGINT) or ISO 8601 strings.",
                )
            )

        return tests
