Feature: Graph navigation
  As someone viewing a TechTree graph
  I can see the nodes and inspect any one of them
  So that I can read the dependency story regardless of which profile produced it

  Background:
    Given the "ai-delivery" graph is open

  Scenario: The graph renders its nodes
    Then I can see several nodes

  Scenario: Inspecting a node reveals its detail
    When I select the node "ai.adopted-ai-tooling"
    Then the detail panel describes that node

  Scenario: A different profile renders in the same viewer
    Given the "personal-learning" graph is open
    Then I can see several nodes
