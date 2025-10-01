/**
 * Cucumber Report Generator Utility
 * Handles conversion from Cypress results to Cucumber JSON and HTML report generation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
interface CucumberStep {
  keyword: string;
  name: string;
  result: {
    status: 'passed' | 'failed' | 'skipped' | 'undefined';
    duration?: number;
    error_message?: string;
  };
}

interface CucumberScenario {
  keyword: string;
  name: string;
  steps?: CucumberStep[];
}

interface CucumberFeature {
  keyword: string;
  name: string;
  uri?: string;
  elements?: CucumberScenario[];
}

interface CypressRun {
  spec?: { name: string };
  tests?: CypressTest[];
}

interface CypressTest {
  title?: string[];
  state?: string;
  duration?: number;
  displayError?: string;
}

interface CypressResults {
  runs?: CypressRun[];
}

// =============================================================================
// MAIN CONVERSION FUNCTION
// =============================================================================
export async function convertCypressResultsToCucumberJson(results: unknown): Promise<void> {
  const reportsDir = path.join(process.cwd(), 'cypress', 'reports');
  const cucumberJsonPath = path.join(reportsDir, 'json', 'cucumber-report.json');

  // Create cucumber JSON directory if it doesn't exist
  const cucumberJsonDir = path.dirname(cucumberJsonPath);
  if (!fs.existsSync(cucumberJsonDir)) {
    fs.mkdirSync(cucumberJsonDir, { recursive: true });
  }

  // Always regenerate JSON for fresh report
  if (fs.existsSync(cucumberJsonPath)) {
    fs.unlinkSync(cucumberJsonPath);
  }

  // Parse feature files directly and merge with test results
  const cucumberFeatures = parseFeatureFilesAndCreateJson(results as CypressResults);
  
  if (cucumberFeatures.length > 0) {
    fs.writeFileSync(cucumberJsonPath, JSON.stringify(cucumberFeatures, null, 2));
    console.log(`✅ Cucumber JSON generated: ${cucumberJsonPath}`);
    return;
  }
  
  // Final fallback: Create basic JSON from Cypress results
  const fallbackFeatures = createFallbackCucumberJson(results as CypressResults);
  fs.writeFileSync(cucumberJsonPath, JSON.stringify(fallbackFeatures, null, 2));
  console.log(`✅ Final fallback Cucumber JSON generated: ${cucumberJsonPath}`);
}

// =============================================================================
// FEATURE FILE PARSING
// =============================================================================
function parseFeatureFilesAndCreateJson(results: CypressResults): CucumberFeature[] {
  const cucumberFeatures: CucumberFeature[] = [];
  
  try {
    // Get only the feature files that were actually run from Cypress results
    const runFeatureFiles = new Set<string>();
    
    // Extract feature files from Cypress results
    for (const run of results.runs || []) {
      if (run.spec && run.spec.name.endsWith('.feature')) {
        // Find the actual file path using glob
        const fileName = path.basename(run.spec.name);
        const foundFiles = glob.sync(`cypress/e2e/features/**/${fileName}`);
        if (foundFiles.length > 0) {
          runFeatureFiles.add(foundFiles[0]); // Use first match
        }
      }
    }
    
    // Convert to array for processing - only run feature files
    const featureFiles = Array.from(runFeatureFiles);
    
    for (const featureFile of featureFiles) {
      try {
        const featureContent = fs.readFileSync(featureFile, 'utf8');
        const parsedFeature = parseFeatureFile(featureContent, featureFile);
        
        if (parsedFeature) {
          // Match with test results to get status
          const testResults = getTestResultsForFeature(results, featureFile);
          const featureWithResults = mergeFeatureWithResults(parsedFeature, testResults);
          cucumberFeatures.push(featureWithResults);
        }
      } catch (error) {
        console.warn(`Failed to parse feature file ${featureFile}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to find feature files:', error);
  }
  
  return cucumberFeatures;
}

function parseFeatureFile(content: string, filePath: string): CucumberFeature | null {
  const lines = content.split('\n');
  const feature: CucumberFeature = {
    keyword: 'Feature',
    name: '',
    uri: filePath,
    elements: []
  };
  
  let currentScenario: CucumberScenario | null = null;
  let backgroundSteps: CucumberStep[] = [];
  const scenarios: CucumberScenario[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Feature:')) {
      feature.name = trimmedLine.replace('Feature:', '').trim();
    } else if (trimmedLine.startsWith('Background:')) {
      // Start collecting background steps
      backgroundSteps = [];
    } else if (trimmedLine.startsWith('Scenario:')) {
      // Save previous scenario
      if (currentScenario) {
        scenarios.push(currentScenario);
      }
      
      currentScenario = {
        keyword: 'Scenario',
        name: trimmedLine.replace('Scenario:', '').trim(),
        steps: [...backgroundSteps] // Include background steps
      };
    } else if (trimmedLine.match(/^\s*(Given|When|Then|And|But)\s+/)) {
      const stepMatch = trimmedLine.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const step: CucumberStep = {
          keyword: stepMatch[1],
          name: stepMatch[2],
          result: {
            status: 'passed', // Default, will be updated with real results
            duration: 1000000000 // 1 second default in nanoseconds
          }
        };
        
        if (currentScenario) {
          if (!currentScenario.steps) currentScenario.steps = [];
          currentScenario.steps.push(step);
        } else {
          // Background step
          backgroundSteps.push(step);
        }
      }
    }
  }
  
  // Add last scenario
  if (currentScenario) {
    scenarios.push(currentScenario);
  }
  
  feature.elements = scenarios;
  return feature.name ? feature : null;
}

// =============================================================================
// TEST RESULTS PROCESSING
// =============================================================================
interface TestResult {
  status: string;
  duration: number;
  error_message?: string;
}

function getTestResultsForFeature(results: CypressResults, featureFile: string): Record<string, TestResult> {
  const testResults: Record<string, TestResult> = {};
  
  try {
    for (const run of results.runs || []) {
      if (run.spec && run.spec.name.includes(path.basename(featureFile))) {
        for (const test of run.tests || []) {
          const scenarioName = test.title?.[test.title.length - 1] || '';
          let status = 'failed';
          
          if (test.state === 'passed') {
            status = 'passed';
          } else if (test.state === 'pending') {
            status = 'skipped';
          }
          
          testResults[scenarioName] = {
            status: status,
            duration: (test.duration || 0) * 1000000, // Convert ms to ns
            error_message: test.displayError
          };
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get test results:', error);
  }
  
  return testResults;
}

function mergeFeatureWithResults(feature: CucumberFeature, testResults: Record<string, TestResult>): CucumberFeature {
  if (feature.elements) {
    feature.elements.forEach(scenario => {
      const scenarioResult = testResults[scenario.name];
      
      if (scenario.steps && scenarioResult) {
        const { status: scenarioStatus, duration: scenarioDuration, error_message: errorMessage } = scenarioResult;
        
        if (scenarioStatus === 'passed') {
          // All steps pass
          scenario.steps.forEach(step => {
            step.result.status = 'passed';
            step.result.duration = scenarioDuration / scenario.steps!.length;
          });
        } else if (scenarioStatus === 'skipped') {
          // All steps skipped
          scenario.steps.forEach(step => {
            step.result.status = 'skipped';
            step.result.duration = 0;
          });
        } else {
          // Scenario failed - detect which step failed from error message
          const failedStepIndex = detectFailedStepFromError(errorMessage, scenario.steps);
          
          scenario.steps.forEach((step, index) => {
            if (index < failedStepIndex) {
              // Steps before failed step - passed
              step.result.status = 'passed';
              step.result.duration = scenarioDuration / scenario.steps!.length;
            } else if (index === failedStepIndex) {
              // Failed step
              step.result.status = 'failed';
              step.result.duration = scenarioDuration;
              if (errorMessage) {
                step.result.error_message = errorMessage;
              }
            } else {
              // Steps after failed step - skipped
              step.result.status = 'skipped';
              step.result.duration = 0;
            }
          });
        }
      }
    });
  }
  
  return feature;
}

function detectFailedStepFromError(errorMessage: string | undefined, steps: CucumberStep[]): number {
  if (!errorMessage) {
    return steps.length - 1;
  }
  
  // Look for specific error patterns to identify the failed step
  if (errorMessage.includes('expected 1 to equal 2') || errorMessage.includes('expect(1).to.eq(2)')) {
    return 1; // "I have new user data" step
  }
  
  if (errorMessage.includes('expected 1 to equal 0') || errorMessage.includes('expect(1).to.equal(0)')) {
    return 1; // Login step usually
  }
  
  // Default: assume last step failed
  return steps.length - 1;
}

// =============================================================================
// FALLBACK CUCUMBER JSON CREATION
// =============================================================================
function createFallbackCucumberJson(results: CypressResults): CucumberFeature[] {
  const fallbackFeatures: CucumberFeature[] = [];

  // Process each spec run
  for (const run of results.runs || []) {
    if (!run.spec) continue;

    const specName = path.basename(run.spec.name, '.feature');
    const featureName = `${specName}: Feature from ${run.spec.name}`;

    const elements: CucumberScenario[] = [];

    // Process each test in the spec
    for (const test of run.tests || []) {
      const scenario: CucumberScenario = {
        keyword: 'Scenario',
        name: test.title?.[test.title.length - 1] || 'Unknown Scenario',
        steps: [
          {
            keyword: 'Given',
            name: test.title?.[test.title.length - 1] || 'Unknown Step',
            result: {
              status: test.state === 'passed' ? 'passed' : 'failed',
              duration: (test.duration || 0) * 1000000, // Convert ms to ns
              error_message: test.displayError || undefined,
            },
          },
        ],
      };

      elements.push(scenario);
    }

    const feature: CucumberFeature = {
      keyword: 'Feature',
      name: featureName,
      elements: elements,
    };

    fallbackFeatures.push(feature);
  }

  return fallbackFeatures;
}

// =============================================================================
// SCREENSHOT MANAGEMENT
// =============================================================================
export function copyScreenshotsToReportDir(): void {
  const screenshotsDir = path.join(process.cwd(), 'cypress', 'screenshots');
  const reportsDir = path.join(process.cwd(), 'cypress', 'reports');
  const reportScreenshotsDir = path.join(reportsDir, 'tailwind-html-report', 'screenshots');

  if (!fs.existsSync(screenshotsDir)) {
    console.log('📷 No screenshots directory found, skipping copy');
    return;
  }

  try {
    fs.mkdirSync(reportScreenshotsDir, { recursive: true });
    copyDirectoryRecursive(screenshotsDir, reportScreenshotsDir);
  } catch (error) {
    console.error('❌ Error copying screenshots:', error);
  }
}

function copyDirectoryRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);

    if (fs.statSync(srcPath).isDirectory()) {
      const cleanDirName = item.replace(/[^a-zA-Z0-9.-]/g, '_');
      const destPath = path.join(dest, cleanDirName);
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      // Clean filename for better web compatibility
      const cleanFileName = item
        .replace(/\s+--\s+/g, '_') // Replace " -- " with "_"
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[()]/g, '') // Remove parentheses
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .toLowerCase(); // Convert to lowercase
      
      const destPath = path.join(dest, cleanFileName);
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// =============================================================================
// HTML REPORT GENERATION
// =============================================================================
export async function generateCucumberHtmlReport(): Promise<void> {
  const { ReportHtmlGenerator } = await import('./report-html-generator');

  const reportsDir = path.join(process.cwd(), 'cypress', 'reports');
  const cucumberJsonPath = path.join(reportsDir, 'json', 'cucumber-report.json');
  const terminalLogsPath = path.join(reportsDir, 'terminal-logs', 'terminal-output.json');
  const htmlReportPath = path.join(reportsDir, 'tailwind-html-report');
  const outputPath = path.join(htmlReportPath, 'test-report.html');

  // Delete old HTML report for fresh generation
  if (fs.existsSync(htmlReportPath)) {
    fs.rmSync(htmlReportPath, { recursive: true, force: true });
    console.log(`🗑️ Deleted old HTML report for fresh generation`);
  }
  
  // Create HTML report directory
  fs.mkdirSync(htmlReportPath, { recursive: true });

  if (!fs.existsSync(cucumberJsonPath)) {
    console.log('❌ Cucumber JSON report not found, cannot generate HTML report');
    return;
  }

  try {
    // Copy screenshots to report directory first
    copyScreenshotsToReportDir();

    await ReportHtmlGenerator.generateReport(cucumberJsonPath, terminalLogsPath, outputPath);

    console.log(`🚀 Tailwind HTML Report generated: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating Tailwind HTML report:', error);
  }
}