import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { LoginPage } from '@support/page-objects/pages/login.page';

let loginPage: LoginPage;

Given('I visit the signin page', () => {
  loginPage = new LoginPage();
  loginPage.visit();
});

When('I enter valid credentials', () => {
  loginPage.loginWithConfigUser('admin');
  expect(1).to.equal(0);
});

When('I click the sign in button', () => {
  // Already handled in loginWithConfigUser
});

When('I enter invalid credentials', function() {
  this.skip();
});

Then('I should see error message', function() {
  this.skip();
});

Then('I should be redirected to the home page', () => {
  loginPage.verifySuccessfulLogin();
});
