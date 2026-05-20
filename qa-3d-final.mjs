/**
 * Final QA: capture 3D scene at 3 viewport widths × multiple scroll positions
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "/home/ubuntu/screenshots/3d-final";
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

const viewports = [
  { name: "desktop", w: 1280, h: 800 },
  { name: "tablet", w: 768, h: 1024 },
  { name: "mobile", w: 375, h: 800 },
];

const scrollPositions = [
  { name: "top", y: 0 },
  { name: "mid", y: 800 },
  { name: "bottom", y: 2000 },
];

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // let 3D scene initialize

  // Detect what tier is active
  const tier = await page.evaluate(() => {
    return window.__chessScene ? "full" : (document.querySelector(".chess-scene-lite-piece") ? "lite" : "none");
  });
  console.log(`[${vp.name}] viewport=${vp.w}x${vp.h} tier=${tier}`);

  for (const sp of scrollPositions) {
    await page.evaluate((y) => window.scrollTo(0, y), sp.y);
    await page.waitForTimeout(400);
    const path = `${OUT}/${vp.name}-${sp.name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`  saved ${path}`);
  }
  await ctx.close();
}

// Also screenshot the Play page to verify capture wiring is intact
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(BASE + "/play", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/play-lobby.png`, fullPage: false });
console.log("  saved play-lobby.png");

await ctx.close();
await browser.close();
console.log("== QA capture done ==");
