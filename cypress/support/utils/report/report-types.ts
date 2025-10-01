/**
 * Type definitions for HTML report generation
 */

export interface TestResult {
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error_message?: string;
  start_timestamp?: string;
  end_timestamp?: string;
}

export interface TestStep {
  keyword: string;
  name: string;
  result: TestResult;
}

export interface TestScenario {
  keyword: string;
  name: string;
  steps?: TestStep[];
}

export interface TestFeature {
  keyword: string;
  name: string;
  elements?: TestScenario[];
  uri?: string;
}

export interface TestStats {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalDuration: number;
  passRate: number;
}

export interface TerminalLog {
  type: string;
  severity: string;
  message: string;
}

export interface FeatureStats {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface ChartData {
  labels: string[];
  durations: number[];
  colors: string[];
}

export interface ErrorData {
  labels: string[];
  counts: number[];
}

