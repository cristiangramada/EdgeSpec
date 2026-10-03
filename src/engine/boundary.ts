import type { ExtractedParam, TestCase } from '../types.ts';

export function generateBoundaryTests(param: ExtractedParam): TestCase[] {
  const tests: TestCase[] = [];
  const pName = param.name;
  const pType = param.paramType;

  // Numeric & Currency
  if (pType === 'integer' || pType === 'float' || pType === 'currency') {
    const minVal = param.minValue !== undefined ? param.minValue : 0.0;
    const maxVal = param.maxValue !== undefined ? param.maxValue : 10000.0;
    const step = pType === 'integer' ? 1.0 : 0.01;

    tests.push({
      id: `${pName}_boundary_min_exact`,
      targetParam: pName,
      category: 'boundary',
      severity: 'low',
      title: `Exact Lower Bound Value (${minVal})`,
      payload: minVal,
      payloadDisplay: String(minVal),
      expectedStatus: 'HTTP 200 OK / Accepted',
      expectedBehavior: 'Request processed successfully at exact lower threshold.',
      technicalRationale: 'Verifies inclusive minimum fencepost condition (>= min).',
      mitigation: 'Ensure inequality check is inclusive (>=) rather than strict (>).',
    });

    const valBelow = Number((minVal - step).toFixed(4));
    tests.push({
      id: `${pName}_boundary_min_minus_step`,
      targetParam: pName,
      category: 'boundary',
      severity: 'high',
      title: `Off-By-One Below Lower Bound (${valBelow})`,
      payload: valBelow,
      payloadDisplay: String(valBelow),
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected with field validation error indicating value below minimum.',
      technicalRationale: 'Catches fencepost errors where developer omitted lower bound clamp.',
      mitigation: 'Validate min parameter in DTO before executing service logic.',
    });

    tests.push({
      id: `${pName}_boundary_max_exact`,
      targetParam: pName,
      category: 'boundary',
      severity: 'low',
      title: `Exact Upper Bound Value (${maxVal})`,
      payload: maxVal,
      payloadDisplay: String(maxVal),
      expectedStatus: 'HTTP 200 OK / Accepted',
      expectedBehavior: 'Request processed successfully at exact upper threshold.',
      technicalRationale: 'Verifies inclusive maximum fencepost condition (<= max).',
      mitigation: 'Verify upper boundary check allows exact maximum limit.',
    });

    const valAbove = Number((maxVal + step).toFixed(4));
    tests.push({
      id: `${pName}_boundary_max_plus_step`,
      targetParam: pName,
      category: 'boundary',
      severity: 'high',
      title: `Off-By-One Above Upper Bound (${valAbove})`,
      payload: valAbove,
      payloadDisplay: String(valAbove),
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected with validation error indicating limit exceeded.',
      technicalRationale: 'Catches fencepost errors where developer used strict inequality (< vs <=).',
      mitigation: 'Enforce strict < or <= validation bounds.',
    });

    if (minVal > 0) {
      tests.push({
        id: `${pName}_boundary_exact_zero`,
        targetParam: pName,
        category: 'boundary',
        severity: 'high',
        title: 'Exact Zero Input (0 / 0.00)',
        payload: 0,
        payloadDisplay: '0',
        expectedStatus: 'HTTP 422 Unprocessable Entity',
        expectedBehavior: 'Rejection of zero-value transaction or counter.',
        technicalRationale: 'Zero can cause division by zero, free-order exploit, or bypass fee calculations.',
        mitigation: 'Disallow 0 unless explicitly permitted by product specification.',
      });
    }

    tests.push({
      id: `${pName}_boundary_negative_value`,
      targetParam: pName,
      category: 'boundary',
      severity: 'critical',
      title: 'Negative Value Injection (-1.00)',
      payload: -1.0,
      payloadDisplay: '-1.00',
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected immediately. System must not invert subtraction into addition.',
      technicalRationale: 'Negative amounts in payment/inventory systems allow reverse transfers or credit duplication.',
      mitigation: 'Enforce value > 0 validation at controller and database constraint level.',
    });

    tests.push({
      id: `${pName}_boundary_int32_overflow`,
      targetParam: pName,
      category: 'boundary',
      severity: 'critical',
      title: 'Signed 32-Bit Integer Overflow (2,147,483,648)',
      payload: 2147483648,
      payloadDisplay: '2147483648 (INT32_MAX + 1)',
      expectedStatus: 'HTTP 422 / HTTP 400 Bad Request',
      expectedBehavior: 'Rejected before casting to underlying 32-bit column type.',
      technicalRationale: 'In C/Java/Postgres INT4, 2147483648 wraps around to -2147483648 arithmetic overflow.',
      mitigation: 'Use BIGINT/NUMERIC types or validate integer bounds prior to persistence.',
    });

    if (pType === 'float' || pType === 'currency') {
      tests.push({
        id: `${pName}_boundary_float_epsilon`,
        targetParam: pName,
        category: 'boundary',
        severity: 'medium',
        title: 'Sub-Cent Micro-Epsilon Precision (0.0000001)',
        payload: 0.0000001,
        payloadDisplay: '0.0000001',
        expectedStatus: 'HTTP 422 Unprocessable Entity',
        expectedBehavior: 'Rejected or normalized according to standard currency decimal places.',
        technicalRationale: 'Sub-cent precision can lead to "salami slicing" rounding exploits across transactions.',
        mitigation: 'Store currency amounts as integer cents or use Decimal/BigDecimal classes.',
      });
    }
  } else if (pType === 'string' || pType === 'email' || pType === 'uuid') {
    const maxL = param.maxLength || 255;

    tests.push({
      id: `${pName}_boundary_empty_string`,
      targetParam: pName,
      category: 'boundary',
      severity: param.required ? 'high' : 'low',
      title: 'Empty String (Length = 0)',
      payload: '',
      payloadDisplay: '"" (0 characters)',
      expectedStatus: param.required ? 'HTTP 422 Unprocessable Entity' : 'HTTP 200 OK',
      expectedBehavior: 'Rejected as missing required input, or accepted as empty optional value.',
      technicalRationale: 'Tests whether empty strings bypass presence checks (len == 0 vs null).',
      mitigation: 'Use .trim().length > 0 validation on required string inputs.',
    });

    const overflowStr = 'A'.repeat(maxL + 1);
    tests.push({
      id: `${pName}_boundary_max_length_plus_one`,
      targetParam: pName,
      category: 'boundary',
      severity: 'high',
      title: `Buffer Overflow Beyond Max Length (${maxL + 1} chars)`,
      payload: overflowStr,
      payloadDisplay: `"AAAAAAAAAAAAAAA..." (${maxL + 1} characters)`,
      expectedStatus: 'HTTP 422 Unprocessable Entity',
      expectedBehavior: 'Rejected with error message indicating string length limit exceeded.',
      technicalRationale: 'Prevents database column truncation errors (VARCHAR limit overflow) and UI layout breakage.',
      mitigation: 'Enforce @Size(max = ...) or schema maxLength constraints.',
    });

    tests.push({
      id: `${pName}_boundary_dos_string`,
      targetParam: pName,
      category: 'boundary',
      severity: 'medium',
      title: 'Large String DOS Payload (10,000 characters)',
      payload: 'X'.repeat(10000),
      payloadDisplay: '"XXX..." (10,000 characters)',
      expectedStatus: 'HTTP 413 Payload Too Large / HTTP 422',
      expectedBehavior: 'Gracefully rejected without CPU spike or regex catastrophic backtracking.',
      technicalRationale: 'Checks memory allocation limits and shields regex engines against ReDoS.',
      mitigation: 'Set reverse proxy body size limits and input character length ceilings.',
    });
  } else if (pType === 'file') {
    const maxB = param.maxFileSizeBytes || 5242880;

    tests.push({
      id: `${pName}_boundary_empty_file`,
      targetParam: pName,
      category: 'boundary',
      severity: 'medium',
      title: '0-Byte Empty File Upload',
      payload: { filename: 'empty.png', bytes: 0 },
      payloadDisplay: '[Empty File 0 bytes]',
      expectedStatus: 'HTTP 400 Bad Request / HTTP 422',
      expectedBehavior: 'Rejected as corrupt or unreadable image stream.',
      technicalRationale: 'Empty files often crash image decoders with EOF or unhandled NullPointerExceptions.',
      mitigation: 'Check file.size > 0 before passing to graphics decoders.',
    });

    tests.push({
      id: `${pName}_boundary_file_size_overflow`,
      targetParam: pName,
      category: 'boundary',
      severity: 'high',
      title: `File Size Limit Overflow (${maxB + 1} bytes)`,
      payload: { filename: 'large.png', bytes: maxB + 1 },
      payloadDisplay: `[Binary stream of ${maxB + 1} bytes]`,
      expectedStatus: 'HTTP 413 Payload Too Large',
      expectedBehavior: 'Rejected immediately before storing or buffering full payload in memory.',
      technicalRationale: 'Exceeds maximum allowable upload quota; verifies stream termination.',
      mitigation: 'Enforce stream-level byte quota counters at the reverse-proxy layer.',
    });
  }

  return tests;
}
