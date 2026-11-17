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

## DVD discs

Disc numbers are seeded by spreading each season's episodes evenly across 5 discs. If your box set differs, change an episode's disc from the dropdown in the UI, or edit `DISCS_PER_SEASON` in `scripts/generate-seed.mjs` and run `npm run seed:generate` before the first deploy.
