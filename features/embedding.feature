Feature: Embedding the viewer in a host application
  As a developer of a host application
  I want to drop the tree view into my pages and theme it from my design tokens
  So that the tree looks native and works with my framework

  Scenario: The view follows the host's light or dark scheme
    Given the capability demo tree is embedded in a dark host page
    Then the tree is drawn in dark colours
    When the host switches the page to light
    Then the tree is drawn in light colours

  @unit
  Scenario: The view server-renders and runs under React 19
    Given a host application on React 19
    When it renders the tree on the server and then in the browser
    Then the tree, a node's card and the status filter work

  @unit
  Scenario: The view never touches the browser while being imported
    When the viewer is imported in an environment without a browser
    Then nothing fails
