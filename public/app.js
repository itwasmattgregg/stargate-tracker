const root = document.getElementById("seasons");
const hideWatched = document.getElementById("hide-watched");
const MAX_DISC = 6;

let episodes = [];
const openSeasons = new Set(JSON.parse(localStorage.getItem("openSeasons") || "[1]"));

hideWatched.checked = localStorage.getItem("hideWatched") === "1";
document.body.classList.toggle("hide-watched", hideWatched.checked);
hideWatched.addEventListener("change", () => {
  document.body.classList.toggle("hide-watched", hideWatched.checked);
  localStorage.setItem("hideWatched", hideWatched.checked ? "1" : "0");
});

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const pad = (n) => String(n).padStart(2, "0");

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
}

function renderEpisode(ep) {
  const checkbox = el("input", {
    type: "checkbox",
    checked: !!ep.watched_at,
    "aria-label": `Watched ${ep.title}`,
    onchange: (e) => setEpisodeWatched(ep, e.target.checked),
  });

  const discSelect = el(
    "select",
    { class: "disc-select", title: "DVD disc", onchange: (e) => setDisc(ep, Number(e.target.value)) },
    ...Array.from({ length: MAX_DISC }, (_, i) =>
      el("option", { value: i + 1, selected: ep.disc === i + 1 }, `Disc ${i + 1}`),
    ),
  );

  const summary = el(
    "p",
    { class: "ep-summary", onclick: (e) => e.currentTarget.classList.toggle("expanded") },
    ep.summary || "No description available.",
  );

  const row = el(
    "div",
    { class: `episode${ep.watched_at ? " watched" : ""}`, "data-id": ep.id },
    checkbox,
    ep.image
      ? el("img", { class: "thumb", src: ep.image, alt: "", loading: "lazy" })
      : el("div", { class: "thumb" }),
    el(
      "div",
      { class: "ep-body" },
      el(
        "div",
        { class: "ep-head" },
        el("span", { class: "ep-code" }, `S${pad(ep.season)}E${pad(ep.number)}`),
        el("span", { class: "ep-title", onclick: () => checkbox.click() }, ep.title),
        el(
          "span",
          { class: "ep-meta" },
          ep.airdate ? el("span", {}, new Date(ep.airdate + "T00:00:00").getFullYear()) : null,
          discSelect,
        ),
      ),
      summary,
    ),
  );
  return row;
}

function renderSeason(season, eps) {
  const watched = eps.filter((e) => e.watched_at).length;
  const complete = watched === eps.length;

  const seasonBox = el("input", {
    type: "checkbox",
    checked: complete,
    title: complete ? "Mark season unwatched" : "Mark entire season watched",
    onclick: (e) => e.stopPropagation(),
    onchange: (e) => setSeasonWatched(season, e.target.checked),
  });
  seasonBox.indeterminate = watched > 0 && !complete;

  const discs = Map.groupBy(eps, (e) => e.disc ?? 0);
  const discSections = [...discs.keys()]
    .sort((a, b) => a - b)
    .map((d) =>
      el(
        "div",
        { class: "disc" },
        el("div", { class: "disc-header" }, d ? `Season ${season} · Disc ${d}` : "Disc unknown"),
        ...discs.get(d).map(renderEpisode),
      ),
    );

  const details = el(
    "details",
    { class: `season${complete ? " complete" : ""}`, open: openSeasons.has(season), "data-season": season },
    el(
      "summary",
      {},
      seasonBox,
      el("span", { class: "season-title" }, `Season ${season}`),
      el(
        "span",
        { class: "season-progress" },
        el("span", { class: "bar" }, el("span", { class: "bar-fill", style: `display:block;width:${(watched / eps.length) * 100}%` })),
        el("span", { class: "season-count" }, `${watched} / ${eps.length}`),
      ),
    ),
    ...discSections,
  );
  details.addEventListener("toggle", () => {
    details.open ? openSeasons.add(season) : openSeasons.delete(season);
    localStorage.setItem("openSeasons", JSON.stringify([...openSeasons]));
  });
  return details;
}

function render() {
  const seasons = Map.groupBy(episodes, (e) => e.season);
  root.replaceChildren(...[...seasons.keys()].sort((a, b) => a - b).map((s) => renderSeason(s, seasons.get(s))));

  const watched = episodes.filter((e) => e.watched_at).length;
  document.getElementById("overall-count").textContent = `${watched} / ${episodes.length}`;
  document.getElementById("overall-bar").style.width = `${episodes.length ? (watched / episodes.length) * 100 : 0}%`;
}

async function mutate(applyLocal, request) {
  const snapshot = episodes.map((e) => ({ ...e }));
  applyLocal();
  render();
  try {
    await request();
  } catch (err) {
    episodes = snapshot;
    render();
    alert(`Couldn't save: ${err.message}`);
  }
}

function setEpisodeWatched(ep, watched) {
  return mutate(
    () => (episodes.find((e) => e.id === ep.id).watched_at = watched ? new Date().toISOString() : null),
    () => api(`/api/episodes/${ep.id}`, { method: "PATCH", body: JSON.stringify({ watched }) }),
  );
}

function setSeasonWatched(season, watched) {
  const now = new Date().toISOString();
  return mutate(
    () =>
      episodes.forEach((e) => {
        if (e.season === season) e.watched_at = watched ? e.watched_at || now : null;
      }),
    () => api(`/api/seasons/${season}`, { method: "PATCH", body: JSON.stringify({ watched }) }),
  );
}

function setDisc(ep, disc) {
  return mutate(
    () => (episodes.find((e) => e.id === ep.id).disc = disc),
    () => api(`/api/episodes/${ep.id}`, { method: "PATCH", body: JSON.stringify({ disc }) }),
  );
}

try {
  episodes = await api("/api/episodes");
  if (!episodes.length) {
    root.replaceChildren(el("p", { class: "error" }, "No episodes in the database yet — run the D1 migrations."));
  } else {
    render();
  }
} catch (err) {
  root.replaceChildren(el("p", { class: "error" }, `Failed to load episodes: ${err.message}`));
}
