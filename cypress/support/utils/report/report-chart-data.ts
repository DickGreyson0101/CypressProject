/**
 * Chart data generation utilities for HTML reports
 */

import { TestFeature, ChartData, ErrorData } from './report-types';
import { ReportStatistics } from './report-statistics';

export class ReportChartData {
  static getTimelineData(features: TestFeature[]): ChartData {
    const data: ChartData = {
      labels: [],
      durations: [],
      colors: [],
    };

    features.forEach(feature => {
      // Calculate feature duration by summing all scenario durations
      let featureDuration = 0;
      let featureStatus = 'passed';
      let hasFailures = false;
      let hasSkipped = false;

      feature.elements?.forEach(scenario => {
        const scenarioDuration = ReportStatistics.getScenarioDuration(scenario);
        const scenarioStatus = ReportStatistics.getScenarioStatus(scenario);

        featureDuration += scenarioDuration;

        if (scenarioStatus === 'failed') {
          hasFailures = true;
        } else if (scenarioStatus === 'skipped') {
          hasSkipped = true;
        }
      });

      // Determine feature status
      if (hasFailures) {
        featureStatus = 'failed';
      } else if (hasSkipped) {
        featureStatus = 'skipped';
      }

      // Add feature data - extract filename only for chart display
      const fullFeatureName = feature.name || 'Unknown Feature';
      // Extract filename from "filename: description" format
      const fileName = fullFeatureName.includes(':') ? fullFeatureName.split(':')[0].trim() : fullFeatureName;
      
      // Truncate long feature names for better chart display
      const truncatedName = fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName;
      data.labels.push(truncatedName);
      data.durations.push(featureDuration);

      switch (featureStatus) {
        case 'passed':
          data.colors.push('#22c55e');
          break;
        case 'failed':
          data.colors.push('#ef4444');
          break;
        case 'skipped':
          data.colors.push('#f59e0b');
          break;
        default:
          data.colors.push('#6b7280');
      }
    });

    return data;
  }

  static getErrorChartData(features: TestFeature[]): ErrorData {
    const topErrors = ReportStatistics.getTopErrors(features);
    return {
      labels: topErrors.map(error => error.type),
      counts: topErrors.map(error => error.count),
    };
  }
}