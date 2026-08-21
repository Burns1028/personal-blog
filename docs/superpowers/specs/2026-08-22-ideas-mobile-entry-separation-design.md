# Ideas Mobile Entry Separation Design

## Goal

Make adjacent Ideas entries unmistakably separate on phones, especially when an entry contains several lines of text, without reducing useful information density or changing the desktop composition.

## Scope

- Change only the canonical `@media (max-width: 767px)` Ideas rules.
- Keep the existing timeline, metadata, typography, content, search controls, and DOM structure.
- Leave tablet/desktop presentation and all non-Ideas routes unchanged.

## Visual Treatment

Each phone entry keeps the existing journal treatment instead of becoming a card. The text block ends with a one-pixel solid warm-brown divider at approximately 30% opacity. The divider is stronger than the current 15%-opacity dotted rule but remains subordinate to the text.

The vertical pause from the end of one entry's text to the next entry's metadata increases from roughly 30px to roughly 44px:

- text-to-divider bottom padding: `20px`;
- between-entry margin: `10px` for every entry after the first;
- next metadata top padding: `14px`.

The result should create a clear reading stop while retaining several entries per phone viewport.

## Responsive Constraints

- At `360px`, `390px`, and `430px`, entries remain a full-width, single-column document flow with no horizontal overflow or nested scrolling.
- At `1440px`, the original three-column timeline geometry and dotted desktop divider remain unchanged.
- Existing search and date-filter target sizes remain unchanged.

## Verification

- Add a contract assertion that the phone block contains the stronger divider, `20px` text bottom padding, `10px` adjacent-entry margin, and `14px` metadata top padding.
- Prove the new test fails before the CSS change and passes afterward.
- Run the complete test suite and production build.
- Inspect Ideas in a browser at phone and desktop widths, checking item boundaries, information density, overflow, and desktop preservation.

