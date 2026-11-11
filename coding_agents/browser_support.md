# Browser support and stylesheet ownership

The maintenance work relies on native dialog (Chrome 37+, Firefox 98+, Safari 15.4+), existing dynamic viewport units (Chrome 108+, Firefox 101+, Safari 15.4+), and the project's existing `:has()` selectors (Chrome 105+, Firefox 121+, Safari 15.4+). Therefore the effective feature floor is Chrome 108, Firefox 121, Safari 16 (including size container query units). These are feature availability floors, not evidence that those historical versions have been tested. Release verification records exact installed engines; current stable versions are the primary target.

`mobileBoard.css` owns mobile shell/header/footer/sheet dimensions. `second-dawn.css` owns desktop structure. `visualPlay.css` owns board visual treatment, and individual panel styles own their content. Styles remain unlayered: introducing cascade layers selectively would change precedence. New CSS should live with its owner; consolidate duplicate declarations only after reading later overrides.

Native modals use one full-viewport `dialog` backdrop wrapper, preserving panel DOM and existing styling. Browser focus and inertness replace handwritten traps. The shared galaxy inspector stays nonmodal so map interaction remains available.

The browser harness is generated into ignored `.second-dawn/maintainability` and runs real Board components with the pure engine and existing sanitized fixtures. It is not shipped as a production app route. Automated screenshots require a working Playwright installation. Use `CHROMIUM_EXECUTABLE_PATH` only to select an explicitly installed Chromium when the pinned bundled browser is unavailable, and compare baseline/candidate on the same binary. Tests must report missing engines as failures.

Physical phone testing, browser zoom and soft-keyboard/safe-area testing must be recorded separately from resized desktop viewports. Never describe emulated sizes as actual phone validation.

## Running the required browser gate

Keep the original checkout and candidate checkout separate. Run the new harness from the candidate checkout but point `--root` and the server at the original checkout when capturing the original:

```sh
node tools/maintainability-browser-check.mjs --base-url ORIGINAL_URL --root /absolute/original-checkout --output /absolute/original-evidence --label baseline
BROWSER_BASE_URL=CANDIDATE_URL BROWSER_BASELINE=/absolute/original-evidence npm run check:full
```

Install the pinned Playwright browsers and their OS dependencies before running. The harness uses actual independent browser contexts, fixed viewport sizes and isolated storage. No fixture route is added to the production app. `--smoke true --engines chromium` is a diagnostic subset, not the full gate. An explicitly approved UI change such as the enlarged short-landscape chooser requires separately reviewed expected screenshots; the checker must continue to fail against the obsolete baseline until that review is recorded.

In this managed environment the shared browser worked, but local Playwright launch was blocked. The delivery report distinguishes those interactive observations from the unexecuted automated gate. The short-landscape chooser is the only intentional user-visible change in this maintenance branch.
