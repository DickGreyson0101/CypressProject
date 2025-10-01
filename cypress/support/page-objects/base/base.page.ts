/**
 * Base Page Object
 * Common functionality for all page objects
 */

export abstract class BasePage {
  protected readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Visit the page
   */
  visit(): this {
    cy.visit(this.url);
    return this;
  }

  /**
   * Get page URL
   */
  getUrl(): string {
    return this.url;
  }

  /**
   * Wait for page to load
   */
  waitForPageLoad(): this {
    cy.location('pathname').should('include', this.url);
    return this;
  }

  /**
   * Verify page title
   */
  verifyTitle(expectedTitle: string): this {
    cy.title().should('contain', expectedTitle);
    return this;
  }

  /**
   * Verify element exists
   */
  verifyElementExists(selector: string): this {
    cy.get(selector).should('exist');
    return this;
  }

  /**
   * Verify element is visible
   */
  verifyElementVisible(selector: string): this {
    cy.get(selector).should('be.visible');
    return this;
  }

  /**
   * Verify element contains text
   */
  verifyElementContainsText(selector: string, text: string): this {
    cy.get(selector).should('contain', text);
    return this;
  }

  /**
   * Click element
   */
  clickElement(selector: string): this {
    cy.get(selector).click();
    return this;
  }

  /**
   * Type text into element
   */
  typeText(selector: string, text: string): this {
    cy.get(selector).clear().type(text);
    return this;
  }

  /**
   * Get element by data-test attribute
   */
  getByTestId(testId: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-test="${testId}"]`);
  }

  /**
   * Click element by data-test attribute
   */
  clickByTestId(testId: string): this {
    this.getByTestId(testId).click();
    return this;
  }

  /**
   * Type text into element by data-test attribute
   */
  typeByTestId(testId: string, text: string): this {
    this.getByTestId(testId).clear().type(text);
    return this;
  }

  /**
   * Verify element by data-test attribute is visible
   */
  verifyTestIdVisible(testId: string): this {
    this.getByTestId(testId).should('be.visible');
    return this;
  }

  /**
   * Verify element by data-test attribute contains text
   */
  verifyTestIdContainsText(testId: string, text: string): this {
    this.getByTestId(testId).should('contain', text);
    return this;
  }
}


