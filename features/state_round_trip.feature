Feature: Progress persistence
  As a learner
  I want my progress saved, exportable, and safely importable
  So that I never lose my place and can move between machines

  Background:
    Given the "ai-delivery" graph is open

  Scenario: Progress survives reopening the graph
    Given the learner has marked the starting node achieved
    When the learner reopens the graph
    Then the starting node is still achieved

  Scenario: A learner can export their progress
    When the learner exports their progress
    Then a progress file for this graph is produced

  Scenario: Progress belonging to a different graph is refused
    When the learner imports progress from a different graph
    Then the import is refused
