import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { LoginPage } from '@support/page-objects/pages/login.page';
import { NavigationPage } from '@support/page-objects/pages/navigation.page';

let loginPage: LoginPage;
let navigationPage: NavigationPage;

Given('I am logged in to the application', () => {
  loginPage = new LoginPage();
  navigationPage = new NavigationPage();
  
  loginPage.visit();
  loginPage.loginWithConfigUser('admin');
  navigationPage.verifyUserLoggedIn();
});

When('I click on the user settings menu', () => {
  navigationPage.goToUserSettings();
});

Then('I should see the user settings page', () => {
  navigationPage.verifyCurrentPage('/user/settings');
  navigationPage.verifyPageContains('User Settings');
});
