@ui @navigation
Feature: UI Navigation
  Navigation test based on cypress-realworld-app

  Background:
    Given I am logged in to the application

  @smoke
  Scenario: Navigate to user settings
    When I click on the user settings menu
    Then I should see the user settings page
