/**
 * Custom Cypress Commands - Simple and clean
 */

// Add getBySel command from cypress-realworld-app
Cypress.Commands.add('getBySel', (selector: string, ...args: unknown[]) => {
  return cy.get(`[data-test=${selector}]`, ...args);
});

/**
 * Enhanced logging commands for better test maintainability
 */

// Enhanced logging commands
Cypress.Commands.add('logStep', (message: string): Cypress.Chainable<void> => {
  cy.log(`🔄 STEP: ${message}`);
  return cy.wrap(undefined);
});

Cypress.Commands.add('logInfo', (message: string, data?: Record<string, unknown>): Cypress.Chainable<void> => {
  if (data) {
    cy.log(`ℹ️ INFO: ${message}`, data);
  } else {
    cy.log(`ℹ️ INFO: ${message}`);
  }
  return cy.wrap(undefined);
});

Cypress.Commands.add('logWarning', (message: string, data?: Record<string, unknown>): Cypress.Chainable<void> => {
  if (data) {
    cy.log(`⚠️ WARNING: ${message}`, data);
  } else {
    cy.log(`⚠️ WARNING: ${message}`);
  }
  return cy.wrap(undefined);
});

Cypress.Commands.add('logError', (message: string, error?: Error | Record<string, unknown>): Cypress.Chainable<void> => {
  if (error) {
    cy.log(`❌ ERROR: ${message}`, error);
  } else {
    cy.log(`❌ ERROR: ${message}`);
  }
  return cy.wrap(undefined);
});

// Custom command declarations
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select elements by data-test attribute (from cypress-realworld-app)
       */
      getBySel(selector: string, ...args: unknown[]): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to log test steps
       */
      logStep(message: string): Chainable<void>;

      /**
       * Custom command to log information
       */
      logInfo(message: string, data?: Record<string, unknown>): Chainable<void>;

      /**
       * Custom command to log warnings
       */
      logWarning(message: string, data?: Record<string, unknown>): Chainable<void>;

      /**
       * Custom command to log errors
       */
      logError(message: string, error?: Error | Record<string, unknown>): Chainable<void>;
    }
  }
}