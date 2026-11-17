// Builds migrations/0002_seed.sql for Stargate SG-1 from the TVMaze API (no API key needed).
// Usage: node scripts/generate-seed.mjs
import { writeFileSync } from "node:fs";

const TVMAZE_SHOW_ID = 204;

// Discs per season in the DVD box set. Episodes are spread evenly across
// discs in airing order; any episode's disc can be corrected from the UI.
const DISCS_PER_SEASON = 5;

const sql = (v) =>
  v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

const stripHtml = (s) =>
  (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const res = await fetch(`https://api.tvmaze.com/shows/${TVMAZE_SHOW_ID}/episodes`);
if (!res.ok) throw new Error(`TVMaze: ${res.status}`);
const episodes = (await res.json()).filter((e) => e.type === "regular" && e.season && e.number);

const lines = [];
for (const [, eps] of Map.groupBy(episodes, (e) => e.season)) {
  eps.sort((a, b) => a.number - b.number);
  eps.forEach((e, i) => {
    const disc = Math.floor((i * DISCS_PER_SEASON) / eps.length) + 1;
    const values = [e.id, e.season, e.number, e.name, stripHtml(e.summary), e.image?.medium ?? null, e.airdate || null, disc];
    lines.push(
      `INSERT INTO episodes (id, season, number, title, summary, image, airdate, disc) VALUES (${values.map(sql).join(", ")});`,
    );
  });
}

writeFileSync(new URL("../migrations/0002_seed.sql", import.meta.url), lines.join("\n") + "\n");
console.log(`Wrote ${lines.length} episodes to migrations/0002_seed.sql`);
