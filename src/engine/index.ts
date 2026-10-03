import type { AnalysisReport, Category, TestCase } from '../types.ts';
import { parseSpec } from './parser.ts';
import { generateBoundaryTests } from './boundary.ts';
import { generateTypeFuzzTests } from './typeFuzzer.ts';
import { generateSecurityTests } from './security.ts';
import { generateConcurrencyTests } from './concurrency.ts';

export function runEdgeSpecAnalysis(
  rawText: string,
  enabledCategories: Category[] = ['boundary', 'type_fuzz', 'security', 'concurrency']
): AnalysisReport {
  const { format, parameters } = parseSpec(rawText);
  const testCases: TestCase[] = [];
  const catSet = new Set(enabledCategories);

  for (const param of parameters) {
    if (catSet.has('boundary')) {
      testCases.push(...generateBoundaryTests(param));
    }
    if (catSet.has('type_fuzz')) {
      testCases.push(...generateTypeFuzzTests(param));
    }
    if (catSet.has('security')) {
      testCases.push(...generateSecurityTests(param));
    }
  }

  // Concurrency scenarios describe request-level behavior, not field-level
  // validation. Generate them once and attach them to the most relevant field.
  if (catSet.has('concurrency')) {
    const concurrencyTarget =
      parameters.find((param) => param.name.toLowerCase().includes('idempotency')) ??
      parameters[0];
    if (concurrencyTarget) {
      testCases.push(...generateConcurrencyTests(concurrencyTarget));
    }
  }

  const critical = testCases.filter((tc) => tc.severity === 'critical').length;
  const high = testCases.filter((tc) => tc.severity === 'high').length;
  const medium = testCases.filter((tc) => tc.severity === 'medium').length;
  const low = testCases.filter((tc) => tc.severity === 'low').length;

  return {
    formatDetected: format,
    parameters,
    testCases,
    metrics: {
      totalTestCases: testCases.length,
      parametersDetected: parameters.length,
      criticalSeverity: critical,
      highSeverity: high,
      mediumSeverity: medium,
      lowSeverity: low,
      categoriesActive: enabledCategories,
    },
  };
}
