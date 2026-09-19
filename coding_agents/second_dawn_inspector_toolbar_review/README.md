# Inspector toolbar cleanup browser review

Actual SecondDawnBoard with deterministic public AI research history passes Chromium and WebKit at 1440×900 and 390×844. Return to inspector is rendered in AiActivityBar, no Close details button remains, clicking Return replaces the AI panel with the sector inspector and transfers keyboard focus to that inspector. Toggling Follow AI off/on resumes the AI panel. Manual Hide/Dismiss remains respected when a subsequent AI history entry arrives, and deliberate enemy blueprint inspection is not redirected by AI activity. Mobile expands the existing AI peek sheet before reviewing its content.

Four cases pass with no page errors or horizontal document overflow. Reviewed actual WebKit mobile AI-action screenshot and Chromium desktop returned-inspector screenshot: the return control is legible in the toolbar, mobile controls wrap, and the inspector content starts directly beneath its heading. No production changes were made by this reviewer. The updated script writes only this new evidence directory, preserving the older AI-follow screenshots.

The separate Build regression script also passes all six Chromium/WebKit 1366×768, 1440×900 and 390×844 cases. Desktop title, first Add control and footer stay inside the inspector/viewport without scrolling, with 51px more space above the title after removal of the old close row. Hide/Show preserves full-width galaxy and drafts. Mobile retains its existing scrollable Build flow. Existing Build screenshots/results were intentionally refreshed, as requested.

Tools are ESLint-clean. Logs: `coding_agents/logs/inspector_toolbar_browser.out`, `inspector_toolbar_build_regression.out`, `inspector_toolbar_browser_lint.out`. These are agent browser checks with touch emulation, not physical-device or human playtesting.

## Other duplicate controls observed — report only

- BuildPlanner retains its header close glyph and footer Cancel, both invoking onClose. They close the build planner rather than the sector inspector. No change in this cleanup.
- The shared ChoiceWorkspace title and a nested EconomyDecision title repeat the decision name (e.g. Ambassador exchange). This is duplicate heading text, not a second inspector-close control. No change.
- FleetInspection and UpgradePartPicker each have one explicit close/return button; keyboard Escape/backdrop handling is additional input support, not duplicate rendered controls.
