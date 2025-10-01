/**
 * Navigation Page Object
 * Handles navigation and common UI elements
 */

import { BasePage } from '@support/page-objects/base/base.page';

export class NavigationPage extends BasePage {
  // Selectors
  private readonly selectors = {
    userSettingsLink: '[data-test="sidenav-user-settings"]',
    homeLink: '[data-test="sidenav-home"]',
    personalLink: '[data-test="sidenav-personal"]',
    friendsLink: '[data-test="sidenav-friends"]',
    publicLink: '[data-test="sidenav-public"]',
    logoutButton: '[data-test="sidenav-signout"]',
    userBalance: '[data-test="sidenav-user-balance"]',
    userFullName: '[data-test="sidenav-user-full-name"]'
  };

  constructor() {
    super('/');
  }

  /**
   * Navigate to user settings
   */
  goToUserSettings(): NavigationPage {
    cy.getBySel('sidenav-user-settings').click();
    return this;
  }

  /**
   * Navigate to home
   */
  goToHome(): NavigationPage {
    cy.get(this.selectors.homeLink).click();
    return this;
  }

  /**
   * Navigate to personal transactions
   */
  goToPersonal(): NavigationPage {
    cy.get(this.selectors.personalLink).click();
    return this;
  }

  /**
   * Navigate to friends
   */
  goToFriends(): NavigationPage {
    cy.get(this.selectors.friendsLink).click();
    return this;
  }

  /**
   * Navigate to public transactions
   */
  goToPublic(): NavigationPage {
    cy.get(this.selectors.publicLink).click();
    return this;
  }

  /**
   * Logout
   */
  logout(): NavigationPage {
    cy.get(this.selectors.logoutButton).click();
    return this;
  }

  /**
   * Verify user is logged in
   */
  verifyUserLoggedIn(): NavigationPage {
    cy.getBySel('sidenav-user-full-name').should('be.visible');
    cy.getBySel('sidenav-user-balance').should('be.visible');
    return this;
  }

  /**
   * Verify current page
   */
  verifyCurrentPage(expectedPath: string): NavigationPage {
    cy.location('pathname').should('equal', expectedPath);
    return this;
  }

  /**
   * Verify page contains text
   */
  verifyPageContains(text: string): NavigationPage {
    cy.contains(text).should('be.visible');
    return this;
  }
}
