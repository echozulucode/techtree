Feature: Status overlay
  As a learner tracking progress on a tree
  I want each node to show whether I can start it, it is blocked, or I have completed it
  So that I always know my current frontier

  Background:
    Given the "ai-delivery" graph is open

  Scenario: A node with no prerequisites is ready to start
    Then the starting node is shown as available

  Scenario: A node with unmet prerequisites is locked
    Then a node with unmet prerequisites is shown as locked

  Scenario: Completing a node unlocks what depends on it
    When the learner marks the starting node achieved
    Then a node that depended on it becomes available

  Scenario: A learner can begin working on an available node
    When the learner marks the starting node in progress
    Then the starting node is shown as in progress

  @manual
  Scenario: Filtering shows only nodes in a chosen status
    When the learner filters to a single status
    Then only nodes in that status remain emphasized
