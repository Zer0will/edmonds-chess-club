import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3000";
const targets = [
  { path: "/play/online", name: "lobby" },
  { path: "/stats", name: "leaderboard" },
];
const widths = [320, 768];

(async () => {
  fs.mkdirSync("/home/ubuntu/screenshots/mobile", { recursive: true });
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    for (const t of targets) {
      await page.goto(BASE + t.path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const out = `/home/ubuntu/screenshots/mobile/${t.name}-${w}.png`;
      await page.screenshot({ path: out, fullPage: false });
      console.log("saved", out);
    }
    await ctx.close();
  }
  await browser.close();
})();
