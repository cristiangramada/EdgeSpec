import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { runEdgeSpecAnalysis } from '../src/engine/index.ts';
import { parseSpec } from '../src/engine/parser.ts';
import { exportToPytest, exportToVitest } from '../src/engine/exporters.ts';

interface ParserFixture {
  name: string;
  input: string;
  format: string;
  parameters: string[];
}

const fixtures = JSON.parse(
  readFileSync(new URL('../tests/fixtures/parser_cases.json', import.meta.url), 'utf8')
) as ParserFixture[];

for (const fixture of fixtures) {
  test(`parser parity fixture: ${fixture.name}`, () => {
    const result = parseSpec(fixture.input);
    assert.equal(result.format, fixture.format);
    assert.deepEqual(
      result.parameters.map((parameter) => parameter.name),
      fixture.parameters
    );
  });
}

test('concurrency scenarios are generated once per report', () => {
  const report = runEdgeSpecAnalysis(fixtures[0].input, ['concurrency']);
  assert.equal(report.testCases.length, 4);
  assert.ok(report.testCases.every((testCase) => testCase.category === 'concurrency'));
});

test('category selection limits generated cases', () => {
  const report = runEdgeSpecAnalysis(fixtures[0].input, ['boundary']);
  assert.ok(report.testCases.length > 0);
  assert.ok(report.testCases.every((testCase) => testCase.category === 'boundary'));
});

test('generated API starters are syntactically structured and opt-in', () => {
  const report = runEdgeSpecAnalysis(fixtures[0].input);
  const pytestSource = exportToPytest(report);
  const vitestSource = exportToVitest(report);

  assert.match(pytestSource, /TEST_CASES = json\.loads/);
  assert.match(pytestSource, /EDGESPEC_TARGET_URL/);
  assert.match(vitestSource, /import \{ describe, test, expect \} from 'vitest'/);
  assert.match(vitestSource, /test\.skip/);
});
