import { AnalysisReport, Category, TestCase } from '../types';
import { parseSpec } from './parser';
import { generateBoundaryTests } from './boundary';
import { generateTypeFuzzTests } from './typeFuzzer';
import { generateSecurityTests } from './security';
import { generateConcurrencyTests } from './concurrency';

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
    if (catSet.has('concurrency')) {
      testCases.push(...generateConcurrencyTests(param));
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
