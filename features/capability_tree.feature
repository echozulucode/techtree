Feature: Capability tech tree
  As someone exploring an organisation's engineering capabilities
  I want capabilities laid out by era and branch with their maturity and prerequisites
  So that I can see what we can do today, what each capability needs, and what it unlocks

  The capability profile, shown through the embeddable view the way a host
  application uses it, with the fictional engineering-platform demo tree.

  Background:
    Given the capability demo tree is embedded in a host page

  Scenario: Capabilities appear in era columns and branch lanes
    Then the capabilities are arranged in era columns and branch lanes
    And each capability shows its current maturity

  Scenario: Highlighting what a capability needs
    When the reader highlights what the update capability needs
    Then its prerequisites across branches are emphasized
    And capabilities off that path are dimmed

  Scenario: Highlighting what a capability unlocks
    When the reader highlights what continuous integration unlocks
    Then the release milestone is emphasized as downstream

  Scenario: Filtering by maturity keeps eras and branches in place
    When the reader shows only operational capabilities
    Then capabilities in other states are hidden
    But the eras and branches stay in place

  Scenario: An outline lists every capability for keyboard and screen-reader users
    When the reader switches to the outline
    Then every capability is listed under its branch and era
    And its prerequisites and unlocks are listed as links

  Scenario: The capability card shows maturity, prerequisites and eureka goals
    When the reader opens the update capability's card
    Then the card shows its era, branch, current and target maturity
    And it lists its prerequisites, unlocks, implementations and eureka goals

  Scenario: Links the host withholds are neither shown nor counted
    When the reader opens the replay capability's card
    Then the item the host withholds is not listed
    And the demonstration count leaves it out
