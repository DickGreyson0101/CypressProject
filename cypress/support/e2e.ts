/**
 * Cypress E2E Support File
 * Global configuration and setup for all tests
 */

// =============================================================================
// IMPORTS
// =============================================================================
import './commands';
import { logger } from '@support/core/logging/test-logger';

// =============================================================================
// TERMINAL LOGGING SETUP
// =============================================================================
require('cypress-terminal-report/src/installLogsCollector')({
  collectTypes: ['cons:error', 'cy:log', 'cy:request'],
  xhr: {
    printHeaderData: false,
    printRequestData: false,
  },
});

// =============================================================================
// GLOBAL TEST HOOKS
// =============================================================================
beforeEach(() => {
  logger.info('Test execution started', {
    testName: Cypress.currentTest.title,
    specName: Cypress.spec.name,
    environment: Cypress.env('environment') || 'local',
  });
});

afterEach(() => {
  const testState = (Cypress.currentTest as unknown as { state: string }).state;
  
  logger.info('Test execution completed', {
    testName: Cypress.currentTest.title,
    state: testState,
  });
});

// =============================================================================
// COMMAND LOG UI CUSTOMIZATION
// =============================================================================
// Hide fetch/XHR rows in the Command Log UI
// NOTE: UI-only; doesn't affect network behavior
Cypress.on('window:before:load', (win) => {
  const app = win.parent;
  if (app && !app.document.head.querySelector('[data-hide-command-log-request]')) {
    const style = app.document.createElement('style');
    style.innerHTML = `
      .command-name-request, 
      .command-name-xhr { display: none !important; }
    `;
    style.setAttribute('data-hide-command-log-request', '');
    app.document.head.appendChild(style);
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================
Cypress.on('uncaught:exception', (err, runnable) => {
  const errorMessage = err.message.toLowerCase();
  
  // Known ignorable errors from third-party libraries
  const ignorableErrors = [
    'resizeobserver loop limit exceeded',
    'loading chunk',
    'script error',
    'network error when attempting to fetch resource',
  ];

  const shouldIgnore = ignorableErrors.some(ignorable => 
    errorMessage.includes(ignorable)
  );

  if (shouldIgnore) {
    logger.debug('Ignoring known third-party error', {
      error: err.message,
      testName: runnable.title,
    });
    return false;
  }

  // Log critical errors
  logger.error('Uncaught exception', {
    error: err.message,
    testName: runnable.title,
    specName: Cypress.spec.name,
  });

  return true; // Fail the test
});
