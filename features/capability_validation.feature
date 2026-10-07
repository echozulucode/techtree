@unit
Feature: Capability tree validation
  As a tree author
  I want the compiler to catch structural mistakes in a capability tree
  So that a broken tree definition never replaces a good one

  Verified by unit tests (see coverage.yaml).

  Scenario: A prerequisite in a later era is rejected
    Given a capability that requires a capability from a later era
    When the tree is compiled
    Then compilation fails naming both capabilities

  Scenario: A wonder must state its benefit
    Given a wonder without a benefit statement
    When the tree is compiled
    Then compilation fails asking for the benefit

  Scenario: A milestone that nothing leads to is reported
    Given a milestone with no prerequisites
    When the tree is compiled
    Then the milestone is reported as unreachable

  Scenario: A capability becomes available once its prerequisites are demonstrated
    Given a capability whose prerequisites are all at least demonstrated
    When its status is derived
    Then it is available

  Scenario: The demo tree compiles to the same output every time
    When the demo tree is compiled twice
    Then both outputs are identical to the committed one
