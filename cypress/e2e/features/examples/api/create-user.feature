@api @create-user
Feature: API Create User
  Create user test based on cypress-realworld-app

  Background:
    Given I am logged in via API

  @smoke
  Scenario: Create a new user
    Given I have new user data
    When I create a new user via API
    Then the user should be created successfully
    And the response should contain the new user data
