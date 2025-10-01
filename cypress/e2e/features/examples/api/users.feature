@api @users
Feature: API Users
  Users API test based on cypress-realworld-app

  Background:
    Given I am logged in via API

  @smoke
  Scenario: Get users list
    When I request the users list
    Then I should get a list of users
    And each user should have required fields
