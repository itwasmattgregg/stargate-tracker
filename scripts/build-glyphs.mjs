// Combines public/glyphs/NN.svg (public-domain glyphs by Bryan Derksen, Wikimedia Commons)
// into public/glyphs.svg: a sprite of <symbol id="gNN"> drawn in currentColor.
// Usage: node scripts/build-glyphs.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../public/glyphs/", import.meta.url);
const files = readdirSync(dir).filter((f) => /^\d\d\.svg$/.test(f)).sort();

const symbols = files.map((file) => {
  const src = readFileSync(new URL(file, dir), "utf8");
  const body = src
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "")
    .replace(/<defs[\s\S]*?(\/>|<\/defs>)/g, "")
    .replace(/<sodipodi:namedview[\s\S]*?(\/>|<\/sodipodi:namedview>)/g, "")
    .replace(/\s(sodipodi|inkscape):[\w-]+="[^"]*"/g, "")
    .replace(/\sid="[^"]*"/g, "")
    .replace(/black|#000000/g, "currentColor")
    .replace(/\s+/g, " ")
    .trim();
  return `<symbol id="g${file.slice(0, 2)}" viewBox="0 0 48 48">${body}</symbol>`;
});

writeFileSync(
  new URL("../public/glyphs.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`,
);
console.log(`Wrote ${symbols.length} glyph symbols to public/glyphs.svg`);
