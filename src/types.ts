export type Category = 'boundary' | 'type_fuzz' | 'security' | 'concurrency';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ParamType =
  | 'integer'
  | 'float'
  | 'currency'
  | 'string'
  | 'email'
  | 'date'
  | 'uuid'
  | 'file'
  | 'boolean'
  | 'array'
  | 'object'
  | 'unknown';

export type SpecFormat = 'user_story' | 'gherkin' | 'json_schema' | 'api_spec';

export interface ExtractedParam {
  name: string;
  paramType: ParamType;
  required: boolean;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  allowedValues?: string[];
  maxFileSizeBytes?: number;
  description: string;
}

export interface TestCase {
  id: string;
  targetParam: string;
  category: Category;
  severity: Severity;
  title: string;
  payload: any;
  payloadDisplay: string;
  expectedStatus: string;
  expectedBehavior: string;
  technicalRationale: string;
  mitigation?: string;
}

export interface AnalysisReport {
  formatDetected: SpecFormat;
  parameters: ExtractedParam[];
  testCases: TestCase[];
  metrics: {
    totalTestCases: number;
    parametersDetected: number;
    criticalSeverity: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    categoriesActive: Category[];
  };
}

export interface PresetItem {
  id: string;
  title: string;
  format: SpecFormat;
  description: string;
  text: string;
  badge: string;
}
