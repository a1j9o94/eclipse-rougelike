import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const directory = "coding_agents/second_dawn_revision_screenshots";
const site = (process.env.SECOND_DAWN_SITE_URL ?? "http://127.0.0.1:5175").replace(/\/$/, "");
const standalone = process.env.FACTION_PICKER_STANDALONE === "1";
const sizes = [[1366, 768], [1440, 900], [1920, 1080]];
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const checks = [];
for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(site, { waitUntil: "domcontentloaded" });
  if (!standalone) {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "New game", exact: true }).click();
  }
  await page.getByRole("region", { name: "Choose civilization" }).waitFor();
  await page.getByRole("button", { name: /Planta, Green board/ }).click();
  const picker = page.getByRole("region", { name: "Choose civilization" });
  const detail = page.getByLabel("Planta details");
  await detail.waitFor();
  const data = await page.evaluate(() => {
    const picker = document.querySelector(".dg-faction-picker");
    const pairName = document.querySelector(".dg-faction-pair button strong");
    const effect = document.querySelector(".dg-faction-effects strong");
    const support = document.querySelector(".dg-faction-effects small");
    const resource = document.querySelector(".dg-faction-resources small");
    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      pickerWidth: picker?.getBoundingClientRect().width ?? 0,
      pairNameFont: pairName ? getComputedStyle(pairName).fontSize : null,
      effectFont: effect ? getComputedStyle(effect).fontSize : null,
      supportFont: support ? getComputedStyle(support).fontSize : null,
      resourceFont: resource ? getComputedStyle(resource).fontSize : null,
    };
  });
  await picker.screenshot({ path: `${directory}/${width}x${height}-faction-picker.png` });
  checks.push({ width, height, errors, plantaDetail: await detail.isVisible(), ...data });
  await page.close();
}
await browser.close();
await writeFile(`${directory}/faction-picker-review.json`, `${JSON.stringify(checks, null, 2)}\n`);
console.log(JSON.stringify(checks));
