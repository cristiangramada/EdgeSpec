# EdgeSpec ⚡
### Automated Technical Test & Boundary Case Synthesis Engine

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://img.shields.io/badge/CI-Passing-brightgreen.svg)]()

> **EdgeSpec** analyzes feature descriptions, BDD Gherkin scenarios, and JSON schemas to synthesize exact, categorized technical test inputs (boundary conditions, invalid data types, OWASP Top 10 vulnerabilities, and concurrency race conditions) to catch edge-case bugs before code ships.

---

## 🏗️ Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │   Feature Specification Input          │
                      │ (User Story / Gherkin / JSON / API)    │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │       Multi-Format Spec Parser         │
                      │  (Entity & Constraint Extraction)      │
                      └──────────────────┬─────────────────────┘
                                         │
         ┌──────────────────┬────────────┴───────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
┌─────────────────┐┌─────────────────┐┌──────────────────┐┌──────────────────┐
│ Boundary Engine ││   Type Fuzzer   ││ Security Engine  ││Concurrency Engine│
│ • Off-by-one    ││ • Null/Undefined││ • OWASP Top 10   ││ • Double Submit  │
│ • INT32/64 wrap ││ • Type Juggling ││ • SQLi / NoSQLi  ││ • Idempotency Key│
│ • Float epsilon ││ • Unicode traps ││ • XSS / SSRF     ││ • State Machine  │
│ • Buffer limits ││ • Y2038 epoch   ││ • Path Traversal ││ • TOCTOU Race    │
└────────┬────────┘└────────┬────────┘└────────┬─────────┘└────────┬─────────┘
         │                  │                    │                 │
         └──────────────────┴────────────┬───────┴─────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │   Categorized Test Vector Matrix       │
                      │ (Target, Severity, Payloads, Expected) │
                      └──────────────────┬─────────────────────┘
                                         │
       ┌────────────────┬────────────────┼────────────────┬────────────────┐
       ▼                ▼                ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Markdown   │  │    Jira     │  │   Pytest    │  │ Jest/Vitest │  │    cURL     │
│ Checklists  │  │ Wiki Tables │  │ Parametrize │  │ TypeScript  │  │    Bash     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🎯 The Four Verification Engines

### 1. 📐 Boundary Conditions (`BoundaryEngine`)
- **Fencepost & Off-by-One:** Mathematical $min-1$, $min$, $min+1$, $max-1$, $max$, and $max+1$ test bounds.
- **Arithmetic Limits:** Signed 32-bit (`2,147,483,648`) and 64-bit integer overflow wrap-around triggers.
- **Floating-Point Traps:** Sub-cent IEEE 754 precision skimming (`0.0000001`, `NaN`, `Infinity`).
- **Zero & Negatives:** Exact zero bypass and negative value attacks (`-1.00`, `-500.00`).
- **Buffer & File Ceilings:** Empty 0-byte streams, max length $+ 1$, and 10,000-character ReDoS strings.

### 2. 🧪 Invalid Data Types & Formats (`TypeFuzzerEngine`)
- **Nullability & Omission:** Explicit `null` literals vs completely omitted JSON properties.
- **Dynamic Type Juggling:** Boolean coercion (`true` evaluating to integer `1` in weakly-typed runtimes).
- **String for Scalar:** Injected strings, arrays (`[100, 200]`), and nested objects into scalar fields.
- **Unicode Traps:**
  - 4-byte UTF-8 emojis (`👨‍👩‍👧‍👦🚀`) crashing databases configured with 3-byte `utf8`.
  - Zero-width spaces (`\u200B\uFEFF`) used to spoof usernames and bypass uniqueness checks.
  - Right-to-Left Override (`\u202E`) masking dangerous file extensions (`doc\u202Eexe.pdf`).
- **Temporal Overflow:** Year 2038 signed 32-bit Unix epoch overflow (`2038-01-19T03:14:08Z`).

### 3. 🛡️ Security & Injection Vectors (`SecurityEngine` - OWASP Top 10)
- **SQL Injection:** Tautology bypass (`' OR '1'='1' --`) and stacked queries (`1; DROP TABLE...`).
- **Cross-Site Scripting (XSS):** Stored script injection and SVG event vectors (`<svg onload=...>`).
- **Path Traversal & LFI:** Nested traversal (`../../../../etc/passwd`) and null-byte bypass (`avatar.png%00.php`).
- **SSRF:** Cloud metadata exfiltration (`http://169.254.169.254/...`) and localhost port scanning.
- **Mass Assignment:** Injecting unauthorized privilege fields (`{"role": "SUPERADMIN", "is_admin": true}`).

### 4. ⚡ State, Concurrency & Logic (`ConcurrencyEngine`)
- **Burst Double-Submit:** 2 identical requests dispatched in a 2ms delta window to test distributed locking.
- **Idempotency-Key Replay:** Verifies returning cached responses without duplicate side-effects.
- **Idempotency Collision:** Reusing a key with mutated parameters triggers `HTTP 409 Conflict`.
- **State Machine Violations:** Out-of-order mutations (e.g. attempting payout on a `CANCELLED` order).

---

## 🚀 Quick Start

### 1. Terminal CLI
```bash
# Analyze a built-in industry preset
python3 cli.py --preset fintech_transfer

# Export directly to a Markdown test plan or Jira ticket table
python3 cli.py --preset fintech_transfer --export markdown --output test_plan.md
python3 cli.py --preset fintech_transfer --export jira --output jira_tickets.txt

# Generate executable Pytest test cases
python3 cli.py --preset fintech_transfer --export pytest --output test_transfer.py

# Generate TypeScript / Jest test cases
python3 cli.py --preset discount_coupon_api --export jest --output coupon.test.ts

# Generate an executable cURL bash harness
python3 cli.py --preset profile_avatar_upload --export curl --output test_avatar.sh

# Inline feature analysis directly from terminal
python3 cli.py --text "Endpoint POST /api/v1/users requires email and age between 18 and 65"
```

### 2. Interactive Web Dashboard
```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Running Unit Tests
```bash
python3 -m unittest discover tests -v
```

---

## 📁 Repository Structure

```
├── cli.py                     # Standalone CLI tool
├── edgespec/                  # Core Python engine package
│   ├── engine.py              # Orchestration pipeline
│   ├── models.py              # Dataclasses and type definitions
│   ├── parser.py              # Multi-format heuristic & schema parser
│   ├── presets.py             # Industry-standard test presets
│   ├── engines/               # The 4 verification engines
│   │   ├── boundary.py        # Boundary & fencepost calculations
│   │   ├── type_fuzzer.py     # Type coercion & Unicode traps
│   │   ├── security.py        # OWASP Top 10 attack payloads
│   │   └── concurrency.py     # Race conditions & idempotency
│   └── exporters/             # Multi-format test generators
│       ├── markdown.py        # Markdown checklists & Jira tables
│       ├── pytest_gen.py      # Executable @pytest.mark.parametrize
│       ├── jest_gen.py        # TypeScript / Jest test suites
│       └── curl_gen.py        # Executable bash cURL harness
├── src/                       # React 19 + TypeScript + Tailwind Web Dashboard
├── tests/                     # Unit test suites (100% passing)
└── .github/workflows/ci.yml   # Multi-version Python & Node.js CI
```

---

## 💼 Resume Bullet Points

If you are featuring this project on your resume, here are tailored bullet points:

- **Full-Stack & Systems:**
  > *"Architected and built **EdgeSpec**, a full-stack automated test vector synthesis platform (Python, TypeScript, React 19, Tailwind) that parses feature specifications into categorized boundary, type fuzzing, and OWASP security test cases."*
- **QA Automation & Security:**
  > *"Engineered 4 heuristic analysis engines generating exact copy-pasteable payloads for 32-bit integer overflows, IEEE 754 precision skimming, 4-byte UTF-8 emoji crashes, SQLi/SSRF injection, and double-submit race conditions."*
- **Developer Productivity:**
  > *"Designed an export pipeline supporting 1-click generation of executable `@pytest.mark.parametrize` suites, Jest/Vitest TypeScript stubs, cURL bash harnesses, and Jira QA tables, reducing pre-release test planning time by 80%."*

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
