/**
 * Login Page Object
 * Handles all login page interactions
 */

import { BasePage } from '@support/page-objects/base/base.page';

export class LoginPage extends BasePage {
  // Selectors
  private readonly selectors = {
    usernameInput: '[data-test="signin-username"]',
    passwordInput: '[data-test="signin-password"]',
    submitButton: '[data-test="signin-submit"]',
    errorMessage: '[data-test="signin-error"]',
    signupLink: '[data-test="signup"]'
  };

  constructor() {
    super('/signin');
  }

  /**
   * Enter username
   */
  enterUsername(username: string): LoginPage {
    cy.getBySel('signin-username').find('input').clear().type(username);
    return this;
  }

  /**
   * Enter password
   */
  enterPassword(password: string): LoginPage {
    cy.getBySel('signin-password').find('input').clear().type(password);
    return this;
  }

  /**
   * Click submit button
   */
  clickSubmit(): LoginPage {
    cy.getBySel('signin-submit').click();
    return this;
  }

  /**
   * Login with credentials
   */
  loginWith(username: string, password: string): LoginPage {
    this.enterUsername(username);
    this.enterPassword(password);
    this.clickSubmit();
    return this;
  }

  /**
   * Login with config user
   */
  loginWithConfigUser(userRole: string = 'admin'): LoginPage {
    const users = Cypress.env('users');
    const user = users[userRole];
    
    if (!user) {
      throw new Error(`User with role "${userRole}" not found in config`);
    }

    this.loginWith(user.username, user.password);
    return this;
  }

  /**
   * Verify login error
   */
  verifyErrorMessage(expectedMessage?: string): LoginPage {
    cy.get(this.selectors.errorMessage).should('be.visible');
    if (expectedMessage) {
      cy.get(this.selectors.errorMessage).should('contain', expectedMessage);
    }
    return this;
  }

  /**
   * Verify successful login (redirect to home)
   */
  verifySuccessfulLogin(): LoginPage {
    cy.location('pathname').should('equal', '/121313');
    return this;
  }
}
