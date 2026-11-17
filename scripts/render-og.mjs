// Renders scripts/og-image.html to public/og.png and public/apple-touch-icon.png.
// Requires playwright-core and a local Chrome: CHROME_PATH=/path/to/chrome node scripts/render-og.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    const path = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    const body = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`${base}/scripts/og-image.html`);
await page.waitForSelector("body[data-ready]");
await page.waitForTimeout(500);
await page.screenshot({ path: join(root, "public/og.png") });

await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(`<body style="margin:0;background:#010309;display:grid;place-items:center;height:180px">
  <img src="${base}/public/favicon.svg" width="150" height="150"></body>`);
await page.waitForTimeout(300);
await page.screenshot({ path: join(root, "public/apple-touch-icon.png") });

await browser.close();
server.close();
console.log("Wrote public/og.png and public/apple-touch-icon.png");
