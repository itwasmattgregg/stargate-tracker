// Writes migrations/0003_disc_layout.sql from the box set's episodes-per-disc counts.
// Only the disc column changes, so watch progress is preserved.
// Usage: node scripts/disc-layout.mjs
import { readFileSync, writeFileSync } from "node:fs";

const LAYOUT = {
  1: [3, 5, 5, 5, 3],
  2: [4, 5, 5, 4, 4],
  3: [4, 5, 4, 4, 5],
  4: [4, 4, 5, 5, 4],
  5: [4, 4, 4, 5, 5],
  6: [4, 4, 4, 5, 5],
  7: [4, 4, 4, 5, 5],
  8: [4, 4, 4, 4, 4],
  9: [4, 4, 4, 4, 4],
  10: [4, 4, 4, 4, 4],
};

const seed = readFileSync(new URL("../migrations/0002_seed.sql", import.meta.url), "utf8");
for (const [season, counts] of Object.entries(LAYOUT)) {
  const episodes = seed.match(new RegExp(`VALUES \\(\\d+, ${season}, `, "g"))?.length ?? 0;
  const total = counts.reduce((a, b) => a + b, 0);
  if (total !== episodes) throw new Error(`Season ${season}: discs hold ${total} episodes but the season has ${episodes}`);
}

const lines = [];
for (const [season, counts] of Object.entries(LAYOUT)) {
  let first = 1;
  counts.forEach((count, i) => {
    const last = first + count - 1;
    lines.push(`UPDATE episodes SET disc = ${i + 1} WHERE season = ${season} AND number BETWEEN ${first} AND ${last};`);
    first = last + 1;
  });
}

writeFileSync(new URL("../migrations/0003_disc_layout.sql", import.meta.url), lines.join("\n") + "\n");
console.log(`Wrote ${lines.length} updates to migrations/0003_disc_layout.sql`);
