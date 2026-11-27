// Rasterizes the logo mark (light-theme colors: the cream bubble reads best on the dark share card) into src/lib/og-mark.json.
// Run: node scripts/og-mark.mjs  (needs Playwright's Chromium). Re-run if the mark or its tokens change.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const SIZE = 112;
const src = readFileSync(new URL("../src/components/wordmark.tsx", import.meta.url), "utf8");
const BUBBLE = src.match(/const BUBBLE =\s*"([^"]+)"/)[1];
const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const line = tokens.match(/--mark-bubble:\s*#F9DCC0[^\n]*/)[0];
const pick = (name) => line.match(new RegExp(`--mark-${name}:\\s*(#[0-9A-Fa-f]{6})`))[1];
const c = { bubble: pick("bubble"), sun: pick("sun"), meadow: pick("meadow"), hill: pick("hill"), pine: pick("pine") };

// Same geometry as LogoMark (large cut).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${SIZE}" height="${SIZE}">
<defs><clipPath id="c"><path d="${BUBBLE}"/></clipPath></defs>
<path d="${BUBBLE}" fill="${c.bubble}"/>
<g clip-path="url(#c)">
<circle cx="40" cy="57" r="14" fill="${c.sun}"/>
<path d="M0,61 C18,52 34,52 50,58 C64,63 78,58 100,54 V100 H0 Z" fill="${c.meadow}"/>
<path d="M0,68 C26,61 52,61 100,67 V100 H0 Z" fill="${c.hill}"/>
</g>
<path d="M15,88 C20.5,83 23.4,78 24.6,71.2 L36,72 C32,77 25,84 15,88 Z" fill="${c.hill}"/>
<path d="M70,9.0 C72,11.0 75.3,29.2 77.3,32.7 Q77.9,35.0 74.8,35.0 H65.2 Q62.1,35.0 62.7,32.7 C64.7,29.2 68,11.0 70,9.0 Z" fill="${c.pine}"/>
<path d="M70,24.6 C72,26.6 78.6,46.0 80.6,49.5 Q81.2,51.8 78.1,51.8 H61.9 Q58.8,51.8 59.4,49.5 C61.4,46.0 68,26.6 70,24.6 Z" fill="${c.pine}"/>
<path d="M70,40.2 C72,42.2 82.0,64.0 84.0,67.5 Q84.6,69.8 81.5,69.8 H58.5 Q55.4,69.8 56.0,67.5 C58.0,64.0 68,42.2 70,40.2 Z" fill="${c.pine}"/>
<rect x="67.8" y="68" width="4.4" height="6" rx="1.5" fill="${c.pine}"/>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<canvas id="k" width="${SIZE}" height="${SIZE}"></canvas>`);
const rgba = await page.evaluate(async ({ svg, SIZE }) => {
  const img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(svg);
  await img.decode();
  const ctx = document.getElementById("k").getContext("2d");
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  return Array.from(ctx.getImageData(0, 0, SIZE, SIZE).data);
}, { svg, SIZE });
await browser.close();

// Run-length encode whole RGBA pixels: [count, r, g, b, a] with count <= 255.
const out = [];
for (let i = 0; i < rgba.length; ) {
  const px = rgba.slice(i, i + 4);
  let n = 1;
  while (n < 255 && i + n * 4 < rgba.length && rgba.slice(i + n * 4, i + n * 4 + 4).every((v, k) => v === px[k])) n += 1;
  out.push(n, ...px);
  i += n * 4;
}
const rle = Buffer.from(out).toString("base64");
writeFileSync(new URL("../src/lib/og-mark.json", import.meta.url), JSON.stringify({ size: SIZE, rle }) + "\n");
console.log(`og-mark.json: ${SIZE}px, ${rle.length} base64 chars`);
