# Right-side action rail — review

The desktop layout is galaxy → sector/action inspector → fixed action rail. The rail remains on the right when the inspector is hidden or the Research workspace takes the main area. Mobile is unchanged.

The screenshots use an isolated midgame engine fixture. The temporary preview entry was removed before release; it did not create a match or write to Convex.

- [Map with sector inspector](mockups/action_rail_right_midgame.png)
- [Map with inspector hidden](mockups/action_rail_right_collapsed.png)
- [Research workspace](mockups/action_rail_right_research.png)

At 1440px the map/workspace is 954px, inspector 374px, and rail 112px. With the inspector hidden, the map/workspace grows to 1328px while the rail stays 112px. History opens in the inspector and Settings opens its dialog. The browser found no page errors or horizontal overflow. Fifteen related tests, lint, and build passed. The user accepted the layout for release.
