/**
 * Statistics calculation utilities for HTML reports
 */

import { TestFeature, TestScenario, TestStats, FeatureStats } from './report-types';

export class ReportStatistics {
  static generateStatistics(features: TestFeature[]): TestStats {
    let totalScenarios = 0;
    let passedScenarios = 0;
    let failedScenarios = 0;
    let skippedScenarios = 0;
    let totalSteps = 0;
    let passedSteps = 0;
    let failedSteps = 0;
    let skippedSteps = 0;
    let totalDuration = 0;

    features.forEach(feature => {
      feature.elements?.forEach(scenario => {
        totalScenarios++;
        let scenarioHasFailed = false;
        let scenarioHasSkipped = false;

        scenario.steps?.forEach(step => {
          totalSteps++;
          if (step.result.duration) {
            totalDuration += step.result.duration;
          } else {
            // Use estimated duration based on test status (in nanoseconds)
            totalDuration += (step.result.status === 'failed' ? 2000 : 500) * 1000000;
          }

          switch (step.result.status) {
            case 'passed':
              passedSteps++;
              break;
            case 'failed':
              failedSteps++;
              scenarioHasFailed = true;
              break;
            case 'skipped':
              skippedSteps++;
              scenarioHasSkipped = true;
              break;
          }
        });

        if (scenarioHasFailed) {
          failedScenarios++;
        } else if (scenarioHasSkipped) {
          skippedScenarios++;
        } else {
          passedScenarios++;
        }
      });
    });

    return {
      totalScenarios,
      passedScenarios,
      failedScenarios,
      skippedScenarios,
      totalSteps,
      passedSteps,
      failedSteps,
      skippedSteps,
      totalDuration: Math.round(totalDuration / 1000000), // Convert to milliseconds
      passRate: totalScenarios > 0 ? Math.round((passedScenarios / totalScenarios) * 100) : 0,
    };
  }

  static getFeatureStats(feature: TestFeature): FeatureStats {
    let passed = 0,
      failed = 0,
      skipped = 0,
      duration = 0;

    feature.elements?.forEach(scenario => {
      const status = this.getScenarioStatus(scenario);
      if (status === 'passed') passed++;
      else if (status === 'failed') failed++;
      else if (status === 'skipped') skipped++;

      // Calculate scenario duration with fallback
      scenario.steps?.forEach(step => {
        if (step.result.duration) {
          duration += step.result.duration / 1000000; // Convert nanoseconds to milliseconds
        } else {
          // Use estimated duration based on test status
          duration += step.result.status === 'failed' ? 2000 : 500; // 2s for failed, 500ms for others
        }
      });
    });

    return { passed, failed, skipped, duration: Math.round(duration) };
  }

  static getScenarioStatus(scenario: TestScenario): string {
    const steps = scenario.steps || [];
    if (steps.some(step => step.result.status === 'failed')) return 'failed';
    if (steps.some(step => step.result.status === 'skipped')) return 'skipped';
    return 'passed';
  }

  static getScenarioDuration(scenario: TestScenario): number {
    let duration = 0;
    scenario.steps?.forEach(step => {
      if (step.result.duration) {
        duration += step.result.duration / 1000000; // Convert nanoseconds to milliseconds
      } else {
        // Use estimated duration based on test status
        duration += step.result.status === 'failed' ? 2000 : 500; // 2s for failed, 500ms for others
      }
    });
    return Math.round(duration);
  }

  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  // Analytics helper methods
  static getTopErrors(features: TestFeature[]): Array<{ type: string; count: number }> {
    const errorCounts: Record<string, number> = {};

    features.forEach(feature => {
      feature.elements?.forEach(scenario => {
        scenario.steps?.forEach(step => {
          if (step.result.status === 'failed' && step.result.error_message) {
            let errorType = 'Unknown Error';
            const error = step.result.error_message;

            if (error.includes('AssertionError')) errorType = 'Assertion Error';
            else if (error.includes('TypeError')) errorType = 'Type Error';
            else if (error.includes('RangeError')) errorType = 'Range Error';
            else if (error.includes('SyntaxError')) errorType = 'Syntax Error';
            else if (error.includes('CypressError')) errorType = 'Cypress Error';
            else if (error.includes('NetworkError') || error.includes('ENOTFOUND')) errorType = 'Network Error';
            else if (error.includes('Timed out')) errorType = 'Timeout Error';
            else if (error.includes('not found') || error.includes('not visible')) errorType = 'Element Error';

            errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
          }
        });
      });
    });

    return Object.entries(errorCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  static getSlowestTests(features: TestFeature[]): Array<{ name: string; duration: number }> {
    const tests: Array<{ name: string; duration: number }> = [];

    features.forEach(feature => {
      feature.elements?.forEach(scenario => {
        const duration = this.getScenarioDuration(scenario);
        tests.push({
          name: scenario.name,
          duration: duration,
        });
      });
    });

    return tests.sort((a, b) => b.duration - a.duration).slice(0, 5);
  }

  static countApiTests(features: TestFeature[]): number {
    let count = 0;
    features.forEach(feature => {
      feature.elements?.forEach(scenario => {
        if (
          scenario.name.toLowerCase().includes('api') ||
          scenario.name.toLowerCase().includes('request') ||
          scenario.steps?.some(step => step.name.includes('request') || step.name.includes('API'))
        ) {
          count++;
        }
      });
    });
    return count;
  }

  static countUiTests(features: TestFeature[]): number {
    let count = 0;
    features.forEach(feature => {
      feature.elements?.forEach(scenario => {
        if (
          scenario.name.toLowerCase().includes('ui') ||
          scenario.name.toLowerCase().includes('element') ||
          scenario.name.toLowerCase().includes('click') ||
          scenario.steps?.some(
            step => step.name.includes('visit') || step.name.includes('click') || step.name.includes('element')
          )
        ) {
          count++;
        }
      });
    });
    return count;
  }

  static countIntegrationTests(features: TestFeature[]): number {
    let count = 0;
    features.forEach(feature => {
      feature.elements?.forEach(scenario => {
        if (
          scenario.name.toLowerCase().includes('integration') ||
          scenario.name.toLowerCase().includes('end-to-end') ||
          scenario.name.toLowerCase().includes('e2e')
        ) {
          count++;
        }
      });
    });
    return count;
  }
}