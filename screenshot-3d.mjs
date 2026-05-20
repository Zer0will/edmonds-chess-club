import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("console", m => console.log("[console]", m.type(), m.text()));
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.addInitScript(() => { window.__chessSceneDebug = true; });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
// Check canvas dims and pixel content
const diag = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { found: false };
  const rect = c.getBoundingClientRect();
  return { found: true, w: c.width, h: c.height, cssW: rect.width, cssH: rect.height, top: rect.top, left: rect.left, zIndex: getComputedStyle(c).zIndex, parentZ: c.parentElement && getComputedStyle(c.parentElement).zIndex, parentDisplay: c.parentElement && getComputedStyle(c.parentElement).display };
});
console.log('[diag] canvas:', JSON.stringify(diag));
// Read raw pixels from the canvas via toDataURL to confirm pixels are being drawn
const pixelDiag = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { found: false };
  // Use a fresh 2D canvas to copy and inspect, since WebGL contexts can't be read with getImageData directly
  const tmp = document.createElement('canvas');
  tmp.width = c.width; tmp.height = c.height;
  const ctx = tmp.getContext('2d');
  ctx.drawImage(c, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let nonZeroPixels = 0;
  let maxR = 0, maxG = 0, maxB = 0, maxA = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0 || data[i+3] > 0) nonZeroPixels++;
    if (data[i] > maxR) maxR = data[i];
    if (data[i+1] > maxG) maxG = data[i+1];
    if (data[i+2] > maxB) maxB = data[i+2];
    if (data[i+3] > maxA) maxA = data[i+3];
  }
  return { found: true, total: data.length / 4, nonZero: nonZeroPixels, maxR, maxG, maxB, maxA };
});
console.log('[diag] canvas pixels:', JSON.stringify(pixelDiag));
const stackDiag = await page.evaluate(() => {
  // Sample several points on the page where the canvas SHOULD be visible (away from hero text)
  const samples = [[100, 200], [1100, 200], [100, 600], [1100, 600]];
  return samples.map(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { x, y, el: null };
    const cs = getComputedStyle(el);
    return { x, y, tag: el.tagName, cls: el.className?.toString().slice(0,80), bg: cs.backgroundColor, z: cs.zIndex, opacity: cs.opacity };
  });
});
console.log('[diag] stack:', JSON.stringify(stackDiag, null, 2));
await page.screenshot({ path: "/home/ubuntu/screenshots/3d-home-top.png" });
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(800);
await page.screenshot({ path: "/home/ubuntu/screenshots/3d-home-scrolled.png" });
await page.evaluate(() => window.scrollTo(0, 1500));
await page.waitForTimeout(800);
await page.screenshot({ path: "/home/ubuntu/screenshots/3d-home-mid.png" });
const has = await page.evaluate(() => !!document.querySelector("canvas"));
console.log("canvas present:", has);
await browser.close();
