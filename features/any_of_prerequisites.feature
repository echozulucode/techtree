@unit
Feature: Any-of prerequisites
  As a tree author
  I want to say that one of several prerequisites suffices
  So that alternative paths can unlock a node without requiring all of them

  Verified by unit tests (see coverage.yaml); the engine-level behaviour is
  profile-agnostic and has no browser surface of its own.

  Scenario: One satisfied alternative makes a node available
    Given a node needs one of two alternative prerequisites
    When only one alternative is satisfied
    Then the node is available

  Scenario: No satisfied alternative keeps a node locked
    Given a node needs one of two alternative prerequisites
    When neither alternative is satisfied
    Then the node is locked

  Scenario: An unknown alternative is rejected when the tree is compiled
    Given an any-of group names a node that does not exist
    When the tree is compiled
    Then compilation fails naming the unknown node

  Scenario: A cycle through an alternative is rejected
    Given two nodes that require each other through an any-of group
    When the tree is compiled
    Then compilation fails naming both nodes
