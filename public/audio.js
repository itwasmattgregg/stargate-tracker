// All sounds are synthesized with Web Audio; no audio files are shipped.
let ctx;
let muted = localStorage.getItem("muted") === "1";

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function noiseSource(c, seconds) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  return src;
}

function envelope(c, peak, attack, release, start = c.currentTime) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
  return g;
}

function play(fn) {
  if (muted) return;
  try {
    fn(audio());
  } catch {
    // Audio is decorative; ignore failures (e.g. autoplay restrictions).
  }
}

export const sound = {
  get muted() {
    return muted;
  },
  setMuted(value) {
    muted = value;
    localStorage.setItem("muted", value ? "1" : "0");
  },

  chevron() {
    play((c) => {
      const t = c.currentTime;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.25);
      const g = envelope(c, 0.7, 0.005, 0.35, t);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.4);

      const n = noiseSource(c, 0.15);
      const lp = c.createBiquadFilter();
      lp.type = "bandpass";
      lp.frequency.value = 1400;
      lp.Q.value = 0.8;
      const ng = envelope(c, 0.35, 0.002, 0.1, t);
      n.connect(lp).connect(ng).connect(c.destination);
      n.start(t);
    });
  },

  spin(seconds = 0.9) {
    play((c) => {
      const t = c.currentTime;
      const n = noiseSource(c, seconds + 0.2);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 380;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.12);
      g.gain.setValueAtTime(0.22, t + seconds - 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.1);
      n.connect(lp).connect(g).connect(c.destination);
      n.start(t);

      const hum = c.createOscillator();
      hum.type = "sawtooth";
      hum.frequency.value = 52;
      const hl = c.createBiquadFilter();
      hl.type = "lowpass";
      hl.frequency.value = 160;
      const hg = c.createGain();
      hg.gain.setValueAtTime(0.0001, t);
      hg.gain.exponentialRampToValueAtTime(0.12, t + 0.1);
      hg.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.1);
      hum.connect(hl).connect(hg).connect(c.destination);
      hum.start(t);
      hum.stop(t + seconds + 0.2);
    });
  },

  kawoosh() {
    play((c) => {
      const t = c.currentTime;
      const n = noiseSource(c, 2.6);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(180, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
      bp.frequency.exponentialRampToValueAtTime(420, t + 2.4);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      n.connect(bp).connect(g).connect(c.destination);
      n.start(t);

      const hum = c.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 64;
      const hg = c.createGain();
      hg.gain.setValueAtTime(0.0001, t + 0.3);
      hg.gain.exponentialRampToValueAtTime(0.25, t + 0.9);
      hg.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      hum.connect(hg).connect(c.destination);
      hum.start(t);
      hum.stop(t + 3.3);
    });
  },

  disengage() {
    play((c) => {
      const t = c.currentTime;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.7);
      const g = envelope(c, 0.35, 0.01, 0.7, t);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    });
  },

  dhd() {
    play((c) => {
      const t = c.currentTime;
      for (const [f, d] of [[620, 0], [930, 0.07]]) {
        const osc = c.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = f;
        const g = envelope(c, 0.25, 0.005, 0.12, t + d);
        osc.connect(g).connect(c.destination);
        osc.start(t + d);
        osc.stop(t + d + 0.2);
      }
    });
  },
};
