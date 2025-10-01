/**
 * Cypress Configuration
 * Main configuration file for Cypress E2E testing
 */

import { defineConfig } from 'cypress';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import * as fs from 'fs';
import * as path from 'path';

// Import report generation utilities
import { 
  convertCypressResultsToCucumberJson, 
  generateCucumberHtmlReport 
} from './cypress/support/utils/report/cucumber-report-generator';

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================
const getConfigurationByFile = (env: string) => {
  const pathToConfigFile = path.resolve('.', 'config', `${env}.json`);
  return JSON.parse(fs.readFileSync(pathToConfigFile, 'utf8'));
};


// =============================================================================
// CYPRESS CONFIGURATION
// =============================================================================
export default defineConfig({
  // Global settings
  viewportWidth: 1920,
  viewportHeight: 1080,
  pageLoadTimeout: 60000,
  defaultCommandTimeout: 15000,
  requestTimeout: 30000,
  responseTimeout: 30000,

  // Video & Screenshots
  video: false,
  videoCompression: 32,
  videosFolder: 'cypress/videos',
  screenshotsFolder: 'cypress/screenshots',
  screenshotOnRunFailure: true,

  // Retry configuration - disabled to avoid multiple retries
  retries: {
    runMode: 0,
    openMode: 0,
  },

  e2e: {
    // Cucumber integration
    specPattern: 'cypress/e2e/features/**/*.feature',
    supportFile: 'cypress/support/e2e.ts',

    async setupNodeEvents(on, config) {
      // Load environment configuration
      const environment = config.env.environment || 'local';
      const envConfig = getConfigurationByFile(environment);

      // Add cucumber preprocessor FIRST to avoid event handler conflicts
      await addCucumberPreprocessorPlugin(on, config);

      // ESBuild bundler for TypeScript
      const bundler = createBundler({
        plugins: [createEsbuildPlugin(config)],
      });

      on('file:preprocessor', bundler);

      // Clean old terminal logs for fresh generation
      const terminalLogsDir = path.join(config.projectRoot, 'cypress', 'reports', 'terminal-logs');
      if (fs.existsSync(terminalLogsDir)) {
        const files = fs.readdirSync(terminalLogsDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(terminalLogsDir, file));
        });
        console.log(`🗑️ Cleaned old terminal logs for fresh generation`);
      }

      // Cypress Terminal Report configuration
      require('cypress-terminal-report/src/installLogsPrinter')(on, {
        outputRoot: config.projectRoot + '/cypress/reports/',
        outputTarget: {
          'terminal-logs/terminal-output.txt': 'txt',
          'terminal-logs/terminal-output.json': 'json',
        },
        printLogsToConsole: 'onFail',
        printLogsToFile: 'always',
        includeSuccessfulHookLogs: false,
        compactLogs: 1,
        logToFilesOnAfterRun: false,
      });

      // Generate custom HTML report after all tests complete
      on('after:run', async results => {
        if (results && 'runs' in results) {
            await convertCypressResultsToCucumberJson(results);
          await generateCucumberHtmlReport();
        }
      });

      // Merge environment config into Cypress config
      return {
        ...config,
        baseUrl: envConfig.baseUrl,
        env: { ...config.env, ...envConfig, environment },
      };
    },
  },

  reporter: 'spec',
});
