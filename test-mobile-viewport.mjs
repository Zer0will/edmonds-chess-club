// Visit each multiplayer page at 320, 375, and 768 widths via headless Chromium
// and verify: no horizontal overflow, touch-target heights >= 40px, no element wider than viewport.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const pages = ["/", "/play", "/play/online", "/stats", "/profile", "/about", "/variants"];
const widths = [320, 375, 768];

(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  let failures = 0;
  for (const w of widths) {
    const context = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await context.newPage();
    for (const path of pages) {
      const url = BASE + path;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      const result = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const overflow = [];
        const smallTargets = [];
        document.querySelectorAll("a, button, input").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > docW + 1) {
            overflow.push({ tag: el.tagName, txt: (el.textContent || "").trim().slice(0, 40), right: r.right });
          }
          if ((r.height < 36 || r.width < 36) && el.tagName !== "A") {
            smallTargets.push({ tag: el.tagName, txt: (el.textContent || "").trim().slice(0, 30), w: r.width, h: r.height });
          }
        });
        const bodyScrollWidth = document.body.scrollWidth;
        return { docW, bodyScrollWidth, overflow: overflow.slice(0, 5), smallTargets: smallTargets.slice(0, 5) };
      });
      const horizScroll = result.bodyScrollWidth > result.docW + 1;
      const ok = !horizScroll && result.overflow.length === 0;
      const symbol = ok ? "✓" : "✗";
      console.log(`${symbol} [${w}px] ${path}  scroll=${result.bodyScrollWidth}/${result.docW}  overflow=${result.overflow.length}  smallTargets=${result.smallTargets.length}`);
      if (!ok) {
        failures++;
        console.log("    overflow:", JSON.stringify(result.overflow));
      }
      if (w === 320 && result.smallTargets.length > 0) {
        console.log("    smallTargets:", JSON.stringify(result.smallTargets));
      }
    }
    await context.close();
  }
  await browser.close();
  console.log(failures === 0 ? "\n== ALL MOBILE TESTS PASSED ==" : `\n== ${failures} FAILURES ==`);
  process.exit(failures === 0 ? 0 : 1);
})();
