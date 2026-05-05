const canvas = document.getElementById("page");
const centerButton = document.querySelector(".time-core");
const ringTexts = document.querySelectorAll(".ring-text");

const FONT = '"EB Garamond", Garamond, Georgia, serif';

function clamp(v, a, b){
  return Math.max(a, Math.min(b, v));
}

const mouse = {
  x:0,
  y:0,
  active:false
};

addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});

addEventListener("mouseleave", () => {
  mouse.active = false;
});

function fitCanvasFullscreen(c){
  const dpr = Math.max(1, devicePixelRatio || 1);
  const w = innerWidth;
  const h = innerHeight;

  c.width = Math.floor(w * dpr);
  c.height = Math.floor(h * dpr);

  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, w, h };
}

function wrapText(ctx, text, maxWidth){
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";

  for(const w of words){
    const test = line ? line + " " + w : w;

    if(ctx.measureText(test).width <= maxWidth){
      line = test;
    }else{
      if(line) lines.push(line);
      line = w;
    }
  }

  if(line) lines.push(line);
  return lines;
}

/* =========================
   FLOATING BACKGROUND LETTERS
   ========================= */

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const BG_COUNT = 170;
let bgLetters = [];

function initBgLetters(w, h){
  bgLetters = [];

  for(let i = 0; i < BG_COUNT; i++){
    let x = Math.random() * w;
    let y = Math.random() * h;

    /* title area 비워두기 */
    while(x < w * 0.28 && y < h * 0.18){
      x = Math.random() * w;
      y = Math.random() * h;
    }

    bgLetters.push({
      ch: LETTERS[(Math.random() * LETTERS.length) | 0],
      x:x,
      y:y,
      vx:(Math.random() - 0.5) * 0.05,
      vy:(Math.random() - 0.5) * 0.05,
      size:12 + Math.random() * 24,
      alpha:0.025 + Math.random() * 0.055,
      rot:(Math.random() - 0.5) * 0.35,
      wobble:Math.random() * 1000
    });
  }
}

function updateBgLetters(w, h, t){
  for(const p of bgLetters){
    p.x += p.vx + Math.sin(t * 0.00045 + p.wobble) * 0.025;
    p.y += p.vy + Math.cos(t * 0.00040 + p.wobble) * 0.025;

    if(p.x < -50) p.x = w + 50;
    if(p.x > w + 50) p.x = -50;
    if(p.y < -50) p.y = h + 50;
    if(p.y > h + 50) p.y = -50;
  }
}

function drawBgLetters(ctx){
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,245,225,1)";

  for(const p of bgLetters){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.font = `${p.size}px ${FONT}`;
    ctx.fillText(p.ch, 0, 0);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/* =========================
   PARTICLE SENTENCE
   ========================= */

class ParticleSentence{
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dots = [];
    this.text = "";
    this.visible = false;
    this.state = "idle";
    this.t0 = performance.now();
    this.w = 0;
    this.h = 0;

    this.resize();

    addEventListener("resize", () => {
      this.resize();
    });
  }

  resize(){
    const { ctx, w, h } = fitCanvasFullscreen(this.canvas);
    this.ctx = ctx;
    this.w = w;
    this.h = h;

    initBgLetters(w, h);

    if(this.text){
      this.buildDots(this.text, true);
    }
  }

  setContent(text){
    this.text = text;
    this.visible = true;
    this.state = "assemble";
    this.t0 = performance.now();
    this.buildDots(text, false);
  }

  hide(){
    this.visible = false;
    this.dots = [];
  }

  buildDots(text, keepPositions){
    const w = this.w;
    const h = this.h;

    const off = document.createElement("canvas");
    off.width = Math.floor(w);
    off.height = Math.floor(h);

    const o = off.getContext("2d");
    o.clearRect(0, 0, w, h);

    const centerX = w * 0.5;
    const centerY = h * 0.5;

    const maxW = w * 0.58;
    const maxH = h * 0.45;

    let fontSize = clamp(w * 0.045, 34, 72);
    let lines = [];
    let lineH = 0;

    for(let k = 0; k < 18; k++){
      o.font = `500 ${fontSize}px ${FONT}`;
      lines = wrapText(o, text, maxW);
      lineH = fontSize * 1.12;

      const blockH = lines.length * lineH;
      if(blockH <= maxH) break;

      fontSize *= 0.92;
    }

    o.fillStyle = "#2b0707";
    o.globalAlpha = 1;
    o.textBaseline = "top";
    o.textAlign = "center";

    const blockH = lines.length * lineH;
    let y = centerY - blockH / 2;

    for(let i = 0; i < lines.length; i++){
      const sway = Math.sin(i * 0.85) * (w * 0.004);
      o.fillText(lines[i], centerX + sway, y);
      y += lineH;
    }

    const mask = o.getImageData(0, 0, off.width, off.height);

    const targetDots = clamp(Math.floor((w * h) / 22), 32000, 90000);

    const prev = keepPositions ? this.dots : [];
    const dots = [];
    let tries = 0;

  while(dots.length < targetDots && tries < targetDots * 85){
      tries++;

      const x = Math.floor(Math.random() * off.width);
      const y0 = Math.floor(Math.random() * off.height);
      const a = (y0 * off.width + x) * 4 + 3;

      if(mask.data[a] > 6){
        const y2 = -Math.random() * off.height;
        const r = Math.random() < 0.82 ? 0.75 : Math.random() < 0.97 ? 1.0 : 1.25;

        dots.push({
          x0:x,
          y0:y0,
          x:x,
          y:y2,
          speed:{ x:0, y:0 },
          drift:(Math.random() * 2 - 1) * 1.1,
          fall:0.8 + Math.random() * 1.5,
          r:r
        });
      }
    }

    if(prev.length && keepPositions){
      const m = Math.min(prev.length, dots.length);

      for(let i = 0; i < m; i++){
        dots[i].x = prev[i].x;
        dots[i].y = prev[i].y;
        dots[i].speed.x = prev[i].speed?.x || 0;
        dots[i].speed.y = prev[i].speed?.y || 0;
      }
    }

    this.dots = dots;
  }

  draw(now){
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    ctx.clearRect(0, 0, w, h);

    updateBgLetters(w, h, now);
    drawBgLetters(ctx);

    if(!this.visible) return;

    const t = now - this.t0;

    if(this.state === "assemble" && t > 1900){
      this.state = "idle";
    }

    ctx.save();
    ctx.fillStyle = "rgba(36,20,20,0.98)";

    let mx = -9999;
    let my = -9999;

    if(mouse.active){
      mx = mouse.x;
      my = mouse.y;
    }

    for(const d of this.dots){
      if(this.state === "assemble"){
        const tt = clamp((t - d.x0 * 0.65) / 720, 0, 1);
        const a = tt * tt * tt;

        d.x = d.x0;
        d.y = d.y + (d.y0 - d.y) * a;
      }

      const dx = mx - d.x;
      const dy = my - d.y;
      const lenSq = dx * dx + dy * dy;

      if(lenSq < 1600){
        const dist = Math.sqrt(lenSq);
        const push = 40 - dist;

        d.speed.x += (dx / 40) * (push / 1.25);
        d.speed.y += (dy / 40) * (push / 1.25);
      }

      d.x += d.speed.x;
      d.y += d.speed.y;

      d.speed.x *= 0.92;
      d.speed.y *= 0.92;

      const rr = d.r;
      ctx.globalAlpha = this.state === "assemble" ? 0.995 : 0.99;
      ctx.fillRect(d.x - rr / 2, d.y - rr / 2, rr, rr);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

const TEXTS = [
  "For what had happened many centuries before was repeating itself.",
  "With relief, with humiliation, with terror, he understood that he also was an illusion.",
  "Someone else was dreaming him.",
  "All this had already happened.",
  "A dream inside another dream.",
  "The same circle returns in another form."
];

let idx = 0;
const page = new ParticleSentence(canvas);

function setPage(i){
  idx = clamp(i, 0, TEXTS.length - 1);
  page.setContent(TEXTS[idx]);
}

centerButton.addEventListener("click", () => {
  if(page.visible){
    page.hide();
  }else{
    setPage((idx + 1) % TEXTS.length);
  }
});

ringTexts.forEach((text) => {
  text.addEventListener("click", () => {
    const i = Number(text.dataset.index);
    if(Number.isFinite(i)){
      setPage(i);
    }
  });
});

addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    page.hide();
  }

  if(e.key === "ArrowRight"){
    setPage((idx + 1) % TEXTS.length);
  }

  if(e.key === "ArrowLeft"){
    setPage((idx - 1 + TEXTS.length) % TEXTS.length);
  }
});

function raf(now){
  page.draw(now);
  requestAnimationFrame(raf);
}

document.fonts.ready.then(() => {
  requestAnimationFrame(raf);
});