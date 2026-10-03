import type { ExtractedParam, TestCase } from '../types.ts';

export function generateConcurrencyTests(param: ExtractedParam): TestCase[] {
  const tests: TestCase[] = [];
  const pName = param.name;

  tests.push({
    id: `${pName}_conc_burst_double_submit`,
    targetParam: pName,
    category: 'concurrency',
    severity: 'critical',
    title: 'Burst Double Submission (Simultaneous Requests within 5ms)',
    payload: { concurrent_requests: 2, interval_ms: 2 },
    payloadDisplay: '[2 identical requests sent simultaneously in 2ms delta]',
    expectedStatus: '1st: HTTP 200 OK | 2nd: HTTP 409 Conflict / 429',
    expectedBehavior: 'Only one request commits. Database row lock or distributed mutex prevents double-spend.',
    technicalRationale: 'TOCTOU race condition. Catches inventory depletion or account overdraft exploits.',
    mitigation: 'Use Redis distributed lock (Redlock) or database SELECT ... FOR UPDATE pessimistic locking.',
  });

  tests.push({
    id: `${pName}_conc_idempotency_replay`,
    targetParam: pName,
    category: 'concurrency',
    severity: 'high',
    title: 'Idempotency-Key Replay with Identical Payload',
    payload: { header: 'Idempotency-Key: 7b89f2a0-4665-4f3b-8581-8d264259b589', replay: true },
    payloadDisplay: 'Idempotency-Key: "7b89f2a0-4665-4f3b-8581-8d264259b589"',
    expectedStatus: 'HTTP 200 OK (Cached Response)',
    expectedBehavior: 'Returns exact original response without re-triggering side effects (no duplicate email or charge).',
    technicalRationale: 'Guarantees safe network retries over transient connection drops.',
    mitigation: 'Store idempotency key execution status and cached response payload in Redis with TTL.',
  });

  tests.push({
    id: `${pName}_conc_idempotency_payload_mismatch`,
    targetParam: pName,
    category: 'concurrency',
    severity: 'high',
    title: 'Idempotency-Key Collision with Mutated Payload',
    payload: { header: 'Idempotency-Key: 7b89f2a0-4665-4f3b-8581-8d264259b589', mutated_field: true },
    payloadDisplay: 'Same Idempotency-Key + Altered Amount / Recipient',
    expectedStatus: 'HTTP 409 Conflict',
    expectedBehavior: 'Rejected with conflict error indicating key reuse with differing request parameters.',
    technicalRationale: 'Prevents attackers from intercepting and altering existing in-flight operations.',
    mitigation: 'Store a cryptographic SHA-256 hash of the initial request body alongside the idempotency key.',
  });

  tests.push({
    id: `${pName}_conc_invalid_state_transition`,
    targetParam: pName,
    category: 'concurrency',
    severity: 'medium',
    title: 'Out-of-Order State Machine Mutation (e.g. CANCELLED -> COMPLETED)',
    payload: { target_state: 'COMPLETED', current_state: 'CANCELLED' },
    payloadDisplay: 'Transition state: "CANCELLED" -> "COMPLETED"',
    expectedStatus: 'HTTP 409 Conflict / 422 Unprocessable Entity',
    expectedBehavior: 'Rejected with invalid state transition error.',
    technicalRationale: 'Ensures business workflow invariants cannot be bypassed by delayed event queues.',
    mitigation: 'Model state transitions explicitly with finite state machine (FSM) guards.',
  });

  return tests;
}
