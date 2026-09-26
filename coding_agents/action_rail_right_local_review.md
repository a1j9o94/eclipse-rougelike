# Right-side action rail — local review

The desktop layout is galaxy → sector/action inspector → fixed action rail. The rail remains on the right when the inspector is hidden or the Research workspace takes the main area. Mobile is unchanged.

Preview the isolated midgame fixture at `http://127.0.0.1:5176/preview-action-right.html` while the local Vite server is running. It does not create a match or write to Convex. The fixture is loaded by `preview-action-right.html` and `src/preview-action-right.tsx`; remove those temporary entry files before any release.

- [Map with sector inspector](mockups/action_rail_right_midgame.png)
- [Map with inspector hidden](mockups/action_rail_right_collapsed.png)
- [Research workspace](mockups/action_rail_right_research.png)

At 1440px the map/workspace is 954px, inspector 374px, and rail 112px. With the inspector hidden, the map/workspace grows to 1328px while the rail stays 112px. The browser found no page errors or horizontal overflow. Fifteen related tests, lint, and build passed. Await user review before merging or deploying.
