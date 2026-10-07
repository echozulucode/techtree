Feature: Accessible embedding
  As a reader who uses a keyboard, a screen reader or a small screen
  I want the embedded tree to meet the accessibility standard of its host page
  So that I can explore capabilities like every other reader

  The embeddable view inside a host page that has its own title and landmarks,
  with the fictional engineering-platform demo tree. The audit is WCAG 2.2 AA
  plus best practice, colour contrast and target size included.

  Scenario Outline: The view passes an automated accessibility audit
    Given a host page embeds the demo tree in the <scheme> scheme
    When the reader opens a capability and highlights its path
    Then the page has no accessibility violations

    Examples:
      | scheme |
      | light  |
      | dark   |

  Scenario: The card fits into the host page's structure
    Given a host page embeds the demo tree in the light scheme
    When the reader opens a capability
    Then the card is a labelled region headed one level below the page title

  Scenario: Keyboard focus follows the capability card
    Given a host page embeds the demo tree in the light scheme
    When the reader opens a capability
    Then keyboard focus is on the card's heading
    When the reader opens one of its prerequisites from the card
    Then keyboard focus is on the new card's heading
    When the reader presses Escape
    Then the card closes

  Scenario: A phone starts at the frontier at a readable zoom
    Given a host page embeds the demo tree on a phone, starting at the frontier
    Then a capability that is being worked on or ready to start is centred at a readable zoom
