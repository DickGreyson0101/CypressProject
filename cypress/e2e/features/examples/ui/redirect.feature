@ui @redirect
Feature: UI Redirect
  Redirect test based on cypress-realworld-app

  @smoke
  Scenario: Redirect unauthenticated user to signin
    When I visit a protected page without authentication
    Then I should be redirected to the signin page
