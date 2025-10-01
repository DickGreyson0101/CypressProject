@api @login
Feature: API Login
  Simple login test based on cypress-realworld-app

  @smoke
  Scenario: Login with valid credentials
    Given I have a valid user from database
    When I login via API
    Then I should get a successful response
    And the response should contain user data
