// script.js — FULL 360° layout + bigger radius + longer needle
// Assumes: <canvas id="c"></canvas> exists

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.max(1, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener("resize", () => { resize(); buildAll(); });

const TAU = Math.PI * 2;
const FONT = `"EB Garamond", Garamond, Georgia, serif`;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function wrapLines(text, maxWidth, font) {
  ctx.font = font;
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

// ===== text pool =====
const HIGHLIGHTS = [
  "For what had happened many centuries before was repeating itself.",
  "With relief, with humiliation, with terror, he understood that he also was an illusion, that someone else was dreaming him.",
  "At times, he was disturbed by the impression that all this had already happened…",
  "His purpose had been fulfilled; the man remained in a kind of ecstasy."
];

const EXTRA = [
  "No one can number the pages of this book.",
  "Nothing is built on stone; all on sand.",
  "I felt that the book was monstrous.",
  "The universe is made of infinite possibilities.",
  "The book was infinite; it had no beginning or end.",
  "Time is not a river but a labyrinth.",
  "The number of pages in this book is no more or less than infinite.",
  "None is the first page; none the last.",
  "Every page led to another page, and to another.",
  "I thought of a map of shifting sands.",
  "The book was older than time.",
  "I sensed it was the work of chance or of evil.",
  "I had seen the beginning and the end of all things.",
  "The book was a cycle without origin.",
  "I could not find the first page.",
  "A labyrinth is a map of choices.",
  "In the mirror, another life was watching.",
  "The same moment returned in another form.",
  "Reality was a thin layer over a dream.",
  "The pages multiplied beneath my fingers.",
  "Everything was repeating, but not the same.",
  "Time folded like a paper corridor.",
  "He understood the world was a fiction.",
  "The present was only a rumor of the past."
];

const highlightSet = new Set(HIGHLIGHTS);
let sentences = [];

// ===== background drifting letters =====
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const bg = [];
const BG_COUNT = 170;

function initBG() {
  bg.length = 0;
  for (let i = 0; i < BG_COUNT; i++) {
    bg.push({
      ch: LETTERS[(Math.random() * LETTERS.length) | 0],
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      size: 12 + Math.random() * 22,
      alpha: 0.03 + Math.random() * 0.06,
      rot: (Math.random() - 0.5) * 0.25
    });
  }
}
function updateBG() {
  for (const p of bg) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
  }
}
function drawBG() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const p of bg) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = "rgba(255,245,225,1)";
    ctx.font = `${p.size}px ${FONT}`;
    ctx.fillText(p.ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ===== ring (FULL 360) =====
const ring = {
  cx: 0, cy: 0,
  r: 0,

  baseFont: 12,
  letterSpacing: 2.0,
  gapRad: 0.18,

  // 더 꽉차게: 레이어 많으면 바깥이 잘릴 수 있음 -> 10 추천
  layers: 8,
  layerSpacing: 75,
  layerFontScale: [1.18, 1.02, 0.90, 0.80, 0.70, 0.62, 0.55, 0.48, 0.42, 0.36],

  arcSpan: TAU,
  segs: []
};

function measureWidthWithSpacing(text, fontSize, spacing) {
  ctx.font = `${fontSize}px ${FONT}`;
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += ctx.measureText(text[i]).width + spacing;
  }
  return w;
}

function buildSentences() {
  // 너무 많으면 글씨 작아져서 별로 → 22개 정도가 가장 예쁨
  const all = shuffle([...EXTRA]);
  sentences = [...HIGHLIGHTS, ...all.slice(0, 22)];
  sentences = shuffle(sentences);
}

function fitPerLayer() {
  ring.cx = W * 0.5;
  ring.cy = H * 0.52;

  // ✅ 반지름 크게 (화면 꽉 찬 느낌)
  ring.r = Math.min(W, H) * 0.70;  // 0.48~0.54

  // ✅ 폰트/간격 확대
  const fs = clamp(Math.min(W, H) * 0.050, 24, 46);
  ring.baseFont = fs;

  ring.letterSpacing = clamp(fs * 0.06, 1.2, 3.2);
  ring.layerSpacing = clamp(Math.min(W, H) * 0.022, 78, 70);
  ring.gapRad = 0.58;
}

// ✅ 360°로 “무조건” 퍼뜨리는 슬롯 배치
function buildRing() {
  fitPerLayer();
  ring.segs.length = 0;

  const slotsPerLayer = 10; // 8~12
  const totalSlots = ring.layers * slotsPerLayer;

  // 풀 만들고 슬롯 수만큼만 사용
  const pool = shuffle([...new Set(sentences)]);
  const use = pool.slice(0, Math.min(pool.length, totalSlots));

  const step = TAU / totalSlots;
  const base = -Math.PI / 2;

  let idx = 0;
  for (let L = 0; L < ring.layers; L++) {
    const radius = ring.r + (L - (ring.layers - 1) / 2) * ring.layerSpacing;
    const fontSize = ring.baseFont * ring.layerFontScale[L];

    for (let s = 0; s < slotsPerLayer; s++) {
      if (idx >= use.length) break;

      const text = use[idx++];
      const isHighlight = highlightSet.has(text);

      const slotIndex = L * slotsPerLayer + s;
      const mid = base + slotIndex * step;

      const slotSpan = step * 0.82;

      // 텍스트가 슬롯보다 길면 spacing만 줄여서 “구겨 넣기”
      let localSpacing = ring.letterSpacing;
      let width = measureWidthWithSpacing(text, fontSize, localSpacing);
      let span = (width / (TAU * radius)) * TAU;

      if (span > slotSpan) {
        const ratio = slotSpan / span;
        localSpacing = ring.letterSpacing * clamp(ratio, 0.55, 0.95);
        width = measureWidthWithSpacing(text, fontSize, localSpacing);
        span = (width / (TAU * radius)) * TAU;
      }

      const start = mid - span / 2;
      const end = mid + span / 2;

      ring.segs.push({
        text,
        isHighlight,
        start, end, mid,
        layer: L,
        fontSize,
        hover: 0,
        boost: 0,
        seed: Math.random() * 1000,
        localSpacing
      });
    }
  }
}

// ===== mouse =====
let mx = -9999, my = -9999;
canvas.addEventListener("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  mx = e.clientX - r.left;
  my = e.clientY - r.top;
});
canvas.addEventListener("mouseleave", () => { mx = -9999; my = -9999; });

function updateHover() {
  const dx = mx - ring.cx;
  const dy = my - ring.cy;
  const dist = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);

  let best = -1;
  let bestScore = Infinity;

  for (let i = 0; i < ring.segs.length; i++) {
    const s = ring.segs[i];
    if (!s.isHighlight) continue;

    const radius = ring.r + (s.layer - (ring.layers - 1) / 2) * ring.layerSpacing;
    const rd = Math.abs(dist - radius);

    if (rd > ring.baseFont * 3.8) continue;

    let aTest = ang;
    while (aTest < s.start - Math.PI) aTest += TAU;
    while (aTest > s.end + Math.PI) aTest -= TAU;
    if (!(aTest >= s.start && aTest <= s.end)) continue;

    const dAng = Math.abs(aTest - s.mid);
    const score = rd * 1.0 + dAng * radius * 0.070;
    if (score < bestScore) { bestScore = score; best = i; }
  }

  for (let i = 0; i < ring.segs.length; i++) {
    const s = ring.segs[i];
    const target = (i === best) ? 1 : 0;
    s.hover += (target - s.hover) * 0.14;
  }
}

function ringDrift(t) {
  const ox = Math.sin(t * 0.35) * 6;
  const oy = Math.cos(t * 0.28) * 6;
  const wob = Math.sin(t * 0.22) * 0.010;
  return { ox, oy, wob };
}
function segFloatOffset(seg, t) {
  const s = seg.seed;
  const x = Math.sin(t * 0.55 + s) * 3.2;
  const y = Math.cos(t * 0.48 + s * 1.3) * 3.2;
  const r = Math.sin(t * 0.32 + s * 0.7) * 0.010;
  return { x, y, r };
}

// ===== needle =====
const needle = {
  angle: -Math.PI / 2,
  idleSpeed: 0.18,
  state: "idle",
  t0: 0,
  rollDur: 620,
  settleDur: 1300,
  rollSpeed: 13.5,
  wobble: 0,
  startAngle: 0,
  targetAngle: 0,
  selectedSeg: null,
  showCenter: false
};

function normalize(a) { a %= TAU; if (a < 0) a += TAU; return a; }
function shortestTurn(from, to) {
  let d = normalize(to) - normalize(from);
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}
function pickRandomHighlight() {
  const hs = ring.segs.filter(s => s.isHighlight);
  return hs[(Math.random() * hs.length) | 0];
}

function startSpinSequence() {
  if (needle.state !== "idle") return;

  needle.selectedSeg = pickRandomHighlight();
  needle.showCenter = false;
  ring.segs.forEach(s => s.boost = 0);

  dotText.prepare(needle.selectedSeg.text);

  needle.t0 = performance.now();
  needle.state = "rolling";
}

// ===== DOT TEXT =====
const off = document.createElement("canvas");
const offCtx = off.getContext("2d");

const dotText = {
  dots: [],
  active: false,
  startedAt: 0,
  text: "",
  lines: [],
  cx: 0,
  cy: 0,
  fs: 56,
  maxW: 1000,

  dropout: 0.10,
  dotR: 0.98,
  jitter: 0.95,

  fadeIn: 90,
  hold: 1200,
  fadeOut: 650
};

function buildMask(lines, fs, maxW) {
  const lineH = fs * 1.08;
  const totalH = (lines.length - 1) * lineH;

  const pad = 90;
  const w = Math.floor((maxW + pad * 2) * DPR);
  const h = Math.floor((totalH + fs + pad * 2) * DPR);

  off.width = w;
  off.height = h;
  offCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  offCtx.clearRect(0, 0, w, h);

  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";
  offCtx.font = `500 ${fs}px ${FONT}`;
  offCtx.fillStyle = "rgba(255,255,255,1)";

  const ox = (maxW + pad * 2) / 2;
  const oy = (totalH + fs + pad * 2) / 2;
  for (let i = 0; i < lines.length; i++) {
    offCtx.fillText(lines[i], ox, oy - totalH / 2 + i * lineH);
  }

  return { pad, wPx: w, hPx: h, mask: offCtx.getImageData(0, 0, off.width, off.height) };
}

dotText.prepare = function (text) {
  this.text = text;
  this.dots.length = 0;
  this.active = false;

  this.cx = ring.cx;
  this.cy = ring.cy;

  this.fs = clamp(Math.min(W, H) * 0.070, 46, 90);
  this.maxW = Math.min(W * 0.78, 1050);

  const font = `${this.fs}px ${FONT}`;
  this.lines = wrapLines(text, this.maxW, font);

  const { pad, wPx, hPx, mask } = buildMask(this.lines, this.fs, this.maxW);
  const data = mask.data;

  const target = clamp(Math.floor((W * H) / 58), 12000, 32000);
  let tries = 0;

  const minPx = Math.max(2, Math.floor(1.8 * DPR));
  const cell = minPx;

  const gw = Math.ceil(wPx / cell);
  const gh = Math.ceil(hPx / cell);
  const used = new Uint8Array(gw * gh);

  while (this.dots.length < target && tries < target * 140) {
    tries++;

    const x = (Math.random() * wPx) | 0;
    const y = (Math.random() * hPx) | 0;

    const a = data[(y * wPx + x) * 4 + 3];
    if (a <= 40) continue;
    if (Math.random() < this.dropout) continue;

    const ix = (x / cell) | 0;
    const iy = (y / cell) | 0;
    const key = iy * gw + ix;
    if (used[key]) continue;

    used[key] = 1;
    this.dots.push({ x, y });
  }

  const left = this.cx - (this.maxW + pad * 2) / 2;
  const top = this.cy - ((hPx / DPR)) / 2;

  for (const p of this.dots) {
    const tx = left + (p.x / DPR);
    const ty = top + (p.y / DPR);
    p.x = tx + (Math.random() - 0.5) * this.jitter;
    p.y = ty + (Math.random() - 0.5) * this.jitter;
  }
};

dotText.start = function () {
  this.startedAt = performance.now();
  this.active = true;
};

dotText.alphaAt = function (now) {
  const t = now - this.startedAt;
  const inEnd = this.fadeIn;
  const holdEnd = this.fadeIn + this.hold;
  const outEnd = this.fadeIn + this.hold + this.fadeOut;

  if (t < 0) return 0;
  if (t < inEnd) return easeInOut(t / inEnd);
  if (t < holdEnd) return 1;
  if (t < outEnd) return 1 - easeInOut((t - holdEnd) / this.fadeOut);

  this.active = false;
  return 0;
};

dotText.draw = function (now) {
  if (!this.active) return;
  const a = this.alphaAt(now);
  if (a <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#2e231bff";

  const r = this.dotR;
  for (const d of this.dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

// ===== needle update =====
function updateNeedle(now, dt) {
  if (needle.state === "idle") {
    needle.angle = normalize(needle.angle + needle.idleSpeed * dt);
    return;
  }

  if (needle.state === "rolling") {
    const u = (now - needle.t0) / needle.rollDur;

    needle.wobble = Math.sin(now * 0.010) * 0.18 + Math.sin(now * 0.003) * 0.12;
    needle.angle = normalize(needle.angle + (needle.rollSpeed + needle.wobble) * dt);

    if (u >= 1) {
      needle.state = "settling";
      needle.t0 = now;

      needle.startAngle = needle.angle;

      const extraTurns = (2 + (Math.random() * 3) | 0) * TAU;
      const delta = shortestTurn(needle.startAngle, needle.selectedSeg.mid);
      needle.targetAngle = needle.startAngle + extraTurns + delta;
    }
    return;
  }

  if (needle.state === "settling") {
    const u = clamp((now - needle.t0) / needle.settleDur, 0, 1);
    const k = easeOutCubic(u);
    needle.angle = needle.startAngle + (needle.targetAngle - needle.startAngle) * k;

    if (u >= 1) {
      needle.state = "idle";
      needle.angle = normalize(needle.angle);

      ring.segs.forEach(s => s.boost = 0);
      if (needle.selectedSeg) needle.selectedSeg.boost = 1;

      needle.showCenter = true;
      dotText.start();
    }
  }
}

function updateBoost() {
  for (const s of ring.segs) {
    if (s.boost > 0) s.boost += (0 - s.boost) * 0.04;
  }
}

// ===== draw ring =====
function drawRing(t) {
  const drift = ringDrift(t);

  // guide rings
  ctx.save();
  ctx.strokeStyle = "rgba(65,54,42,1)";
  ctx.lineWidth = 1;

  ctx.globalAlpha = 0.020;
  for (let L = 0; L < ring.layers; L++) {
    const radius = ring.r + (L - (ring.layers - 1) / 2) * ring.layerSpacing;
    ctx.beginPath();
    ctx.arc(ring.cx + drift.ox, ring.cy + drift.oy, radius, 0, TAU);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.012;
  for (const k of [-0.18, 0, 0.18]) {
    const radius = ring.r + k * ring.layerSpacing * ring.layers * 0.55;
    ctx.beginPath();
    ctx.arc(ring.cx + drift.ox, ring.cy + drift.oy, radius, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(ring.cx + drift.ox, ring.cy + drift.oy);
  ctx.rotate(drift.wob);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const s of ring.segs) {
    const hover = s.isHighlight ? Math.max(s.hover, s.boost) : 0;

    // 배경은 조금 더 흐리게
    const baseAlpha = s.isHighlight ? 0.70 : 0.22;
    ctx.save();
    ctx.globalAlpha = baseAlpha + 0.35 * hover;

    const brown = { r: 65, g: 54, b: 42 };
    const ivory = { r: 255, g: 245, b: 230 };
    const fr = Math.floor(lerp(brown.r, ivory.r, hover));
    const fg = Math.floor(lerp(brown.g, ivory.g, hover));
    const fb = Math.floor(lerp(brown.b, ivory.b, hover));

    ctx.font = `${s.fontSize}px ${FONT}`;
    ctx.fillStyle = `rgba(${fr},${fg},${fb},1)`;

    const shadowA = 0.18 + 0.72 * hover;
    const shadowB = 12 + 64 * hover;

    ctx.shadowColor = (hover > 0.01)
      ? `rgba(255,245,230,${shadowA})`
      : `rgba(0,0,0,0.26)`;
    ctx.shadowBlur = shadowB;

    const scale = 1 + 0.085 * hover;
    const radius = ring.r + (s.layer - (ring.layers - 1) / 2) * ring.layerSpacing;
    const f = segFloatOffset(s, t);

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.r);
    ctx.scale(scale, scale);

    let a = s.start;
    for (let i = 0; i < s.text.length; i++) {
      const ch = s.text[i];
      const w = ctx.measureText(ch).width + (s.localSpacing ?? ring.letterSpacing);
      const dA = (w / (TAU * radius)) * TAU;
      const gAng = a + dA * 0.5;

      const x = Math.cos(gAng) * radius;
      const y = Math.sin(gAng) * radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(gAng + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();

      a += dA;
    }

    ctx.restore();
    ctx.restore();
  }

  ctx.restore();
}

// ===== needle + center dot =====
function drawNeedle(t) {
  const drift = ringDrift(t);
  const cx = ring.cx + drift.ox;
  const cy = ring.cy + drift.oy;

  const centerR = Math.max(18, ring.baseFont * 0.95);
  const hoverCenter = (Math.hypot(mx - cx, my - cy) < centerR) ? 1 : 0;

  ctx.save();
  ctx.translate(cx, cy);

  // ✅ 바늘 길이 늘림
  const L = ring.r * 0.42; // 기존 0.70 -> 0.92
  const ang = needle.angle;

  ctx.strokeStyle = "rgba(0,0,0,0.38)";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(ang) * L, Math.sin(ang) * L);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,245,230,0.62)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(Math.cos(ang) * (L * 0.80), Math.sin(ang) * (L * 0.80));
  ctx.lineTo(Math.cos(ang) * L, Math.sin(ang) * L);
  ctx.stroke();

  const dotR = Math.max(7, ring.baseFont * 0.34);
  ctx.shadowColor = `rgba(255,245,230,${0.18 + 0.45 * hoverCenter})`;
  ctx.shadowBlur = 10 + 26 * hoverCenter;
  ctx.fillStyle = "rgba(226, 204, 180, 1)";
  ctx.beginPath();
  ctx.arc(0, 0, dotR, 0, TAU);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.18 + 0.28 * hoverCenter;
  ctx.strokeStyle = "rgba(255,245,230,1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, dotR + 10, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

function drawCenter(now) {
  if (!needle.showCenter || !needle.selectedSeg) return;
  dotText.draw(now);
}

canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;

  const drift = ringDrift(performance.now() * 0.001);
  const cx = ring.cx + drift.ox;
  const cy = ring.cy + drift.oy;

  const d = Math.hypot(x - cx, y - cy);
  const centerR = Math.max(18, ring.baseFont * 0.95);
  if (d < centerR) startSpinSequence();
});

// ===== loop =====
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now * 0.001;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  updateBG();
  drawBG();

  updateHover();
  updateNeedle(now, dt);
  updateBoost();

  drawRing(t);
  drawNeedle(t);
  drawCenter(now);

  requestAnimationFrame(loop);
}

function buildAll() {
  buildSentences();
  buildRing();
  initBG();

  needle.showCenter = false;
  needle.selectedSeg = null;
  needle.state = "idle";

  ring.segs.forEach(s => { s.hover = 0; s.boost = 0; });

  dotText.prepare(HIGHLIGHTS[0]);
}

// init
resize();
buildAll();
requestAnimationFrame(loop);