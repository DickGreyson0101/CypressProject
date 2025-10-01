/**
 * Authentication Strategy Interface
 */

export interface AuthenticationStrategy {
  /**
   * Get authentication token
   */
  getToken(): Cypress.Chainable<string>;

  /**
   * Refresh authentication token
   */
  refreshToken(): Cypress.Chainable<string>;

  /**
   * Check if token is valid
   */
  isTokenValid(): Cypress.Chainable<boolean>;

  /**
   * Clear stored token
   */
  clearToken(): void;
}


