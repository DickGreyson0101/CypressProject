/**
 * HTML Report Generator - Complete HTML report generation with screenshot handling
 * Merged from TailwindHtmlReporter for cleaner architecture
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestFeature, TestScenario, TestStep, TestStats, TerminalLog } from './report-types';
import { ReportStatistics } from './report-statistics';
import { ReportChartData } from './report-chart-data';

export class ReportHtmlGenerator {
  /**
   * Main entry point for generating HTML reports
   */
  static async generateReport(cucumberJsonPath: string, terminalLogsPath: string, outputPath: string): Promise<void> {
    try {
      // Read Cucumber JSON
      const cucumberData: TestFeature[] = JSON.parse(fs.readFileSync(cucumberJsonPath, 'utf8'));

      // Read terminal logs
      let terminalLogs: Record<string, TerminalLog[]> = {};
      if (fs.existsSync(terminalLogsPath)) {
        terminalLogs = JSON.parse(fs.readFileSync(terminalLogsPath, 'utf8'));
      }

      // Find screenshots in report directory
      const reportsDir = path.join(process.cwd(), 'cypress', 'reports');
      const reportScreenshotsDir = path.join(reportsDir, 'tailwind-html-report', 'screenshots');
      const screenshots = this.findScreenshots(reportScreenshotsDir, cucumberData);

      // Generate statistics
      const stats = ReportStatistics.generateStatistics(cucumberData);

      // Generate HTML content
      const htmlContent = this.generateHtmlContent(cucumberData, stats, terminalLogs, screenshots);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write HTML file
      fs.writeFileSync(outputPath, htmlContent, 'utf8');
    } catch (error) {
      console.error('❌ Error generating Tailwind HTML report:', error);
      throw error;
    }
  }

  /**
   * Find and match screenshots with failed scenarios
   */
  private static findScreenshots(screenshotsDir: string, cucumberData: TestFeature[]): Record<string, string[]> {
    const screenshots: Record<string, string[]> = {};

    if (!fs.existsSync(screenshotsDir)) {
      return screenshots;
    }

    // Get list of failed scenarios from current test run
    const failedScenarios = new Set<string>();
    cucumberData.forEach(feature => {
      feature.elements?.forEach(scenario => {
        const status = ReportStatistics.getScenarioStatus(scenario);
        if (status === 'failed') {
          failedScenarios.add(scenario.name);
        }
      });
    });

    try {
      const files = fs.readdirSync(screenshotsDir, { recursive: true });
      files.forEach(file => {
        if (typeof file === 'string' && file.endsWith('.png')) {
          const relativePath = `screenshots/${file.replace(/\\/g, '/')}`;

          // Extract test name from screenshot filename
          let testName = '';
          
          const oldFormatMatch = file.match(/(.+?)\s*--\s*(.+?)\s*\(failed\)/);
          if (oldFormatMatch) {
            testName = oldFormatMatch[2];
          } else {
            const cleanedMatch = file.match(/(.+?)_failed/);
            if (cleanedMatch) {
              testName = cleanedMatch[1]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        } else {
              testName = file.replace('.png', '').replace(/_/g, ' ');
            }
          }

          // Only include screenshots for scenarios that actually failed in current run
          if (testName && this.isScenarioFailed(testName, failedScenarios)) {
            if (!screenshots[testName]) {
              screenshots[testName] = [];
            }
            screenshots[testName].push(relativePath);
          }
        }
      });
        } catch (error) {
      console.warn('Warning: Could not read screenshots directory:', error);
    }

    return screenshots;
  }

  /**
   * Check if a scenario name matches any failed scenario
   */
  private static isScenarioFailed(testName: string, failedScenarios: Set<string>): boolean {
    if (failedScenarios.has(testName)) {
      return true;
    }

    const cleanTestName = testName.toLowerCase().trim();
    for (const failedScenario of failedScenarios) {
      const cleanFailedScenario = failedScenario.toLowerCase().trim();
      if (cleanFailedScenario.includes(cleanTestName) || cleanTestName.includes(cleanFailedScenario)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate complete HTML content for the report
   */
  static generateHtmlContent(
    features: TestFeature[],
    stats: TestStats,
    terminalLogs: Record<string, TerminalLog[]>,
    screenshots: Record<string, string[]>
  ): string {
    const timestamp = new Date().toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>cypress-test Test Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'test-passed': '#22c55e',
                        'test-failed': '#ef4444',
                        'test-skipped': '#f59e0b'
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    ${this.getStyles()}
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto p-6">
        ${this.generateHeader(timestamp, stats)}
        ${this.generateStatsDashboard(stats)}
        ${this.generateChartsSection()}
        ${this.generateTimelineSection(stats)}
        ${this.generatePerformanceSection(stats, features)}
        ${this.generateQualityInsights(features)}
        ${this.generateControlsSection(stats, features)}
        ${this.generateFeaturesSection(features, terminalLogs, screenshots)}
    </div>
    ${this.generateJavaScript(stats, features)}
</body>
</html>`;
  }

  private static getStyles(): string {
    return `
    <style>
        body { font-family: 'Inter', sans-serif; }
        .chart-container { position: relative; height: 300px; }
        .chart-container canvas { max-height: 300px !important; }
        
        .filter-btn.active {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .filter-btn.active#filter-all {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        }
        
        .filter-btn.active#filter-passed {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
        }
        
        .filter-btn.active#filter-failed {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }
        
        .filter-btn.active#filter-skipped {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
        }
        
        .expand-btn.active {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .expand-btn.active#expand-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        
        .expand-btn.active#collapse-btn {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
        }
    </style>`;
  }

  private static generateHeader(timestamp: string, stats: TestStats): string {
    return `
        <header class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div class="flex items-center justify-between mb-6">
                <div class="flex-1">
                    <div class="flex items-center gap-4 mb-4">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h1 class="text-4xl font-bold text-gray-900">cypress-test Test Report</h1>
                    </div>
                    <div class="flex items-center gap-8 text-sm text-gray-600">
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Generated: ${timestamp}
                        </div>
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Total Duration: ${ReportStatistics.formatDuration(stats.totalDuration)}
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-xl text-center">
                    <div class="text-3xl font-bold">${stats.passRate}%</div>
                    <div class="text-sm opacity-90">Pass Rate</div>
                </div>
            </div>
        </header>`;
  }

  private static generateStatsDashboard(stats: TestStats): string {
    return `
        <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div class="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div class="text-2xl font-bold text-gray-700">${stats.totalScenarios}</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">Total Scenarios</div>
            </div>
            <div class="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${stats.passedScenarios === 0 ? 'opacity-30' : ''}">
                <div class="text-2xl font-bold text-test-passed">${stats.passedScenarios}</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">Passed</div>
            </div>
            <div class="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${stats.failedScenarios === 0 ? 'opacity-30' : ''}">
                <div class="text-2xl font-bold text-test-failed">${stats.failedScenarios}</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">Failed</div>
            </div>
            <div class="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${stats.skippedScenarios === 0 ? 'opacity-30' : ''}">
                <div class="text-2xl font-bold text-test-skipped">${stats.skippedScenarios}</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">Skipped</div>
            </div>
            <div class="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div class="text-2xl font-bold text-blue-600">${ReportStatistics.formatDuration(stats.totalDuration)}</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">Duration</div>
            </div>
            <div class="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div class="text-2xl font-bold text-purple-600">${stats.passRate}%</div>
                <div class="text-sm text-gray-500 uppercase tracking-wide">Pass Rate</div>
            </div>
        </section>`;
  }

  private static generateChartsSection(): string {
    return `
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
                    </svg>
                    <h3 class="text-lg font-semibold text-gray-900">Pass/Fail Ratio</h3>
                </div>
                <div class="chart-container">
                    <div id="passFailChart" style="width: 100%; height: 300px;"></div>
                </div>
            </div>

            <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    <h3 class="text-lg font-semibold text-gray-900">Error Categories</h3>
                </div>
                <div class="chart-container">
                    <div id="errorChart" style="width: 100%; height: 300px;"></div>
                </div>
            </div>
        </section>`;
  }

  private static generateTimelineSection(stats: TestStats): string {
    return `
        <section class="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <h3 class="text-xl font-semibold text-gray-900">Feature Execution Timeline</h3>
                </div>
                <div class="text-sm text-gray-500">
                    <span class="text-purple-600 font-semibold text-lg">${ReportStatistics.formatDuration(stats.totalDuration)}</span> Total Duration
                </div>
            </div>
            <div class="chart-container" style="height: 400px;">
                <div id="timelineChart" style="width: 100%; height: 100%;"></div>
            </div>
        </section>`;
  }

  private static generatePerformanceSection(stats: TestStats, features: TestFeature[]): string {
    return `
        <section class="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                <h3 class="text-xl font-semibold text-gray-900">Performance Metrics</h3>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600">${ReportStatistics.formatDuration(stats.totalDuration / stats.totalScenarios)}</div>
                    <div class="text-sm text-blue-700 mt-1">Avg Duration</div>
                </div>
                <div class="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <div class="text-2xl font-bold text-green-600">${Math.round((stats.passedScenarios / stats.totalScenarios) * 100)}%</div>
                    <div class="text-sm text-green-700 mt-1">Success Rate</div>
                </div>
                <div class="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <div class="text-2xl font-bold text-purple-600">${stats.totalSteps}</div>
                    <div class="text-sm text-purple-700 mt-1">Total Steps</div>
                </div>
                <div class="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                    <div class="text-2xl font-bold text-orange-600">${features.length}</div>
                    <div class="text-sm text-orange-700 mt-1">Features</div>
                </div>
            </div>
        </section>`;
  }

  private static generateQualityInsights(features: TestFeature[]): string {
    return `
        <section class="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
                <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <h3 class="text-xl font-semibold text-gray-900">Test Quality Insights</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                        <h4 class="font-medium text-gray-900">Most Common Errors</h4>
                    </div>
                    <div class="space-y-2 text-sm">
                        ${ReportStatistics.getTopErrors(features)
                          .map(
                            error => `
                            <div class="flex justify-between">
                                <span class="text-gray-600">${error.type}</span>
                                <span class="font-medium text-red-600">${error.count}</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                <div class="p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <h4 class="font-medium text-gray-900">Slowest Tests</h4>
                    </div>
                    <div class="space-y-2 text-sm">
                        ${ReportStatistics.getSlowestTests(features)
                          .map(
                            test => `
                            <div class="flex justify-between">
                                <span class="text-gray-600 truncate">${test.name}</span>
                                <span class="font-medium text-yellow-600">${ReportStatistics.formatDuration(test.duration)}</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                <div class="p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 class="font-medium text-gray-900">Test Coverage</h4>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">API Tests</span>
                            <span class="font-medium text-blue-600">${ReportStatistics.countApiTests(features)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">UI Tests</span>
                            <span class="font-medium text-blue-600">${ReportStatistics.countUiTests(features)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Integration</span>
                            <span class="font-medium text-blue-600">${ReportStatistics.countIntegrationTests(features)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
  }

  private static generateControlsSection(stats: TestStats, features: TestFeature[]): string {
    return `
        <section class="bg-white rounded-xl p-6 mb-8 border border-gray-200 shadow-sm">
            <div class="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div class="flex flex-wrap gap-2">
                    <button id="filter-all" onclick="filterScenarios('all')" class="filter-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md active">All (${stats.totalScenarios})</button>
                    <button id="filter-passed" onclick="filterScenarios('passed')" class="filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-test-passed hover:text-white transition-colors shadow-md">Passed (${stats.passedScenarios})</button>
                    <button id="filter-failed" onclick="filterScenarios('failed')" class="filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-test-failed hover:text-white transition-colors shadow-md">Failed (${stats.failedScenarios})</button>
                    <button id="filter-skipped" onclick="filterScenarios('skipped')" class="filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-test-skipped hover:text-white transition-colors shadow-md">Skipped (${stats.skippedScenarios})</button>
                </div>
                
                <div class="flex gap-2">
                    <button id="expand-btn" onclick="expandAll()" class="expand-btn px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md">Expand All</button>
                    <button id="collapse-btn" onclick="collapseAll()" class="expand-btn px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md">Collapse All</button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="relative">
                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input type="text" id="searchInput" placeholder="Search scenarios..." class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" onkeyup="handleSearch()">
                </div>
                
                <select id="feature-filter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onchange="filterByFeature()">
                    <option value="">All Features</option>
                    ${features.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
                </select>
                
                <select id="duration-filter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onchange="filterByDuration()">
                    <option value="">All Durations</option>
                    <option value="fast">Fast (< 1s)</option>
                    <option value="medium">Medium (1-5s)</option>
                    <option value="slow">Slow (> 5s)</option>
                </select>
                
                <select id="error-filter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onchange="filterByError()">
                    <option value="">All Error Types</option>
                    <option value="assertion">Assertion Errors</option>
                    <option value="timeout">Timeout Errors</option>
                    <option value="network">Network Errors</option>
                    <option value="element">Element Not Found</option>
                    <option value="other">Other Errors</option>
                </select>
            </div>
            
            <div class="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
                <span class="text-sm font-medium text-gray-700">Export:</span>
                <button onclick="exportToCSV()" class="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    CSV
                </button>
                <button onclick="exportToJSON()" class="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                    JSON
                </button>
            </div>
        </section>`;
  }

  private static generateFeaturesSection(
    features: TestFeature[],
    terminalLogs: Record<string, TerminalLog[]>,
    screenshots: Record<string, string[]>
  ): string {
    return `
        <section class="space-y-6">
            ${this.generateFeaturesHtml(features, terminalLogs, screenshots)}
        </section>`;
  }

  private static generateFeaturesHtml(
    features: TestFeature[],
    terminalLogs: Record<string, TerminalLog[]>,
    screenshots: Record<string, string[]>
  ): string {
    return features
      .map((feature, index) => {
        const featureStats = ReportStatistics.getFeatureStats(feature);
        const featureId = `feature-${index}`;

        return `
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-feature-id="${featureId}">
            <div class="bg-gray-50 p-6 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200" onclick="window.toggleFeature('${featureId}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <h2 class="text-xl font-semibold text-gray-900">
                                    <span class="text-blue-600 font-bold">Feature:</span> ${feature.name}
                                </h2>
                                <span class="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">${this.getFeatureFilePath(feature)}</span>
                            </div>
                            <div class="flex items-center gap-4 mt-2">
                                <div class="flex gap-2">
                                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-test-passed text-white text-xs font-medium rounded-full ${featureStats.passed === 0 ? 'opacity-30' : ''}">
                                        <span class="font-bold">${featureStats.passed}</span>
                                        <span>PASSED</span>
                                    </span>
                                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-test-failed text-white text-xs font-medium rounded-full ${featureStats.failed === 0 ? 'opacity-30' : ''}">
                                        <span class="font-bold">${featureStats.failed}</span>
                                        <span>FAILED</span>
                                    </span>
                                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-test-skipped text-white text-xs font-medium rounded-full ${featureStats.skipped === 0 ? 'opacity-30' : ''}">
                                        <span class="font-bold">${featureStats.skipped}</span>
                                        <span>SKIPPED</span>
                                    </span>
                                </div>
                                <div class="flex items-center gap-1 text-sm text-gray-500">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    ${ReportStatistics.formatDuration(featureStats.duration)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <svg id="icon-${featureId}" class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </div>
            </div>
            
            <div id="content-${featureId}" class="hidden p-6 space-y-4">
                ${this.generateScenariosHtml(feature.elements || [], terminalLogs, screenshots, featureId)}
            </div>
        </div>
      `;
      })
      .join('');
  }

  private static generateScenariosHtml(
    scenarios: TestScenario[],
    terminalLogs: Record<string, TerminalLog[]>,
    screenshots: Record<string, string[]>,
    featureId: string
  ): string {
    return scenarios
      .map((scenario, index) => {
        const status = ReportStatistics.getScenarioStatus(scenario);
        const logs = this.getScenarioLogs(scenario.name, terminalLogs);
        const scenarioId = `${featureId}-scenario-${index}`;
        const scenarioDuration = ReportStatistics.getScenarioDuration(scenario);
        const statusIcon = this.getStatusIcon(status);
        const statusColor = this.getStatusColor(status);

        return `
        <div class="border border-gray-200 rounded-lg overflow-hidden scenario-card" data-status="${status}">
            <div class="p-4 cursor-pointer hover:bg-gray-50 transition-colors ${this.getStatusBorderClass(status)}" onclick="window.toggleScenario('${scenarioId}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-6 h-6 ${statusColor}">${statusIcon}</div>
                        <div>
                            <h3 class="font-medium text-gray-900">
                                <span class="text-green-600 font-semibold">Scenario:</span> ${scenario.name}
                            </h3>
                            <div class="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span class="inline-flex items-center gap-1 px-2 py-1 ${this.getStatusBadgeClass(status)} text-xs font-medium rounded">
                                    ${status.toUpperCase()}
                                </span>
                                <span class="flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    ${(scenario.steps || []).length} steps
                                </span>
                                <span class="flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    ${ReportStatistics.formatDuration(scenarioDuration)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <svg id="scenario-icon-${scenarioId}" class="w-4 h-4 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </div>
            </div>
            
            <div id="scenario-content-${scenarioId}" class="hidden border-t border-gray-200">
                <div class="p-4 space-y-3">
                    ${this.generateStepsHtml(scenario.steps || [])}
                </div>
                
                ${status === 'failed' ? this.generateScreenshotsSection(scenario.name, screenshots) : ''}
                
                ${
                  logs.length > 0
                    ? `
                    <div class="border-t border-gray-200 p-4">
                        <div class="flex items-center gap-2 mb-3">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            <h4 class="font-medium text-gray-900">Cypress Terminal Logs</h4>
                            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${logs.length} entries</span>
                        </div>
                        <div class="space-y-2 max-h-96 overflow-y-auto">
                            ${logs
                              .map(
                                (log, logIndex) => `
                                <div class="bg-gray-50 rounded-lg p-3 text-sm">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-xs text-gray-500">#${logIndex + 1}</span>
                                        <span class="text-xs px-2 py-1 rounded ${this.getLogSeverityClass(log)}">${log.severity}</span>
                                        <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">${log.type}</span>
                                    </div>
                                    <pre class="text-gray-700 whitespace-pre-wrap font-mono text-xs">${this.formatLogMessage(log.message)}</pre>
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    </div>
                `
                    : ''
                }
            </div>
        </div>
      `;
      })
      .join('');
  }

  private static generateStepsHtml(steps: TestStep[]): string {
    return steps
      .map(
        (step, index) => `
      <div class="grid grid-cols-12 gap-3 items-center p-3 rounded-lg ${this.getStepBackgroundClass(step.result.status)}">
        <div class="col-span-1 text-center">
          <span class="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            ${index + 1}
          </span>
        </div>
        <div class="col-span-2">
          <span class="text-xs font-medium text-purple-600 uppercase">${step.keyword}</span>
        </div>
        <div class="col-span-6">
          <span class="text-sm text-gray-900">${step.name}</span>
        </div>
        <div class="col-span-1 text-center">
          <div class="w-5 h-5 ${this.getStatusColor(step.result.status)}">${this.getStatusIcon(step.result.status)}</div>
        </div>
        <div class="col-span-2 text-right">
          <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            ${
              step.result.duration
                ? ReportStatistics.formatDuration(Math.round(step.result.duration / 1000000))
                : step.result.status === 'failed'
                  ? '2s'
                  : '500ms'
            }
          </span>
        </div>
        ${
          step.result.error_message
            ? `
          <div class="col-span-12 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-sm font-medium text-red-800">Error Details:</span>
            </div>
            <pre class="text-xs text-red-700 whitespace-pre-wrap font-mono">${this.escapeHtml(step.result.error_message)}</pre>
          </div>
        `
            : ''
        }
      </div>
    `
      )
      .join('');
  }

  private static generateScreenshotsSection(scenarioName: string, screenshots: Record<string, string[]>): string {
    // Try to find screenshots by exact match first
    let scenarioScreenshots = screenshots[scenarioName] || [];
    
    // If no exact match, try to find by cleaned name or partial match
    if (scenarioScreenshots.length === 0) {
      const cleanedScenarioName = scenarioName.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Look for screenshots with similar names
      Object.keys(screenshots).forEach(key => {
        const cleanedKey = key.toLowerCase().replace(/\s+/g, ' ').trim();
        if (cleanedKey.includes(cleanedScenarioName) || cleanedScenarioName.includes(cleanedKey)) {
          scenarioScreenshots = screenshots[key];
        }
      });
    }

    if (scenarioScreenshots.length === 0) {
      return '';
    }

    return `
      <div class="border-t border-gray-200 p-4">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <h4 class="font-medium text-gray-900">Screenshots</h4>
          <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${scenarioScreenshots.length} images</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${scenarioScreenshots
            .map(
              (screenshot, index) => `
            <div class="relative group cursor-pointer" onclick="openScreenshot('${screenshot}')">
              <img src="${screenshot}" alt="Screenshot ${index + 1}" 
                   class="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:shadow-lg transition-shadow">
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <div class="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                Attempt ${index + 1}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  // Helper methods
  private static getFeatureFilePath(feature: TestFeature): string {
    if (feature.uri) {
      const relativePath = feature.uri.replace(/^.*cypress[/\\]e2e[/\\]features[/\\]/, '\\');
      return relativePath;
    }
    
    const featureName = feature.name.toLowerCase().replace(/\s+/g, '-');
    return `\\examples\\ui\\${featureName}.feature`;
  }

  private static getStatusIcon(status: string): string {
    switch (status) {
      case 'passed':
        return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
      case 'failed':
        return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
      case 'skipped':
        return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
      default:
        return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }
  }

  private static getStatusColor(status: string): string {
    switch (status) {
      case 'passed':
        return 'text-test-passed';
      case 'failed':
        return 'text-test-failed';
      case 'skipped':
        return 'text-test-skipped';
      default:
        return 'text-gray-500';
    }
  }

  private static getStatusBorderClass(status: string): string {
    switch (status) {
      case 'passed':
        return 'border-l-4 border-l-test-passed';
      case 'failed':
        return 'border-l-4 border-l-test-failed';
      case 'skipped':
        return 'border-l-4 border-l-test-skipped';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  }

  private static getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  private static getStepBackgroundClass(status: string): string {
    switch (status) {
      case 'passed':
        return 'bg-green-50 border border-green-200';
      case 'failed':
        return 'bg-red-50 border border-red-200';
      case 'skipped':
        return 'bg-yellow-50 border border-yellow-200';
      default:
        return 'bg-gray-50 border border-gray-200';
    }
  }

  private static getScenarioLogs(scenarioName: string, terminalLogs: Record<string, TerminalLog[]>): TerminalLog[] {
    const scenarioLogs: TerminalLog[] = [];

    Object.entries(terminalLogs).forEach(([_specPath, specLogs]) => {
      Object.entries(specLogs as unknown as Record<string, TerminalLog[]>).forEach(([testName, testLogs]) => {
        if (testName.includes(scenarioName) || scenarioName.includes(testName.split(' -> ')[1] || testName)) {
          scenarioLogs.push(...(testLogs as TerminalLog[]));
        }
      });
    });

    return scenarioLogs;
  }

  private static getLogSeverityClass(log: TerminalLog): string {
    switch (log.severity) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  private static formatLogMessage(message: string): string {
    return message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  private static escapeHtml(text: string): string {
    const div = { innerHTML: '' } as { innerHTML: string };
    (div as unknown as { textContent: string }).textContent = text;
    return (
      div.innerHTML ||
      text.replace(/[&<>"']/g, (match: string) => {
        const escapeMap: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        };
        return escapeMap[match];
      })
    );
  }

  private static generateJavaScript(stats: TestStats, features: TestFeature[]): string {
    return `
    <script>
      let expandedFeatures = new Set();
      let expandedScenarios = new Set();

      function toggleFeature(featureId) {
        const content = document.getElementById('content-' + featureId);
        const icon = document.getElementById('icon-' + featureId);
        
        if (expandedFeatures.has(featureId)) {
          content.classList.add('hidden');
          icon.style.transform = 'rotate(0deg)';
          expandedFeatures.delete(featureId);
        } else {
          content.classList.remove('hidden');
          icon.style.transform = 'rotate(180deg)';
          expandedFeatures.add(featureId);
        }
      }

      function toggleScenario(scenarioId) {
        const content = document.getElementById('scenario-content-' + scenarioId);
        const icon = document.getElementById('scenario-icon-' + scenarioId);
        
        if (expandedScenarios.has(scenarioId)) {
          content.classList.add('hidden');
          icon.style.transform = 'rotate(0deg)';
          expandedScenarios.delete(scenarioId);
        } else {
          content.classList.remove('hidden');
          icon.style.transform = 'rotate(180deg)';
          expandedScenarios.add(scenarioId);
        }
      }

      function expandAll() {
        document.querySelectorAll('[data-feature-id]').forEach(feature => {
          const featureId = feature.dataset.featureId;
          const content = document.getElementById('content-' + featureId);
          const icon = document.getElementById('icon-' + featureId);
          
          content.classList.remove('hidden');
          icon.style.transform = 'rotate(180deg)';
          expandedFeatures.add(featureId);
        });

        document.querySelectorAll('.scenario-card').forEach((scenario, index) => {
          const scenarioId = scenario.querySelector('[id^="scenario-content-"]')?.id.replace('scenario-content-', '');
          if (scenarioId) {
            const content = document.getElementById('scenario-content-' + scenarioId);
            const icon = document.getElementById('scenario-icon-' + scenarioId);
            
            if (content && icon) {
              content.classList.remove('hidden');
              icon.style.transform = 'rotate(180deg)';
              expandedScenarios.add(scenarioId);
            }
          }
        });
      }

      function collapseAll() {
        expandedFeatures.forEach(featureId => {
          const content = document.getElementById('content-' + featureId);
          const icon = document.getElementById('icon-' + featureId);
          
          content.classList.add('hidden');
          icon.style.transform = 'rotate(0deg)';
        });
        expandedFeatures.clear();

        expandedScenarios.forEach(scenarioId => {
          const content = document.getElementById('scenario-content-' + scenarioId);
          const icon = document.getElementById('scenario-icon-' + scenarioId);
          
          if (content && icon) {
            content.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
          }
        });
        expandedScenarios.clear();
      }

      function handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const scenarios = document.querySelectorAll('.scenario-card');
        
        scenarios.forEach(scenario => {
          const title = scenario.querySelector('h3').textContent.toLowerCase();
          if (title.includes(searchTerm)) {
            scenario.classList.remove('hidden');
          } else {
            scenario.classList.add('hidden');
          }
        });

        document.querySelectorAll('[data-feature-id]').forEach(feature => {
          const visibleScenarios = feature.querySelectorAll('.scenario-card:not(.hidden)');
          if (visibleScenarios.length > 0) {
            feature.classList.remove('hidden');
          } else {
            feature.classList.add('hidden');
          }
        });
      }

      function filterScenarios(filter) {
        const scenarios = document.querySelectorAll('.scenario-card');
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
          btn.classList.remove('active');
          
          if (btn.id === 'filter-all') {
            btn.className = 'filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-blue-700 hover:text-white transition-colors shadow-md';
          } else if (btn.id === 'filter-passed') {
            btn.className = 'filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-test-passed hover:text-white transition-colors shadow-md';
          } else if (btn.id === 'filter-failed') {
            btn.className = 'filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-test-failed hover:text-white transition-colors shadow-md';
          } else if (btn.id === 'filter-skipped') {
            btn.className = 'filter-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-test-skipped hover:text-white transition-colors shadow-md';
          }
        });
        
        const activeBtn = document.getElementById('filter-' + filter);
        if (activeBtn) {
          activeBtn.classList.add('active');
          
          if (filter === 'all') {
            activeBtn.className = 'filter-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md active';
          }
        }
        
        scenarios.forEach(scenario => {
          const status = scenario.dataset.status;
          if (filter === 'all' || status === filter) {
            scenario.classList.remove('hidden');
          } else {
            scenario.classList.add('hidden');
          }
        });

        document.querySelectorAll('[data-feature-id]').forEach(feature => {
          const visibleScenarios = feature.querySelectorAll('.scenario-card:not(.hidden)');
          if (visibleScenarios.length > 0) {
            feature.classList.remove('hidden');
          } else {
            feature.classList.add('hidden');
          }
        });
      }

      function openScreenshot(imageSrc) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
        modal.innerHTML = \`
          <div class="relative max-w-4xl max-h-full p-4">
            <img src="\${imageSrc}" alt="Screenshot" class="max-w-full max-h-full rounded-lg shadow-2xl">
            <button onclick="closeScreenshot()" class="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        \`;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
      }

      function closeScreenshot() {
        const modal = document.querySelector('.fixed.inset-0.z-50');
        if (modal) {
          modal.remove();
          document.body.style.overflow = '';
        }
      }

      function initializeCharts() {
        // Pass/Fail Ratio Chart with ECharts
        try {
          const passFailChartDom = document.getElementById('passFailChart');
          if (passFailChartDom && typeof echarts !== 'undefined') {
            const passFailChart = echarts.init(passFailChartDom, null, {
              renderer: 'svg',
              useDirtyRect: false,
            });

            const passFailOption = {
              tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
              },
              toolbox: {
                feature: {
                  saveAsImage: {
                    title: 'Save as Image',
                    name: 'pass-fail-ratio'
                  }
                },
                right: 10,
                top: 10
              },
              legend: {
                orient: 'horizontal',
                bottom: '0%',
                left: 'center'
              },
              series: [{
                name: 'Test Results',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                label: {
                  show: true,
                  position: 'outside',
                  formatter: function(params) {
                    return params.name + ': ' + params.value + ' (' + params.percent + '%)';
                  },
                  fontSize: 12,
                  fontWeight: 'bold'
                },
                emphasis: {
                  label: {
                    show: true,
                    fontSize: 16,
                    fontWeight: 'bold'
                  }
                },
                labelLine: {
                  show: true,
                  length: 15,
                  length2: 10
                },
                data: [
                  { 
                    value: ${stats.passedScenarios}, 
                    name: 'Passed',
                    itemStyle: { color: '#22c55e' }
                  },
                  { 
                    value: ${stats.failedScenarios}, 
                    name: 'Failed',
                    itemStyle: { color: '#ef4444' }
                  },
                  { 
                    value: ${stats.skippedScenarios}, 
                    name: 'Skipped',
                    itemStyle: { color: '#f59e0b' }
                  }
                ]
              }, {
                name: 'Total',
                type: 'pie',
                radius: ['0%', '35%'],
                center: ['50%', '45%'],
                silent: true,
                label: {
                  show: true,
                  position: 'center',
                  formatter: function() {
                    return '{total|${stats.totalScenarios}}\\n{label|Total Tests}';
                  },
                  rich: {
                    total: {
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: '#374151'
                    },
                    label: {
                      fontSize: 12,
                      color: '#6b7280'
                    }
                  }
                },
                data: [{
                  value: 1,
                  itemStyle: { color: 'transparent' }
                }]
              }]
            };

            if (passFailOption && typeof passFailOption === 'object') {
              passFailChart.setOption(passFailOption);
            }

            window.addEventListener('resize', function() {
              passFailChart.resize();
            });
          }
        } catch (error) {
          console.error('Error initializing pass/fail chart:', error);
        }

        // Timeline Chart with ECharts
        try {
          const timelineChartDom = document.getElementById('timelineChart');
          const timelineData = ${JSON.stringify(ReportChartData.getTimelineData(features))};
          
          if (timelineChartDom && typeof echarts !== 'undefined') {
            const timelineChart = echarts.init(timelineChartDom, null, {
              renderer: 'svg',
              useDirtyRect: false,
            });

            const timelineOption = {
              tooltip: {
                trigger: 'axis',
                axisPointer: {
                  type: 'cross',
                },
                formatter: function(params) {
                  const param = params[0];
                  const value = param.value;
                  const seconds = (value / 1000).toFixed(2);
                  const status = value > 15000 ? 'Failed' : 'Passed';
                  return [
                    '<div style="font-weight: bold;">Feature: ' + param.name + '</div>',
                    '<div>Duration: ' + value + 'ms (' + seconds + 's)</div>',
                    '<div>Status: <span style="color: ' + (status === 'Failed' ? '#ef4444' : '#22c55e') + ';">' + status + '</span></div>'
                  ].join('');
                }
              },
              toolbox: {
                feature: {
                  saveAsImage: {
                    title: 'Save as Image',
                    name: 'timeline-chart'
                  },
                  magicType: {
                    type: ['line', 'bar'],
                    title: {
                      line: 'Switch to Line Chart',
                      bar: 'Switch to Bar Chart'
                    }
                  },
                  dataZoom: {
                    show: true,
                    title: {
                      zoom: 'Data Zoom',
                      back: 'Reset Zoom'
                    }
                  },
                  restore: {
                    title: 'Reset'
                  }
                },
                right: 20,
                top: 20
              },
              grid: {
                left: '8%',
                right: '10%',
                bottom: '12%',
                top: '20%',
                containLabel: true,
              },
              xAxis: {
                type: 'category',
                data: timelineData.labels,
                axisLabel: {
                  rotate: 45,
                  fontSize: 13,
                  color: '#374151',
                  fontWeight: '500'
                },
                axisLine: {
                  lineStyle: {
                    color: '#d1d5db',
                    width: 2
                  }
                }
              },
              yAxis: {
                type: 'value',
                name: 'Duration (ms)',
                nameLocation: 'middle',
                nameGap: 80,
                nameTextStyle: {
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: '600'
                },
                axisLabel: {
                  formatter: '{value}ms',
                  color: '#374151',
                  fontSize: 12,
                  fontWeight: '500'
                },
                axisLine: {
                  lineStyle: {
                    color: '#d1d5db',
                    width: 2
                  }
                },
                splitLine: {
                  lineStyle: {
                    color: '#e5e7eb',
                    type: 'dashed'
                  }
                }
              },
              series: [{
                name: 'Feature Duration',
                type: 'bar',
                data: timelineData.durations.map((duration, index) => ({
                  value: duration,
                  itemStyle: {
                    color: timelineData.colors[index]
                  }
                })),
                barMaxWidth: 100,
                label: {
                  show: true,
                  position: 'top',
                  formatter: '{c}ms',
                  fontSize: 12,
                  color: '#1f2937',
                  fontWeight: 'bold',
                  distance: 8
                },
                emphasis: {
                  itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                  }
                }
              }]
            };

            if (timelineOption && typeof timelineOption === 'object') {
              timelineChart.setOption(timelineOption);
            }

            window.addEventListener('resize', function() {
              timelineChart.resize();
            });
            
            // Store chart instance globally for potential future use
            window.timelineChart = timelineChart;
          }
        } catch (error) {
          console.error('Error initializing timeline chart:', error);
        }

        // Error Categories Chart with ECharts
        try {
          const errorChartDom = document.getElementById('errorChart');
          const errorData = ${JSON.stringify(ReportChartData.getErrorChartData(features))};
          
          if (errorChartDom && typeof echarts !== 'undefined') {
            const errorChart = echarts.init(errorChartDom, null, {
              renderer: 'svg',
              useDirtyRect: false,
            });

            const errorOption = {
              tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} errors'
              },
              toolbox: {
                feature: {
                  saveAsImage: {
                    title: 'Save as Image',
                    name: 'error-categories'
                  },
                  dataZoom: {
                    show: true,
                    title: {
                      zoom: 'Data Zoom',
                      back: 'Reset Zoom'
                    }
                  },
                  restore: {
                    title: 'Reset'
                  }
                },
                right: 10,
                top: 10
              },
              grid: {
                left: '8%',
                right: '8%',
                bottom: '20%',
                top: '20%',
                containLabel: true
              },
              legend: {
                orient: 'horizontal',
                bottom: '5%',
                left: 'center'
              },
              series: [{
                name: 'Error Types',
                type: 'pie',
                radius: '60%',
                center: ['50%', '40%'],
                roseType: 'area',
                itemStyle: {
                  borderRadius: 8
                },
                label: {
                  show: true,
                  formatter: '{b}: {c}'
                },
                emphasis: {
                  label: {
                    show: true,
                    fontSize: 14,
                    fontWeight: 'bold'
                  }
                },
                data: errorData.labels.map((label, index) => ({
                  value: errorData.counts[index],
                  name: label,
                  itemStyle: {
                    color: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4'][index % 5]
                  }
                }))
              }]
            };

            if (errorOption && typeof errorOption === 'object') {
              errorChart.setOption(errorOption);
            }

            window.addEventListener('resize', function() {
              errorChart.resize();
            });
          }
        } catch (error) {
          console.error('Error initializing error categories chart:', error);
        }
      }

      function filterByFeature() {
        const selectedFeature = document.getElementById('feature-filter').value;
        const features = document.querySelectorAll('[data-feature-id]');
        
        features.forEach(feature => {
          const featureName = feature.querySelector('h2').textContent.trim();
          if (!selectedFeature || featureName.includes(selectedFeature)) {
            feature.classList.remove('hidden');
          } else {
            feature.classList.add('hidden');
          }
        });
      }
      
      function filterByDuration() {
        const selectedDuration = document.getElementById('duration-filter').value;
        const scenarios = document.querySelectorAll('.scenario-card');
        
        scenarios.forEach(scenario => {
          const durationText = scenario.querySelector('[class*="duration"]')?.textContent || '0ms';
          const duration = parseInt(durationText.replace(/[^0-9]/g, '')) || 0;
          
          let show = true;
          if (selectedDuration === 'fast' && duration >= 1000) show = false;
          if (selectedDuration === 'medium' && (duration < 1000 || duration > 5000)) show = false;
          if (selectedDuration === 'slow' && duration <= 5000) show = false;
          
          if (show) {
            scenario.classList.remove('hidden');
          } else {
            scenario.classList.add('hidden');
          }
        });
      }
      
      function filterByError() {
        const selectedError = document.getElementById('error-filter').value;
        const scenarios = document.querySelectorAll('.scenario-card');
        
        scenarios.forEach(scenario => {
          const status = scenario.getAttribute('data-status');
          if (status !== 'failed' && selectedError) {
            scenario.classList.add('hidden');
            return;
          }
          
          if (!selectedError || status !== 'failed') {
            scenario.classList.remove('hidden');
            return;
          }
          
          const errorContent = scenario.textContent.toLowerCase();
          let show = false;
          
          switch(selectedError) {
            case 'assertion':
              show = errorContent.includes('assertion') || errorContent.includes('expected');
              break;
            case 'timeout':
              show = errorContent.includes('timeout') || errorContent.includes('timed out');
              break;
            case 'network':
              show = errorContent.includes('network') || errorContent.includes('connection');
              break;
            case 'element':
              show = errorContent.includes('element') || errorContent.includes('not found');
              break;
            default:
              show = true;
          }
          
          if (show) {
            scenario.classList.remove('hidden');
          } else {
            scenario.classList.add('hidden');
          }
        });
      }
      
      function exportToCSV() {
        const reportData = {
          metadata: {
            project: 'cypress-test',
            version: 'v1.0.0',
            environment: 'Development',
            generatedAt: new Date().toISOString(),
            totalScenarios: ${stats.totalScenarios},
            passedScenarios: ${stats.passedScenarios},
            failedScenarios: ${stats.failedScenarios},
            skippedScenarios: ${stats.skippedScenarios},
            passRate: ${stats.passRate}
          },
          features: ${JSON.stringify(features)}
        };
        
        const csvData = [];
        const headers = [
          'Feature Name', 'Scenario Name', 'Step Name', 'Status', 'Duration (ms)', 'Error Message'
        ];
        csvData.push(headers);
        
        reportData.features.forEach(feature => {
          if (feature.elements && feature.elements.length > 0) {
            feature.elements.forEach(scenario => {
              if (scenario.steps && scenario.steps.length > 0) {
                scenario.steps.forEach(step => {
                  const row = [
                    feature.name || 'Unknown Feature',
                    scenario.name || 'Unknown Scenario',
                    step.name || 'Unknown Step',
                    step.result?.status || 'unknown',
                    Math.round((step.result?.duration || 0) / 1000000),
                    (step.result?.error_message || '').replace(/"/g, '""')
                  ];
                  csvData.push(row);
                });
              }
            });
          }
        });
        
        const csvContent = csvData.map(row => row.join(',')).join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'cypress-test-Test-Report-' + new Date().toISOString().split('T')[0] + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      function exportToJSON() {
        const reportData = {
          metadata: {
            project: 'cypress-test',
            version: 'v1.0.0',
            environment: 'Development',
            generatedAt: new Date().toISOString(),
            totalScenarios: ${stats.totalScenarios},
            passedScenarios: ${stats.passedScenarios},
            failedScenarios: ${stats.failedScenarios},
            skippedScenarios: ${stats.skippedScenarios},
            passRate: ${stats.passRate}
          },
          features: ${JSON.stringify(features, null, 2)}
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cypress-test-test-report.json';
        a.click();
        window.URL.revokeObjectURL(url);
      }

      document.addEventListener('DOMContentLoaded', function() {
        initializeCharts();
        document.getElementById('collapse-btn').classList.add('active');
        document.getElementById('expand-btn').classList.remove('active');
      });

      window.toggleFeature = toggleFeature;
      window.toggleScenario = toggleScenario;
      window.expandAll = expandAll;
      window.collapseAll = collapseAll;
      window.handleSearch = handleSearch;
      window.filterScenarios = filterScenarios;
      window.filterByFeature = filterByFeature;
      window.filterByDuration = filterByDuration;
      window.filterByError = filterByError;
      window.exportToCSV = exportToCSV;
      window.exportToJSON = exportToJSON;
      window.openScreenshot = openScreenshot;
      window.closeScreenshot = closeScreenshot;
    </script>
    `;
  }
}
