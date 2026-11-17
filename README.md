# Stargate SG-1 Watch Log

A small Cloudflare Worker with a D1 (SQLite) database for tracking which SG-1 episodes you've watched. Episode descriptions and images come from [TVMaze](https://www.tvmaze.com).

## Deploy

```bash
npm install
npx wrangler login
npx wrangler d1 create stargate-tracker   # copy the database_id into wrangler.jsonc
npm run deploy                            # applies migrations (schema + 213 episodes) and deploys
```

Optional password (browser prompt, any username):

```bash
npx wrangler secret put APP_PASSWORD
```

## Local development

```bash
npm run dev    # http://localhost:8787
```

## Theme

The UI is modelled on the SGC dialing computer. Overall progress lights the nine chevrons on the gate, and the event horizon forms at 100%. Each season gets a seven-glyph address that locks as you watch, and its DHD dome button marks the whole season. "Iris" hides watched episodes. All sounds are synthesized with Web Audio, so no audio files are bundled.

Asset sources:
- Gate glyphs: public-domain SVGs by Bryan Derksen from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_Stargate_Milky_Way_glyphs). These are stored in `public/glyphs/` and combined into `public/glyphs.svg` by `npm run glyphs:build`.
- Fonts: Michroma and Share Tech Mono (SIL Open Font License) via Google Fonts.
- Episode stills and summaries: [TVMaze](https://www.tvmaze.com).

## DVD discs

Disc numbers follow the box set's episodes-per-disc counts in `scripts/disc-layout.mjs`, which generates `migrations/0003_disc_layout.sql`. Individual episodes can also be moved from the disc dropdown in the UI.
