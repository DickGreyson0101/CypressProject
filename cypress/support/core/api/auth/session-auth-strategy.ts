/**
 * Session-based Authentication Strategy
 * For cypress-realworld-app which uses session cookies
 */

import { AuthenticationStrategy } from './auth-strategy.interface';
import { TestDataUtil } from '@support/utilities/test-data.util';

export class SessionAuthStrategy implements AuthenticationStrategy {
  private isAuthenticated = false;

  /**
   * Get token (for session-based auth, we just ensure we're logged in)
   */
  getToken(): Cypress.Chainable<string> {
    if (this.isAuthenticated) {
      return cy.wrap('session-authenticated');
    }

    return this.performLogin().then(() => {
      this.isAuthenticated = true;
      return 'session-authenticated';
    });
  }

  /**
   * Refresh token (re-login)
   */
  refreshToken(): Cypress.Chainable<string> {
    this.isAuthenticated = false;
    return this.getToken();
  }

  /**
   * Check if token is valid (check if session is still active)
   */
  isTokenValid(): Cypress.Chainable<boolean> {
    return cy.request({
      method: 'GET',
      url: `${Cypress.env('apiBaseUrl')}/checkAuth`,
      failOnStatusCode: false
    }).then((response) => {
      const isValid = response.status === 200;
      this.isAuthenticated = isValid;
      return isValid;
    });
  }

  /**
   * Clear token (logout)
   */
  clearToken(): void {
    this.isAuthenticated = false;
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiBaseUrl')}/logout`,
      failOnStatusCode: false
    });
  }

  /**
   * Perform login to establish session
   */
  private performLogin(): Cypress.Chainable<void> {
    const user = TestDataUtil.getUserFromConfig('admin');
    
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('apiBaseUrl')}/login`,
      body: {
        username: user.username,
        password: user.password
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      // Session cookie is automatically handled by Cypress
    });
  }
}


