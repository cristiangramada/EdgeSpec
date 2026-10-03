import type { ExtractedParam, TestCase } from '../types.ts';

export function generateTypeFuzzTests(param: ExtractedParam): TestCase[] {
  const tests: TestCase[] = [];
  const pName = param.name;
  const pType = param.paramType;

  // 1. Explicit null
  tests.push({
    id: `${pName}_type_explicit_null`,
    targetParam: pName,
    category: 'type_fuzz',
    severity: param.required ? 'high' : 'low',
    title: 'Explicit Null Literal (null)',
    payload: null,
    payloadDisplay: 'null',
    expectedStatus: param.required ? 'HTTP 422 Unprocessable Entity' : 'HTTP 200 OK',
    expectedBehavior: 'Descriptive validation failure if field is required; no 500 NullPointerException.',
    technicalRationale: 'Verifies that database nullability constraints match API layer deserializer contracts.',
    mitigation: 'Mark field as non-nullable in schema and DTO validator.',
  });

  // 2. Omitted property
  tests.push({
    id: `${pName}_type_omitted_field`,
    targetParam: pName,
    category: 'type_fuzz',
    severity: param.required ? 'high' : 'low',
    title: 'Completely Omitted Property / Undefined',
    payload: '<OMITTED_PROPERTY>',
    payloadDisplay: '[Property key omitted from JSON body]',
    expectedStatus: param.required ? 'HTTP 422 Unprocessable Entity' : 'HTTP 200 OK',
    expectedBehavior: 'Identifies missing required property and responds with specific field error.',
    technicalRationale: 'Tests default value handling and prevents undefined index / key error panics.',
    mitigation: 'Validate schema required array before processing request body.',
  });

  // 3. Numeric type juggling
  if (pType === 'integer' || pType === 'float' || pType === 'currency') {
    tests.push({
      id: `${pName}_type_boolean_coercion`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'high',
      title: 'Boolean Coercion (true / false)',
      payload: true,
      payloadDisplay: 'true',
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Strict type validator rejects boolean value without evaluating `true == 1`.',
      technicalRationale: 'In weakly typed runtimes (PHP, JS, Python), `true` evaluates to integer `1`, causing unintended transactions.',
      mitigation: 'Use strict type assertion in deserializer.',
    });

    tests.push({
      id: `${pName}_type_string_for_number`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'medium',
      title: 'Alphabetical String for Numeric Field',
      payload: 'one_hundred',
      payloadDisplay: '"one_hundred"',
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected by deserializer with type mismatch error.',
      technicalRationale: 'Catches uncaught NumberFormatException or ValueError during string-to-number parsing.',
      mitigation: 'Validate numeric format before attempting parse.',
    });

    tests.push({
      id: `${pName}_type_array_for_scalar`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'high',
      title: 'Array Passed Instead of Primitive Number',
      payload: [100, 200],
      payloadDisplay: '[100, 200]',
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected as schema violation.',
      technicalRationale: 'Can cause unexpected ORM query modification or parameter pollution.',
      mitigation: 'Verify type schema strictly disallows array containers.',
    });
  }

  // 4. Email format violations
  if (pType === 'email' || pName.toLowerCase().includes('email')) {
    tests.push({
      id: `${pName}_type_malformed_email_no_domain`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'medium',
      title: 'Malformed Email Without TLD (user@localhost)',
      payload: 'user@localhost',
      payloadDisplay: '"user@localhost"',
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected as non-routable public email address.',
      technicalRationale: 'Prevents internal server routing or internal mail spoofing.',
      mitigation: 'Enforce FQDN domain validation with public suffix verification.',
    });

    tests.push({
      id: `${pName}_type_homograph_unicode_email`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'high',
      title: 'Cyrillic Homograph Unicode Spoof (аdmin@apple.com)',
      payload: 'аdmin@apple.com',
      payloadDisplay: '"\\u0430dmin@apple.com" (Cyrillic "а")',
      expectedStatus: 'HTTP 422 / Normalized Punycode',
      expectedBehavior: 'Either rejected or normalized to Punycode `xn--...` to prevent identity spoofing.',
      technicalRationale: 'Unicode homoglyphs appear identical to users but point to completely different accounts.',
      mitigation: 'Apply NFKC normalization or restrict allowable character scripts.',
    });
  }

  // 5. String traps (4-byte UTF-8, zero-width, RTLO)
  if (pType === 'string' || pType === 'email' || pType === 'uuid') {
    tests.push({
      id: `${pName}_type_utf8_4byte_emoji`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'high',
      title: '4-Byte UTF-8 Emoji (👨‍👩‍👧‍👦🚀)',
      payload: '👨‍👩‍👧‍👦🚀',
      payloadDisplay: '"👨‍👩‍👧‍👦🚀" (4-byte UTF-8 sequence)',
      expectedStatus: 'HTTP 200 OK / Graceful handling',
      expectedBehavior: 'Successfully stored without truncation or database character encoding crash.',
      technicalRationale: 'Crashes legacy MySQL databases configured with 3-byte `utf8` instead of `utf8mb4`.',
      mitigation: 'Ensure database collation is `utf8mb4_unicode_ci` and connection charset is `utf8mb4`.',
    });

    tests.push({
      id: `${pName}_type_zero_width_space`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'medium',
      title: 'Zero-Width Whitespace Characters (\\u200B\\uFEFF)',
      payload: 'test\u200b\ufeffuser',
      payloadDisplay: '"test\\u200B\\uFEFFuser"',
      expectedStatus: 'HTTP 422 or Sanitized Clean String',
      expectedBehavior: 'Invisible characters stripped or rejected during input sanitization.',
      technicalRationale: 'Invisible zero-width spaces allow duplicate visual usernames and bypass unique constraints.',
      mitigation: 'Strip invisible zero-width and format characters in string normalizer.',
    });

    tests.push({
      id: `${pName}_type_rtlo_spoof`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'high',
      title: 'Right-to-Left Override Character (\\u202E)',
      payload: 'document\u202Eexe.pdf',
      payloadDisplay: '"document\\u202Eexe.pdf"',
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected or RTLO control character stripped.',
      technicalRationale: 'RTLO reverses string rendering in browsers/OS, tricking users into running dangerous files.',
      mitigation: 'Reject or sanitize bidirectional control characters (U+202A to U+202E).',
    });
  }

  // 6. Y2038
  if (pType === 'date' || pName.toLowerCase().includes('date') || pName.toLowerCase().includes('time')) {
    tests.push({
      id: `${pName}_type_y2038_overflow`,
      targetParam: pName,
      category: 'type_fuzz',
      severity: 'high',
      title: 'Year 2038 32-Bit Signed Epoch Overflow (2038-01-19T03:14:08Z)',
      payload: '2038-01-19T03:14:08Z',
      payloadDisplay: '"2038-01-19T03:14:08Z"',
      expectedStatus: 'HTTP 200 OK / Correct 64-bit Timestamp',
      expectedBehavior: 'Correctly parsed without wrapping around to 1901.',
      technicalRationale: '32-bit signed timestamps wrap around to negative values on January 19, 2038.',
      mitigation: 'Use 64-bit integer timestamps (BIGINT) or ISO 8601 strings.',
    });
  }

  return tests;
}
