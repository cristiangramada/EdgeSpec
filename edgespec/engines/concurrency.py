"""
State, Concurrency & Business Logic Engine:
Tests race conditions, burst double-submissions, Idempotency-Key replay & collisions,
invalid state machine transitions, and single-use token burn.
"""

from typing import List
from edgespec.models import ExtractedParam, TestCase, Category, Severity


class ConcurrencyEngine:
    @classmethod
    def generate(cls, param: ExtractedParam) -> List[TestCase]:
        tests: List[TestCase] = []
        p_name = param.name

        # 1. Burst Double Submission / Race Condition
        tests.append(
            TestCase(
                id=f"{p_name}_conc_burst_double_submit",
                target_param=p_name,
                category=Category.CONCURRENCY,
                severity=Severity.CRITICAL,
                title="Burst Double Submission (Simultaneous Requests within 5ms)",
                payload={"concurrent_requests": 2, "interval_ms": 2},
                payload_display="[2 identical requests sent simultaneously in 2ms delta]",
                expected_status="1st Request: HTTP 200 OK | 2nd Request: HTTP 409 Conflict / 429",
                expected_behavior="Only one request commits. Database row lock or distributed mutex prevents double-spend.",
                technical_rationale="TOCTOU (Time-of-check to time-of-use). Catches inventory depletion or account overdraft exploits.",
                mitigation="Use Redis distributed lock (`Redlock`) or database SELECT ... FOR UPDATE pessimistic locking.",
            )
        )

        # 2. Idempotency Key Replay
        tests.append(
            TestCase(
                id=f"{p_name}_conc_idempotency_replay",
                target_param=p_name,
                category=Category.CONCURRENCY,
                severity=Severity.HIGH,
                title="Idempotency-Key Replay with Identical Payload",
                payload={"header": "Idempotency-Key: 7b89f2a0-4665-4f3b-8581-8d264259b589", "replay": True},
                payload_display='Idempotency-Key: "7b89f2a0-4665-4f3b-8581-8d264259b589"',
                expected_status="HTTP 200 OK (Cached Response)",
                expected_behavior="Returns exact original response without re-triggering side effects (no duplicate email or charge).",
                technical_rationale="Guarantees safe network retries over transient connection drops.",
                mitigation="Store idempotency key execution status and cached response payload in Redis with TTL.",
            )
        )

        # 3. Idempotency Key Collision with Altered Payload
        tests.append(
            TestCase(
                id=f"{p_name}_conc_idempotency_payload_mismatch",
                target_param=p_name,
                category=Category.CONCURRENCY,
                severity=Severity.HIGH,
                title="Idempotency-Key Collision with Mutated Payload",
                payload={"header": "Idempotency-Key: 7b89f2a0-4665-4f3b-8581-8d264259b589", "mutated_field": True},
                payload_display='Same Idempotency-Key + Altered Amount / Recipient',
                expected_status="HTTP 409 Conflict",
                expected_behavior="Rejected with conflict error indicating key reuse with differing request parameters.",
                technical_rationale="Prevents attackers from intercepting and altering existing in-flight operations.",
                mitigation="Store a cryptographic SHA-256 hash of the initial request body alongside the idempotency key.",
            )
        )

        # 4. Out-of-Order Lifecycle State Transition
        tests.append(
            TestCase(
                id=f"{p_name}_conc_invalid_state_transition",
                target_param=p_name,
                category=Category.CONCURRENCY,
                severity=Severity.MEDIUM,
                title="Out-of-Order State Machine Mutation (e.g. CANCELLED -> COMPLETED)",
                payload={"target_state": "COMPLETED", "current_state": "CANCELLED"},
                payload_display='Transition state: "CANCELLED" -> "COMPLETED"',
                expected_status="HTTP 409 Conflict / 422 Unprocessable Entity",
                expected_behavior="Rejected with invalid state transition error.",
                technical_rationale="Ensures business workflow invariants cannot be bypassed by delayed event queues.",
                mitigation="Model state transitions explicitly with finite state machine (FSM) guards.",
            )
        )

        return tests
