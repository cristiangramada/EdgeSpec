"""
Boundary Conditions Engine:
Fenceposts, off-by-one, INT32/INT64 overflow wrap, IEEE 754 precision, zero/negatives, buffer limits.
"""

from typing import List
from edgespec.models import ExtractedParam, TestCase, Category, Severity, ParamType


class BoundaryEngine:
    @classmethod
    def generate(cls, param: ExtractedParam) -> List[TestCase]:
        tests: List[TestCase] = []
        p_name = param.name
        p_type = param.param_type

        # 1. Numeric & Currency Boundary Conditions
        if p_type in [ParamType.INTEGER, ParamType.FLOAT, ParamType.CURRENCY]:
            min_val = param.min_value if param.min_value is not None else 0.0
            max_val = param.max_value if param.max_value is not None else 10000.0

            # Step resolution
            step = 1.0 if p_type == ParamType.INTEGER else 0.01

            # Exact Minimum
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_min_exact",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.LOW,
                    title=f"Exact Lower Bound Value ({min_val})",
                    payload=min_val,
                    payload_display=str(min_val),
                    expected_status="HTTP 200 OK / Accepted",
                    expected_behavior="Request processed successfully at exact lower threshold.",
                    technical_rationale="Verifies inclusive minimum fencepost condition (>= min).",
                    mitigation="Ensure inequality check is inclusive (`>=`) rather than strict (`>`).",
                )
            )

            # Off-by-one Below Min
            val_below = round(min_val - step, 4)
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_min_minus_step",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.HIGH,
                    title=f"Off-By-One Below Lower Bound ({val_below})",
                    payload=val_below,
                    payload_display=str(val_below),
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected with field validation error indicating value below minimum.",
                    technical_rationale="Catches fencepost errors where developer omitted lower bound clamp.",
                    mitigation="Validate min parameter in DTO before executing service logic.",
                )
            )

            # Exact Maximum
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_max_exact",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.LOW,
                    title=f"Exact Upper Bound Value ({max_val})",
                    payload=max_val,
                    payload_display=str(max_val),
                    expected_status="HTTP 200 OK / Accepted",
                    expected_behavior="Request processed successfully at exact upper threshold.",
                    technical_rationale="Verifies inclusive maximum fencepost condition (<= max).",
                    mitigation="Verify upper boundary check allows exact maximum limit.",
                )
            )

            # Off-by-one Above Max
            val_above = round(max_val + step, 4)
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_max_plus_step",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.HIGH,
                    title=f"Off-By-One Above Upper Bound ({val_above})",
                    payload=val_above,
                    payload_display=str(val_above),
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected with validation error indicating limit exceeded.",
                    technical_rationale="Catches fencepost errors where developer used strict inequality (`<` vs `<=`).",
                    mitigation="Enforce strict `<` or `<=` validation bounds.",
                )
            )

            # Zero Value
            if min_val > 0:
                tests.append(
                    TestCase(
                        id=f"{p_name}_boundary_exact_zero",
                        target_param=p_name,
                        category=Category.BOUNDARY,
                        severity=Severity.HIGH,
                        title="Exact Zero Input (0 / 0.00)",
                        payload=0,
                        payload_display="0",
                        expected_status="HTTP 422 Unprocessable Entity",
                        expected_behavior="Rejection of zero-value transaction or counter.",
                        technical_rationale="Zero can cause division by zero, free-order exploit, or bypass fee calculations.",
                        mitigation="Disallow 0 unless explicitly permitted by product specification.",
                    )
                )

            # Negative Value
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_negative_value",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.CRITICAL,
                    title="Negative Value Injection (-1.00)",
                    payload=-1.0,
                    payload_display="-1.00",
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected immediately. System must not invert subtraction into addition.",
                    technical_rationale="Negative amounts in payment/inventory systems allow reverse transfers or credit duplication.",
                    mitigation="Enforce `value > 0` validation at controller and database constraint level.",
                )
            )

            # 32-bit Integer Overflow
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_int32_overflow",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.CRITICAL,
                    title="Signed 32-Bit Integer Overflow (2,147,483,648)",
                    payload=2147483648,
                    payload_display="2147483648 (INT32_MAX + 1)",
                    expected_status="HTTP 422 / HTTP 400 Bad Request",
                    expected_behavior="Rejected before casting to underlying 32-bit column type.",
                    technical_rationale="In C/Java/Postgres INT4, 2147483648 wraps around to -2147483648 arithmetic overflow.",
                    mitigation="Use BIGINT/NUMERIC types or validate integer bounds prior to persistence.",
                )
            )

            # Float precision traps
            if p_type in [ParamType.FLOAT, ParamType.CURRENCY]:
                tests.append(
                    TestCase(
                        id=f"{p_name}_boundary_float_epsilon",
                        target_param=p_name,
                        category=Category.BOUNDARY,
                        severity=Severity.MEDIUM,
                        title="Sub-Cent Micro-Epsilon Precision (0.0000001)",
                        payload=0.0000001,
                        payload_display="0.0000001",
                        expected_status="HTTP 422 Unprocessable Entity",
                        expected_behavior="Rejected or normalized according to standard currency decimal places.",
                        technical_rationale="Sub-cent precision can lead to 'salami slicing' rounding exploits across transactions.",
                        mitigation="Store currency amounts as integer cents or use Decimal/BigDecimal classes.",
                    )
                )

        # 2. String & Text Boundaries
        elif p_type in [ParamType.STRING, ParamType.EMAIL, ParamType.UUID]:
            min_l = param.min_length if param.min_length is not None else 1
            max_l = param.max_length if param.max_length is not None else 255

            # Empty String
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_empty_string",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.HIGH if param.required else Severity.LOW,
                    title="Empty String (Length = 0)",
                    payload="",
                    payload_display='"" (0 characters)',
                    expected_status="HTTP 422 Unprocessable Entity" if param.required else "HTTP 200 OK",
                    expected_behavior="Rejected as missing required input, or accepted as empty optional value.",
                    technical_rationale="Tests whether empty strings bypass presence checks (`len == 0` vs null).",
                    mitigation="Use `.trim().length > 0` validation on required string inputs.",
                )
            )

            # Max Length + 1
            overflow_str = "A" * (max_l + 1)
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_max_length_plus_one",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.HIGH,
                    title=f"Buffer Overflow Beyond Max Length ({max_l + 1} chars)",
                    payload=overflow_str,
                    payload_display=f"\"{'A' * 15}...\" ({max_l + 1} characters)",
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected with error message indicating string length limit exceeded.",
                    technical_rationale="Prevents database column truncation errors (VARCHAR limit overflow) and UI layout breakage.",
                    mitigation="Enforce `@Size(max = ...)` or schema maxLength constraints.",
                )
            )

            # Extreme 10KB string payload (DOS vector)
            dos_str = "X" * 10000
            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_dos_string",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.MEDIUM,
                    title="Large String DOS Payload (10,000 characters)",
                    payload=dos_str,
                    payload_display="\"XXX...\" (10,000 characters)",
                    expected_status="HTTP 413 Payload Too Large / HTTP 422",
                    expected_behavior="Gracefully rejected without CPU spike or regex catastrophic backtracking.",
                    technical_rationale="Checks memory allocation limits and shields regex engines against ReDoS.",
                    mitigation="Set reverse proxy body size limits and input character length ceilings.",
                )
            )

        # 3. File Upload Boundaries
        elif p_type == ParamType.FILE:
            max_b = param.max_file_size_bytes or 5242880  # Default 5MB

            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_empty_file",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.MEDIUM,
                    title="0-Byte Empty File Upload",
                    payload={"filename": "empty.png", "bytes": 0},
                    payload_display="[Empty File 0 bytes]",
                    expected_status="HTTP 400 Bad Request / HTTP 422",
                    expected_behavior="Rejected as corrupt or unreadable image stream.",
                    technical_rationale="Empty files often crash image decoders with EOF or unhandled NullPointerExceptions.",
                    mitigation="Check `file.size > 0` before passing to graphics decoders.",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_boundary_file_size_overflow",
                    target_param=p_name,
                    category=Category.BOUNDARY,
                    severity=Severity.HIGH,
                    title=f"File Size Limit Overflow ({max_b + 1} bytes)",
                    payload={"filename": "large.png", "bytes": max_b + 1},
                    payload_display=f"[Binary stream of {max_b + 1} bytes]",
                    expected_status="HTTP 413 Payload Too Large",
                    expected_behavior="Rejected immediately before storing or buffering full payload in memory.",
                    technical_rationale="Exceeds maximum allowable upload quota; verifies stream termination.",
                    mitigation="Enforce stream-level byte quota counters at the reverse-proxy layer.",
                )
            )

        return tests
