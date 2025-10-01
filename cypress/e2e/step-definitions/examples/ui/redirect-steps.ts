import { When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { NavigationPage } from '@support/page-objects/pages/navigation.page';

let navigationPage: NavigationPage;

When('I visit a protected page without authentication', () => {
  navigationPage = new NavigationPage();
  cy.visit('/personal');
});

Then('I should be redirected to the signin page', () => {
  navigationPage.verifyCurrentPage('/signin');
});
