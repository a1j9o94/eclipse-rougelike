import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const directory = "coding_agents/second_dawn_exploration_independent_review";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const checks = [];
const errors = [];
try {
  for (const [width, height] of [
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5175/#second-dawn-preview");
    for (const fixture of ["opening-three", "exploration"]) {
      await page.getByLabel("Review position").selectOption(fixture);
      if (fixture === "opening-three") {
        await page.getByRole("button", { name: "Fit", exact: true }).click();
        await page.locator(".sd-frontier").first().click();
        await page
          .getByRole("button", { name: "Confirm action", exact: true })
          .click();
      }
      await page
        .getByRole("img", { name: "Exploration placement preview" })
        .waitFor();
      const orientations = new Set();
      for (let index = 0; index < 6; index++) {
        const rotation = await page
          .getByTestId("drawn-exploration-tile")
          .getAttribute("data-rotation");
        orientations.add(rotation);
        // Intersect every clipping ancestor, not only the browser viewport. This catches controls hidden by the footer/main panel.
        const metrics = await page.evaluate(() => {
          const check = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return { selector, unclipped: false, missing: true };
            const box = element.getBoundingClientRect();
            let left = 0,
              top = 0,
              right = innerWidth,
              bottom = innerHeight;
            for (
              let parent = element.parentElement;
              parent;
              parent = parent.parentElement
            ) {
              const style = getComputedStyle(parent),
                rect = parent.getBoundingClientRect();
              if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
                left = Math.max(left, rect.left);
                right = Math.min(right, rect.right);
              }
              if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
                top = Math.max(top, rect.top);
                bottom = Math.min(bottom, rect.bottom);
              }
            }
            return {
              selector,
              unclipped:
                box.width > 0 &&
                box.height > 0 &&
                box.left >= left - 0.5 &&
                box.right <= right + 0.5 &&
                box.top >= top - 0.5 &&
                box.bottom <= bottom + 0.5,
              top: Math.round(box.top),
              bottom: Math.round(box.bottom),
              clipBottom: Math.round(bottom),
            };
          };
          return {
            targets: [
              ".dg-placement-verdict",
              ".dg-placement-actions button:first-child",
              ".dg-placement-actions button:nth-child(2)",
              ".dg-rotation-controls button:first-child",
              ".dg-rotation-controls button:last-child",
            ].map(check),
            horizontalOverflow:
              document.documentElement.scrollWidth > innerWidth,
          };
        });
        checks.push({ width, height, fixture, rotation, ...metrics });
        if (index < 2)
          await page.screenshot({
            path: `${directory}/fixed-${width}x${height}-${fixture}-rotation-${rotation}.png`,
            animations: "disabled",
          });
        await page
          .getByRole("button", { name: "Rotate clockwise", exact: true })
          .click();
      }
      assert.equal(
        orientations.size,
        6,
        `${fixture} must preview all six orientations`,
      );
      await page
        .getByRole("button", { name: "Rotate counterclockwise", exact: true })
        .focus();
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() =>
          document.activeElement?.getAttribute("aria-label"),
        ),
        "Rotate clockwise",
      );
      assert.notEqual(
        await page.evaluate(
          () => getComputedStyle(document.activeElement).outlineStyle,
        ),
        "none",
      );
    }
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(
    `${directory}/fixed-checks.json`,
    JSON.stringify({ checks, errors }, null, 2),
  );
}
assert.deepEqual(errors, [], "No browser errors");
const failures = checks.filter(
  (check) =>
    check.horizontalOverflow ||
    check.targets.some((target) => !target.unclipped),
);
assert.deepEqual(
  failures,
  [],
  "Placement, discard, rotation controls and verdict must fit their clipping ancestors at all supported sizes",
);
console.log(
  `Passed ${checks.length} exploration size/fixture/orientation checks, including clipping and keyboard focus. Baselines unchanged.`,
);
