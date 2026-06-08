Feature: Theming
  As a reader of a TechTree graph
  I want to view it under different visual themes
  So that I can read it comfortably and in the right context

  Background:
    Given the "ai-delivery" graph is open

  Scenario: The graph opens in its declared default theme
    Then the graph is shown in its default theme

  Scenario: A reader can switch to a different theme
    When the reader switches to another theme
    Then the graph is repainted in the chosen theme

  Scenario: Switching theme keeps the open node in view
    Given the reader has opened a node's detail
    When the reader switches to another theme
    Then that node's detail is still open
