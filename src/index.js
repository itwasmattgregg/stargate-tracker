const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

// Optional protection: set APP_PASSWORD with `wrangler secret put APP_PASSWORD`
// and the browser will prompt for it (any username).
function unauthorized(request, env) {
  if (!env.APP_PASSWORD) return null;
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    const [, pass] = atob(header.slice(6)).split(":");
    if (pass === env.APP_PASSWORD) return null;
  }
  return new Response("Authentication required", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="Stargate Tracker"' },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/api/episodes" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, season, number, title, summary, image, airdate, disc, watched_at FROM episodes ORDER BY season, number",
    ).all();
    return json(results);
  }

  let m = path.match(/^\/api\/episodes\/(\d+)$/);
  if (m && method === "PATCH") {
    const id = Number(m[1]);
    const body = await readJson(request);
    if (typeof body.watched === "boolean") {
      await env.DB.prepare("UPDATE episodes SET watched_at = ? WHERE id = ?")
        .bind(body.watched ? new Date().toISOString() : null, id)
        .run();
    }
    if (body.disc !== undefined) {
      const disc = body.disc === null ? null : Number(body.disc);
      if (disc !== null && (!Number.isInteger(disc) || disc < 1 || disc > 99)) return json({ error: "Invalid disc" }, 400);
      await env.DB.prepare("UPDATE episodes SET disc = ? WHERE id = ?").bind(disc, id).run();
    }
    const row = await env.DB.prepare("SELECT * FROM episodes WHERE id = ?").bind(id).first();
    return row ? json(row) : json({ error: "Not found" }, 404);
  }

  m = path.match(/^\/api\/seasons\/(\d+)$/);
  if (m && method === "PATCH") {
    const season = Number(m[1]);
    const body = await readJson(request);
    if (typeof body.watched !== "boolean") return json({ error: "watched must be boolean" }, 400);
    // Keep original watch dates for episodes already marked watched.
    if (body.watched) {
      await env.DB.prepare("UPDATE episodes SET watched_at = ? WHERE season = ? AND watched_at IS NULL")
        .bind(new Date().toISOString(), season)
        .run();
    } else {
      await env.DB.prepare("UPDATE episodes SET watched_at = NULL WHERE season = ?").bind(season).run();
    }
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const denied = unauthorized(request, env);
    if (denied) return denied;

    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
