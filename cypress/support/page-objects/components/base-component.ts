/**
 * Base Component - Foundation for all UI components
 * Enhanced from Old_PlayWright Page Factory pattern with Cypress integration
 */

import { logger } from '@support/core/logging/test-logger';
import { ErrorType as _ErrorType } from '@support/core/error/error-handler';

export interface ComponentOptions {
  timeout?: number;
  retries?: number;
  waitForStable?: boolean;
}

export abstract class BaseComponent {
  protected rootSelector: string;
  protected name: string;

  constructor(rootSelector: string, name: string) {
    this.rootSelector = rootSelector;
    this.name = name;
  }

  /**
   * Get the root element of the component
   */
  public getRoot(options?: ComponentOptions): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getElement(this.rootSelector, options);
  }

  /**
   * Check if component is visible
   */
  public isVisible(options?: ComponentOptions): Cypress.Chainable<boolean> {
    logger.debug(`Checking visibility of ${this.name}`);

    return cy
      .then(() => {
        return cy.get(this.rootSelector, { timeout: options?.timeout || 4000 }).then($el => {
          return $el.is(':visible');
        });
      })
      .then(isVisible => {
        return isVisible;
      });
  }

  /**
   * Wait for component to be visible
   */
  public waitForVisible(timeout?: number): Cypress.Chainable<void> {
    logger.step(`Waiting for ${this.name} to be visible`);

    return this.getRoot({ timeout })
      .should('be.visible')
      .then(() => {
        logger.debug(`✅ ${this.name} is now visible`);
        return cy.wrap(undefined);
      }) as Cypress.Chainable<void>;
  }

  /**
   * Wait for component to be hidden
   */
  public waitForHidden(timeout?: number): Cypress.Chainable<void> {
    logger.step(`Waiting for ${this.name} to be hidden`);

    return cy
      .get(this.rootSelector, { timeout })
      .should('not.exist')
      .then(() => {
        logger.debug(`✅ ${this.name} is now hidden`);
        return cy.wrap(undefined);
      }) as Cypress.Chainable<void>;
  }

  /**
   * Get child element within component
   */
  protected getElement(selector: string, options?: ComponentOptions): Cypress.Chainable<JQuery<HTMLElement>> {
    const timeout = options?.timeout || Cypress.config('defaultCommandTimeout');

    return cy
      .get(selector, { timeout })
      .should('exist')
      .then(element => {
        if (options?.waitForStable) {
          return this.waitForElementStable(element);
        }
        return element;
      }) as Cypress.Chainable<JQuery<HTMLElement>>;
  }

  /**
   * Get multiple elements within component
   */
  protected getElements(selector: string, options?: ComponentOptions): Cypress.Chainable<JQuery<HTMLElement>> {
    const timeout = options?.timeout || Cypress.config('defaultCommandTimeout');

    return cy.get(selector, { timeout });
  }

  /**
   * Click element with error handling and logging
   */
  protected clickElement(selector: string, options?: ComponentOptions): Cypress.Chainable<void> {
    logger.step(`Clicking element: ${selector} in ${this.name}`);

    return this.getElement(selector, options)
      .should('be.visible')
      .should('not.be.disabled')
      .click()
      .then(() => {
        logger.debug(`✅ Successfully clicked ${selector}`);
        return cy.wrap(undefined);
      }) as Cypress.Chainable<void>;
  }

  /**
   * Type text into element with validation
   */
  protected typeText(
    selector: string,
    text: string,
    options?: ComponentOptions & { clear?: boolean }
  ): Cypress.Chainable<void> {
    logger.step(`Typing text into ${selector}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

    return this.getElement(selector, options)
      .should('be.visible')
      .should('not.be.disabled')
      .then(element => {
        if (options?.clear !== false) {
          return cy.wrap(element).clear();
        }
        return cy.wrap(element);
      })
      .type(text)
      .then(() => {
        logger.debug(`✅ Successfully typed text into ${selector}`);
        return cy.wrap(undefined);
      }) as Cypress.Chainable<void>;
  }

  /**
   * Get text content from element
   */
  protected getText(selector: string, options?: ComponentOptions): Cypress.Chainable<string> {
    return this.getElement(selector, options)
      .invoke('text')
      .then(text => text.trim());
  }

  /**
   * Get attribute value from element
   */
  protected getAttribute(selector: string, attribute: string, options?: ComponentOptions): Cypress.Chainable<string> {
    return this.getElement(selector, options)
      .invoke('attr', attribute)
      .then(value => value || '');
  }

  /**
   * Select option from dropdown
   */
  protected selectOption(selector: string, value: string, options?: ComponentOptions): Cypress.Chainable<void> {
    logger.step(`Selecting option '${value}' from ${selector}`);

    return this.getElement(selector, options)
      .should('be.visible')
      .select(value)
      .then(() => {
        logger.debug(`✅ Successfully selected option: ${value}`);
        return cy.wrap(undefined);
      }) as Cypress.Chainable<void>;
  }

  /**
   * Wait for element to be stable (not moving/changing)
   */
  private waitForElementStable(element: JQuery<HTMLElement>): Cypress.Chainable<JQuery<HTMLElement>> {
    let previousPosition: { top: number; left: number } | null = null;

    return cy.wrap(element).then(el => {
      const currentPosition = el.offset();

      if (currentPosition && previousPosition) {
        const isStable = currentPosition.top === previousPosition.top && currentPosition.left === previousPosition.left;

        if (!isStable) {
          cy.wait(100);
          return this.waitForElementStable(el);
        }
      }

      previousPosition = currentPosition || null;
      return el;
    }) as Cypress.Chainable<JQuery<HTMLElement>>;
  }

  /**
   * Take screenshot of component
   */
  public takeScreenshot(name?: string): Cypress.Chainable<void> {
    const screenshotName = name || `${this.name}-${Date.now()}`;
    logger.debug(`Taking screenshot: ${screenshotName}`);

    return this.getRoot()
      .screenshot(screenshotName)
      .then(() => {
        logger.debug(`✅ Screenshot saved: ${screenshotName}`);
        return cy.wrap(undefined);
      }) as Cypress.Chainable<void>;
  }
}
