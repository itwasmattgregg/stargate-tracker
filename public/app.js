import { sound } from "./audio.js";
import { createGate, glyphId } from "./gate.js";

const MAX_DISC = 6;
const DESTINATIONS = {
  1: "Abydos",
  2: "Chulak",
  3: "Cimmeria",
  4: "Tollana",
  5: "Vorash",
  6: "Langara",
  7: "Dakara",
  8: "Kheb",
  9: "Vis Uban",
  10: "Celestis",
};
const QUIPS = ["Indeed.", "Jaffa, kree!", "Oh, for crying out loud.", "Shal kek nem ron.", "Off-world activation!", "Sir, we have a lock."];
const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven"];

const root = document.getElementById("seasons");
const statusEl = document.getElementById("status");
const irisBtn = document.getElementById("iris-toggle");
const soundBtn = document.getElementById("sound-toggle");

let episodes = [];
let lastToggled = null;
const openSeasons = new Set(JSON.parse(localStorage.getItem("openSeasons") || "[1]"));

await loadGlyphSprite();
const gate = createGate(document.getElementById("gate"));

// ---------- helpers ----------

async function loadGlyphSprite() {
  try {
    const text = await (await fetch("/glyphs.svg")).text();
    const holder = document.createElement("div");
    holder.hidden = true;
    holder.innerHTML = text;
    document.body.prepend(holder);
  } catch {
    // Glyphs are decorative.
  }
}

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { "content-type": "application/json", ...options.headers } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const pad = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

function svgEl(markup) {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstChild;
}

const glyph = (n, cls = "glyph") => svgEl(`<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><use href="#${glyphId(n)}"/></svg>`);

// Six distinct glyphs per season plus Earth's point of origin (glyph 1).
function seasonAddress(season) {
  const addr = [];
  for (let k = 0; addr.length < 6; k++) {
    const g = ((season * 7 + k * 11) % 38) + 2;
    if (!addr.includes(g)) addr.push(g);
  }
  return [...addr, 1];
}

function toast(message, tone = "info") {
  const box = document.getElementById("toasts");
  const t = el("div", { class: `toast ${tone}` }, el("span", { class: "toast-dot" }), message);
  box.append(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => t.classList.add("out"), 3200);
  setTimeout(() => t.remove(), 3700);
}

function setStatus(text, tone = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${tone}`;
}

function kawoosh() {
  const k = document.getElementById("kawoosh");
  k.classList.remove("go");
  void k.offsetWidth;
  k.classList.add("go");
  gate.kawoosh();
  sound.kawoosh();
}

// ---------- rendering ----------

function chevronCheck({ checked, label, onClick, size = "" }) {
  const btn = el("button", {
    type: "button",
    class: `chevron-check ${size}`,
    role: "checkbox",
    "aria-checked": checked ? "true" : "false",
    "aria-label": label,
    title: label,
    onclick: onClick,
  });
  btn.append(
    svgEl(`<svg viewBox="0 0 40 34" aria-hidden="true">
      <path class="cc-housing" d="M1 1 H39 L31 33 H9 Z"/>
      <path class="cc-light" d="M6 5 H14 L20 16 L26 5 H34 L20 29 Z"/>
    </svg>`),
  );
  return btn;
}

function renderEpisode(ep) {
  const watched = !!ep.watched_at;
  const row = el(
    "article",
    { class: `episode${watched ? " watched" : ""}${lastToggled === ep.id ? " just-toggled" : ""}`, "data-id": ep.id },
    chevronCheck({
      checked: watched,
      label: watched ? `Mark "${ep.title}" unwatched` : `Mark "${ep.title}" watched`,
      onClick: () => setEpisodeWatched(ep, !watched),
    }),
    el(
      "div",
      { class: "monitor" },
      ep.image ? el("img", { src: ep.image, alt: "", loading: "lazy" }) : el("div", { class: "no-signal" }, "No signal"),
      el("span", { class: "monitor-tag" }, `S${pad(ep.season)}E${pad(ep.number)}`),
    ),
    el(
      "div",
      { class: "ep-body" },
      el(
        "div",
        { class: "ep-head" },
        glyph(((ep.id * 13) % 38) + 2, "glyph ep-glyph"),
        el("h3", { class: "ep-title" }, ep.title),
        el(
          "span",
          { class: "ep-meta" },
          ep.airdate ? el("span", { class: "ep-year" }, new Date(ep.airdate + "T00:00:00").getFullYear()) : null,
          el(
            "label",
            { class: "disc-picker" },
            el("span", {}, "DVD"),
            el(
              "select",
              { "aria-label": "DVD disc", onchange: (e) => setDisc(ep, Number(e.target.value)) },
              ...Array.from({ length: MAX_DISC }, (_, i) => el("option", { value: i + 1, selected: ep.disc === i + 1 }, `Disc ${i + 1}`)),
            ),
          ),
        ),
      ),
      el(
        "p",
        { class: "ep-summary", title: "Click to expand", onclick: (e) => e.currentTarget.classList.toggle("expanded") },
        ep.summary || "Mission briefing classified.",
      ),
      watched ? el("p", { class: "ep-stamp" }, `Mission complete · ${new Date(ep.watched_at).toLocaleDateString()}`) : null,
    ),
  );
  return row;
}

function renderSeason(season, eps) {
  const watched = eps.filter((e) => e.watched_at).length;
  const complete = watched === eps.length;
  const locked = complete ? 7 : Math.min(6, Math.floor((watched / eps.length) * 7));
  const address = seasonAddress(season);

  const dhd = el(
    "button",
    {
      type: "button",
      class: `dhd${complete ? " engaged" : watched ? " partial" : ""}`,
      role: "checkbox",
      "aria-checked": complete ? "true" : watched ? "mixed" : "false",
      "aria-label": complete ? `Shut down gate: mark season ${season} unwatched` : `Dial: mark all of season ${season} watched`,
      title: complete ? "Shut down the gate (unmark season)" : "Dial the gate (mark whole season watched)",
      onclick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSeasonWatched(season, !complete);
      },
    },
    el("span", { class: "dhd-dome" }),
  );

  const addressBoxes = el(
    "ol",
    { class: "address", "aria-label": `${locked} of 7 chevrons locked` },
    ...address.map((g, i) =>
      el("li", { class: i < locked ? "locked" : "" }, el("span", { class: "address-n" }, i + 1), glyph(g)),
    ),
  );

  const discs = Map.groupBy(eps, (e) => e.disc ?? 0);
  const discSections = [...discs.keys()]
    .sort((a, b) => a - b)
    .map((d) => {
      const list = discs.get(d);
      const done = list.filter((e) => e.watched_at).length;
      return el(
        "section",
        { class: `disc${done === list.length ? " disc-done" : ""}` },
        el(
          "header",
          { class: "disc-header" },
          el("span", { class: "disc-icon", "aria-hidden": "true" }),
          el("span", {}, d ? `Disc ${d}` : "Disc unknown"),
          el("span", { class: "disc-count" }, `${done}/${list.length}`),
        ),
        ...list.map(renderEpisode),
      );
    });

  const details = el(
    "details",
    { class: `season panel${complete ? " complete" : ""}`, open: openSeasons.has(season), "data-season": season },
    el(
      "summary",
      {},
      dhd,
      el(
        "div",
        { class: "season-id" },
        el("span", { class: "season-label" }, `Season ${pad(season)}`),
        el("span", { class: "season-dest" }, complete ? `Wormhole established · ${DESTINATIONS[season] ?? "Unknown"}` : `Destination · ${DESTINATIONS[season] ?? "Unknown"}`),
      ),
      addressBoxes,
      el("span", { class: "season-count" }, `${pad(watched)}/${pad(eps.length)}`),
      el("span", { class: "season-caret", "aria-hidden": "true" }),
    ),
    el("div", { class: "season-body" }, ...discSections),
  );
  details.addEventListener("toggle", () => {
    details.open ? openSeasons.add(season) : openSeasons.delete(season);
    localStorage.setItem("openSeasons", JSON.stringify([...openSeasons]));
  });
  return details;
}

function seasonsMap() {
  return Map.groupBy(episodes, (e) => e.season);
}

function renderHeader() {
  const watched = episodes.filter((e) => e.watched_at).length;
  const seasons = seasonsMap();
  const secured = [...seasons.values()].filter((eps) => eps.every((e) => e.watched_at)).length;
  const lit = gate.setProgress(watched, episodes.length);
  document.getElementById("overall-count").textContent = `${pad3(watched)} / ${pad3(episodes.length)}`;
  document.getElementById("chevron-count").textContent = `${lit} / 9`;
  document.getElementById("season-count").textContent = `${pad(secured)} / ${pad(seasons.size)}`;
  document.getElementById("overall-bar").style.width = `${episodes.length ? (watched / episodes.length) * 100 : 0}%`;
  if (watched === episodes.length && episodes.length) setStatus("Wormhole established", "engaged");
  else if (!statusEl.classList.contains("busy")) setStatus(watched ? "Standing by" : "Idle");
}

function render() {
  const seasons = seasonsMap();
  root.replaceChildren(...[...seasons.keys()].sort((a, b) => a - b).map((s) => renderSeason(s, seasons.get(s))));
  renderHeader();
}

function rerenderSeason(season) {
  const eps = seasonsMap().get(season);
  const existing = root.querySelector(`[data-season="${season}"]`);
  const fresh = renderSeason(season, eps);
  existing ? existing.replaceWith(fresh) : root.append(fresh);
  renderHeader();
}

// ---------- actions ----------

async function mutate(season, applyLocal, request) {
  const snapshot = episodes.map((e) => ({ ...e }));
  applyLocal();
  rerenderSeason(season);
  try {
    await request();
    return true;
  } catch (err) {
    episodes = snapshot;
    rerenderSeason(season);
    toast(`Transmission failed: ${err.message}`, "error");
    return false;
  }
}

const seasonComplete = (season) => seasonsMap().get(season).every((e) => e.watched_at);

async function setEpisodeWatched(ep, watched) {
  lastToggled = ep.id;
  const wasComplete = seasonComplete(ep.season);
  const ok = await mutate(
    ep.season,
    () => (episodes.find((e) => e.id === ep.id).watched_at = watched ? new Date().toISOString() : null),
    () => api(`/api/episodes/${ep.id}`, { method: "PATCH", body: JSON.stringify({ watched }) }),
  );
  if (!ok) return;

  if (!watched) {
    sound.disengage();
    toast(wasComplete ? `Wormhole to ${DESTINATIONS[ep.season]} disengaged` : "Chevron disengaged", "warn");
    return;
  }

  setStatus("Dialing…", "busy");
  await gate.dial();
  const allDone = episodes.every((e) => e.watched_at);
  if (seasonComplete(ep.season)) {
    kawoosh();
    toast(`Chevron seven locked! Wormhole established to ${DESTINATIONS[ep.season] ?? "destination"}.`, "success");
  } else {
    const count = seasonsMap().get(ep.season).filter((e) => e.watched_at).length;
    toast(`Chevron ${NUMBER_WORDS[(count - 1) % 6]} encoded · ${ep.title}`);
    if (Math.random() < 0.2) setTimeout(() => toast(QUIPS[Math.floor(Math.random() * QUIPS.length)], "quip"), 600);
  }
  statusEl.classList.remove("busy");
  renderHeader();
  if (allDone) toast("All 10 seasons complete. Our planet is safe… for now.", "success");
}

async function setSeasonWatched(season, watched) {
  if (!watched && !confirm(`Shut down the gate? This will unmark every episode in season ${season}.`)) return;
  sound.dhd();
  const now = new Date().toISOString();
  lastToggled = null;
  const ok = await mutate(
    season,
    () =>
      episodes.forEach((e) => {
        if (e.season === season) e.watched_at = watched ? e.watched_at || now : null;
      }),
    () => api(`/api/seasons/${season}`, { method: "PATCH", body: JSON.stringify({ watched }) }),
  );
  if (!ok) return;
  if (watched) {
    setStatus("Dialing…", "busy");
    await gate.dial();
    kawoosh();
    statusEl.classList.remove("busy");
    renderHeader();
    toast(`Season ${season} secured. Wormhole established to ${DESTINATIONS[season] ?? "destination"}.`, "success");
  } else {
    sound.disengage();
    toast(`Season ${season} gate shut down`, "warn");
  }
}

function setDisc(ep, disc) {
  lastToggled = null;
  return mutate(
    ep.season,
    () => (episodes.find((e) => e.id === ep.id).disc = disc),
    () => api(`/api/episodes/${ep.id}`, { method: "PATCH", body: JSON.stringify({ disc }) }),
  );
}

// ---------- controls ----------

function applyIris(closed) {
  document.body.classList.toggle("hide-watched", closed);
  gate.setIris(closed);
  irisBtn.setAttribute("aria-pressed", String(closed));
  irisBtn.querySelector(".label").textContent = closed ? "Iris closed · watched hidden" : "Iris open";
  localStorage.setItem("hideWatched", closed ? "1" : "0");
}
irisBtn.addEventListener("click", () => {
  const closed = irisBtn.getAttribute("aria-pressed") !== "true";
  applyIris(closed);
  sound.disengage();
  toast(closed ? "Iris closed. Watched missions hidden." : "Iris open.", "info");
});
applyIris(localStorage.getItem("hideWatched") === "1");

function applySound() {
  soundBtn.setAttribute("aria-pressed", String(!sound.muted));
  soundBtn.querySelector(".label").textContent = sound.muted ? "Audio off" : "Audio on";
}
soundBtn.addEventListener("click", () => {
  sound.setMuted(!sound.muted);
  applySound();
  sound.dhd();
});
applySound();

// ---------- boot ----------

try {
  episodes = await api("/api/episodes");
  if (!episodes.length) {
    root.replaceChildren(el("p", { class: "error" }, "No missions on file. Run the D1 migrations to seed episodes."));
  } else {
    render();
  }
} catch (err) {
  root.replaceChildren(el("p", { class: "error" }, `Unable to establish a connection: ${err.message}`));
}
