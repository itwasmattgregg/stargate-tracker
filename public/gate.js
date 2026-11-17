import { sound } from "./audio.js";

const GLYPHS = 39;
const RING_R = 163;
// SG-1 lock order for the nine chevron positions (index 0 = top, clockwise in 40° steps).
const LOCK_ORDER = [1, 2, 3, 6, 7, 8, 0, 4, 5];

export const glyphId = (n) => `g${String(n).padStart(2, "0")}`;

function gateMarkup() {
  const step = 360 / GLYPHS;
  const glyphs = Array.from({ length: GLYPHS }, (_, i) => {
    const angle = i * step;
    return `<use href="#${glyphId(i + 1)}" x="-9" y="-9" width="18" height="18" transform="rotate(${angle}) translate(0 ${-RING_R})" />`;
  }).join("");
  const dividers = Array.from({ length: GLYPHS }, (_, i) => {
    const angle = (i + 0.5) * step;
    return `<line x1="0" y1="-150" x2="0" y2="-176" transform="rotate(${angle})" />`;
  }).join("");
  const chevrons = Array.from({ length: 9 }, (_, k) => {
    return `<g class="chev" data-pos="${k}" transform="rotate(${k * 40})">
      <path class="chev-housing" d="M-25 -200 L25 -200 L15 -165 L-15 -165 Z" />
      <path class="chev-light" d="M-17 -196 L-8 -196 L0 -182 L8 -196 L17 -196 L0 -168 Z" />
    </g>`;
  }).join("");
  const blades = Array.from({ length: 20 }, (_, i) => {
    return `<path d="M0 0 L0 -146 A146 146 0 0 1 ${(146 * Math.sin(Math.PI / 10)).toFixed(1)} ${(-146 * Math.cos(Math.PI / 10)).toFixed(1)} Z" transform="rotate(${i * 18})" />`;
  }).join("");

  return `
  <svg class="gate-svg" viewBox="-205 -205 410 410" role="img" aria-label="Stargate showing overall progress">
    <defs>
      <radialGradient id="steel" r="0.5">
        <stop offset="0.72" stop-color="#2b3139" />
        <stop offset="0.86" stop-color="#7a8591" />
        <stop offset="0.95" stop-color="#4a535e" />
        <stop offset="1" stop-color="#262b32" />
      </radialGradient>
      <radialGradient id="puddle" r="0.5">
        <stop offset="0" stop-color="#f2fdff" />
        <stop offset="0.25" stop-color="#9fe6ff" />
        <stop offset="0.6" stop-color="#2c8fe6" />
        <stop offset="0.9" stop-color="#0d3f9e" />
        <stop offset="1" stop-color="#bff1ff" />
      </radialGradient>
      <filter id="ripple" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7">
          <animate attributeName="baseFrequency" dur="9s" values="0.014;0.028;0.014" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="22" />
      </filter>
      <filter id="chev-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <clipPath id="horizon-clip"><circle r="146" /></clipPath>
    </defs>

    <circle r="198" fill="url(#steel)" stroke="#11151a" stroke-width="3" />
    <circle r="178" class="g-groove" />
    <g class="g-ring">
      <circle r="${RING_R}" class="g-ring-band" />
      <g class="g-dividers">${dividers}</g>
      <g class="g-glyphs">${glyphs}</g>
    </g>
    <circle r="149" class="g-inner-rim" />

    <g clip-path="url(#horizon-clip)">
      <circle r="146" class="g-void" />
      <g class="g-horizon"><circle r="160" fill="url(#puddle)" filter="url(#ripple)" /></g>
      <g class="g-iris">${blades}</g>
    </g>

    <g class="g-chevrons">${chevrons}</g>
    <text class="g-readout" y="10" text-anchor="middle" id="gate-readout">0%</text>
  </svg>`;
}

export function createGate(container) {
  container.innerHTML = gateMarkup();
  const svg = container.querySelector("svg");
  const ring = svg.querySelector(".g-ring");
  const readout = svg.querySelector("#gate-readout");
  const chevs = [...svg.querySelectorAll(".chev")];
  let ringAngle = 0;
  let direction = 1;
  let busy = Promise.resolve();

  const gate = {
    setProgress(watched, total) {
      const complete = total > 0 && watched === total;
      const lit = complete ? 9 : Math.min(8, Math.floor((watched / Math.max(total, 1)) * 9));
      chevs.forEach((c) => c.classList.remove("lit"));
      LOCK_ORDER.slice(0, lit).forEach((pos) => chevs[pos].classList.add("lit"));
      svg.classList.toggle("active", complete);
      readout.textContent = total ? `${Math.floor((watched / total) * 100)}%` : "";
      return lit;
    },

    setIris(closed) {
      svg.classList.toggle("iris-closed", closed);
    },

    // Spin the inner ring, then engage the top chevron, like the SGC dialing one symbol.
    dial() {
      busy = busy.then(
        () =>
          new Promise((resolve) => {
            const delta = (60 + Math.random() * 140) * direction;
            direction *= -1;
            ringAngle += delta;
            ring.style.transform = `rotate(${ringAngle}deg)`;
            sound.spin(0.85);
            setTimeout(() => {
              chevs[0].classList.remove("engage");
              void chevs[0].getBBox();
              chevs[0].classList.add("engage");
              setTimeout(() => chevs[0].classList.remove("engage"), 900);
              sound.chevron();
              setTimeout(resolve, 250);
            }, 850);
          }),
      );
      return busy;
    },

    kawoosh() {
      svg.classList.remove("kawoosh");
      void svg.getBBox();
      svg.classList.add("kawoosh");
      setTimeout(() => svg.classList.remove("kawoosh"), 1800);
    },
  };
  return gate;
}
