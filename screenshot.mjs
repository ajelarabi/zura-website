import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "temporary screenshots");

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const existing = fs
  .readdirSync(OUT_DIR)
  .map((f) => {
    const m = f.match(/^screenshot-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  })
  .filter((n) => !Number.isNaN(n));
const nextN = existing.length ? Math.max(...existing) + 1 : 1;
const fileName = `screenshot-${nextN}${label ? "-" + label : ""}.png`;
const outPath = path.join(OUT_DIR, fileName);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
// deviceScaleFactor is capped at 1 for fullPage capture: Chromium has a
// GPU texture height limit around 16384 physical px, and a tall page shot
// at 2x can exceed that and come back with corrupted/duplicated content.
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

// Do not scroll before a fullPage capture: combining manual scrolling with
// fullPage:true can duplicate sticky/fixed elements in Chromium's stitched
// output. The page's own reveal-on-scroll JS has a safety-net timeout that
// guarantees full visibility shortly after load regardless of scroll
// position, so we just wait that out from a resting scroll-top of 0.
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved ${outPath}`);
