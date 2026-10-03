# EdgeSpec

EdgeSpec is a deterministic, rule-based test-design assistant. It turns lightweight software specifications into a reviewable matrix of boundary cases, malformed inputs, selected security payloads, and request-level concurrency scenarios.

The project includes a local React dashboard and a standalone Python CLI. It does not use a language model, send specifications to a server, scan source code, or claim to prove that an application is secure.

## What it does

EdgeSpec accepts four lightweight input styles:

- User stories and acceptance criteria recognized through documented keyword heuristics
- Gherkin scenarios containing common checkout concepts
- A useful subset of flat JSON Schema properties and constraints
- Structured API notes with parameter bullets such as `- age: integer (min: 18, max: 65)`

It then suggests cases from four categories:

- **Boundary:** exact limits, just outside limits, zero, negative values, numeric overflow, and oversized strings or files
- **Type and format:** null, omitted values, type coercion, malformed email addresses, Unicode edge cases, and date overflow
- **Security payloads:** selected SQL injection, XSS, path traversal, SSRF, and mass-assignment review inputs
- **Concurrency and state:** double submission, idempotency replay or collision, and invalid state transitions

Every case includes a target parameter, payload, severity, expected outcome, rationale, and mitigation suggestion. These are test-design prompts: a developer or QA engineer must review them against the real application contract.

## Quick start

### Web dashboard

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Analysis happens locally in the browser.

### Python CLI

Python 3.10 or newer is recommended. The core CLI has no third-party runtime dependencies.

```bash
python cli.py --preset fintech_transfer
python cli.py --spec requirements.md --export json
python cli.py --text "Age must be between 18 and 65"
```

Available exports are `markdown`, `jira`, `pytest`, `vitest`, `curl`, and `json`.

### Generated API test starters

The Pytest and Vitest exports are deliberately configurable starters. They skip integration requests until `EDGESPEC_TARGET_URL` is set:

```bash
python -m pip install pytest requests
export EDGESPEC_TARGET_URL="http://localhost:8000/api/users"
pytest test_edgespec_generated.py
```

On PowerShell:

```powershell
$env:EDGESPEC_TARGET_URL = "http://localhost:8000/api/users"
pytest test_edgespec_generated.py
```

The starter assertion treats a server error (`5xx`) as a failure. Adapt request construction, authentication, and exact status assertions to the API under test before relying on the suite.

The cURL export dispatches the generated inputs to its configured URL and prints response codes. It does not decide whether application-specific behavior is correct.

## Development checks

```bash
# TypeScript typecheck and engine tests
npm test

# Production bundle
npm run build

# Python unit tests
python -m unittest discover tests -v
```

Parser fixtures in `tests/fixtures/parser_cases.json` are exercised by both runtimes to catch behavioral drift between the browser and CLI implementations.

## Architecture

```text
Specification text
       |
       v
Format detection and parameter extraction
       |
       +---- boundary rules
       +---- type/format rules
       +---- selected security payloads
       +---- request-level concurrency scenarios
       |
       v
Reviewable report and export adapters
```

The TypeScript implementation powers the browser without a backend. The Python implementation powers the standalone CLI. They are intentionally independent entry points, with shared parser fixtures providing parity checks for supported inputs.

Key locations:

```text
src/engine/                 TypeScript parser, generators, and exporters
src/components/             React dashboard
edgespec/                   Python parser and generators
edgespec/exporters/         Python export adapters
tests/                      Python tests and shared fixtures
tests-ts/                   TypeScript engine tests
cli.py                      Python command-line entry point
```

## Supported parsing scope

EdgeSpec uses explicit heuristics rather than general natural-language understanding.

The JSON Schema parser supports top-level `properties`, `required`, primitive `type`, `format`, `minimum`, `maximum`, `minLength`, `maxLength`, and `enum`. It does not currently resolve `$ref`, compositions such as `oneOf`, conditional schemas, nested objects, or the complete JSON Schema specification.

Structured API notes are not an OpenAPI parser. They recognize an HTTP method/path plus bullet parameters in EdgeSpec's documented notation. Gherkin and user-story support similarly focus on a small set of common terms.

When nothing recognizable is found, EdgeSpec creates a generic `inputPayload` string parameter so the result remains reviewable rather than silently empty.

## Security scope

Security cases are a curated payload library for test planning. They cover selected vulnerability classes that map to several OWASP categories, but they are not complete OWASP Top 10 coverage and are not evidence of a vulnerability.

Only run generated payloads against systems you own or are explicitly authorized to test.

## Built-in examples

- Fintech external transfer user story
- Avatar upload structured API notes
- Coupon request JSON Schema
- Checkout Gherkin scenario

## License

MIT. See [LICENSE](LICENSE).
