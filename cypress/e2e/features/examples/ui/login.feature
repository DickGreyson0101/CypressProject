@ui @login
Feature: UI Login
  Login test based on cypress-realworld-app

  Scenario: Login with invalid credentials
    Given I visit the signin page
    When I enter invalid credentials
    Then I should see error message

  @smoke
  Scenario: Successful login
    Given I visit the signin page
    When I enter valid credentials
    And I click the sign in button
    Then I should be redirected to the home page
