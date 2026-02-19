// page script.js (FULL) — Particle text + floating alphabet background
// Uses EB Garamond everywhere, adds subtle drifting letters behind the particle text.

const canvas = document.getElementById("page");
const folio = document.getElementById("folio");
const ticks = document.querySelectorAll(".tick");
const loopBtn = document.getElementById("loopBtn");

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
function easeInOut(t){ return t<.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }

const mouse = { x:0, y:0, active:false };
addEventListener("mousemove", (e)=>{
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
});
addEventListener("mouseleave", ()=> mouse.active = false);

function fitCanvasFullscreen(c){
  const dpr = Math.max(1, devicePixelRatio || 1);
  const w = innerWidth;
  const h = innerHeight;
  c.width  = Math.floor(w * dpr);
  c.height = Math.floor(h * dpr);
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return { ctx, w, h };
}

function wrapText(ctx, text, maxWidth){
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for(const w of words){
    const test = line ? (line + " " + w) : w;
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

/* ---- floating alphabet background (subtle) ---- */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let bgLetters = [];

function initBgLetters(w, h){
  const count = Math.max(90, Math.floor((w*h) / 14000)); // auto scale with viewport
  bgLetters = Array.from({length: count}, ()=>({
    ch: LETTERS[(Math.random()*LETTERS.length)|0],
    x: Math.random()*w,
    y: Math.random()*h,
    vx: (Math.random()-0.5)*0.08,
    vy: (Math.random()-0.5)*0.08,
    size: 10 + Math.random()*18,
    a: 0.03 + Math.random()*0.05,
    rot: (Math.random()-0.5)*0.25,
    wob: Math.random()*1000
  }));
}

function updateBgLetters(w, h, t){
  for(const p of bgLetters){
    p.x += p.vx + Math.sin(t*0.0006 + p.wob) * 0.03;
    p.y += p.vy + Math.cos(t*0.00055 + p.wob) * 0.03;

    if(p.x < -40) p.x = w + 40;
    if(p.x > w + 40) p.x = -40;
    if(p.y < -40) p.y = h + 40;
    if(p.y > h + 40) p.y = -40;
  }
}

function drawBgLetters(ctx, w, h){
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 235, 205, 1)"; // warm sand tone
  for(const p of bgLetters){
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.font = `${p.size}px "EB Garamond", Garamond, Georgia, serif`;
    ctx.fillText(p.ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

class ParticlePage{
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dots = [];
    this.state = "idle"; // assemble | idle | dissolve
    this.t0 = performance.now();
    this.text = "";
    this.pageNo = 25;

    this.w = 0; this.h = 0;
    this._resize();
    addEventListener("resize", ()=> this._resize());
  }

  _resize(){
    const { ctx, w, h } = fitCanvasFullscreen(this.canvas);
    this.ctx = ctx; this.w = w; this.h = h;

    // ✅ rebuild background letters on resize
    initBgLetters(w, h);

    if(this.text) this._buildDots(this.text, true);
  }

  setContent(text, pageNo){
    this.text = text;
    this.pageNo = pageNo;
    this._buildDots(text, false);
    this.state = "assemble";
    this.t0 = performance.now();
  }

  _buildDots(text, keepPositions){
    const w = this.w, h = this.h;

    const off = document.createElement("canvas");
    off.width = Math.floor(w);
    off.height = Math.floor(h);
    const o = off.getContext("2d");

    o.clearRect(0,0,w,h);

    const centerX = w * 0.5;

    const topPad = 140;
    const padY = Math.max(70, h * 0.10);

    const maxW = w * 0.55;
    const maxH = h - topPad - padY;

    let fontSize = clamp(w * 0.04, 26, 56);

    let lines = [];
    let lineH = 0;

    for(let k=0; k<18; k++){
      o.font = `400 ${fontSize}px "EB Garamond", Garamond, Georgia, serif`;
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
    let y = topPad + (maxH - blockH) * 0.5;

    for(let i=0; i<lines.length; i++){
      const sway = Math.sin(i * 0.85) * (w * 0.004);
      o.fillText(lines[i], centerX + sway, y);
      y += lineH;
    }

    const mask = o.getImageData(0,0,off.width,off.height);

    const targetDots = clamp(Math.floor((w*h)/22), 32000, 90000);

    const prev = keepPositions ? this.dots : [];
    const dots = [];

    let tries = 0;
    while(dots.length < targetDots && tries < targetDots*85){
      tries++;

      const x = Math.floor(Math.random()*off.width);
      const y0 = Math.floor(Math.random()*off.height);
      const a = (y0*off.width + x) * 4 + 3;

      if(mask.data[a] > 6){
        const y2 = -Math.random()*off.height;
        const r = (Math.random() < 0.82) ? 0.75 : (Math.random() < 0.97 ? 1.0 : 1.25);

        dots.push({
          x0: x,
          y0: y0,
          x: x,
          y: y2,
          speed: { x: 0, y: 0 },
          drift: (Math.random()*2-1) * 1.1,
          fall: 0.8 + Math.random()*1.5,
          r
        });
      }
    }

    if(prev.length && keepPositions){
      const m = Math.min(prev.length, dots.length);
      for(let i=0;i<m;i++){
        dots[i].x = prev[i].x;
        dots[i].y = prev[i].y;
        dots[i].speed.x = prev[i].speed?.x || 0;
        dots[i].speed.y = prev[i].speed?.y || 0;
      }
    }

    this.dots = dots;
  }

  startDissolve(){
    this.state = "dissolve";
    this.t0 = performance.now();
  }

  draw(now){
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    ctx.clearRect(0,0,w,h);

    // ✅ floating letters behind
    updateBgLetters(w, h, now);
    drawBgLetters(ctx, w, h);

    // ✅ 둥둥 + 회전 + breathing
    const s = now * 0.003;
    const fx = Math.sin(s * 0.35) * 10 + Math.sin(s * 0.12) * 6;
    const fy = Math.cos(s * 0.28) * 12 + Math.sin(s * 0.18) * 5;
    const rot = Math.sin(s * 0.18) * 0.03;
    const sc  = 1 + Math.sin(s * 0.22) * 0.015;

    ctx.save();
    ctx.translate(w*0.5, h*0.5);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.translate(-w*0.5 + fx, -h*0.5 + fy);

    ctx.fillStyle = "rgba(36, 20, 20, 0.98)";

    const t = now - this.t0;
    let p = 1;

    if(this.state === "assemble"){
      p = clamp(t/980, 0, 1);
      p = p*p*p;
      if(t > 1900) this.state = "idle";
    }else if(this.state === "dissolve"){
      p = clamp(t/1100, 0, 1);
      p = easeInOut(p);
    }

    let mx = -9999, my = -9999;
    if(mouse.active){
      mx = mouse.x;
      my = mouse.y;
    }

    for(const d of this.dots){

      if(this.state === "assemble" || this.state === "idle"){
        if(this.state === "assemble"){
          const tt = clamp((t - d.x0*0.65)/720, 0, 1);
          const a = tt*tt*tt;
          d.x = d.x0;
          d.y = d.y + (d.y0 - d.y) * a;
        }

        const dx = mx - d.x;
        const dy = my - d.y;
        const lenSq = dx*dx + dy*dy;

        if(lenSq < 1600){
          const dist = Math.sqrt(lenSq);
          const push = 40 - dist;
          d.speed.x += (dx/40) * (push/1.25);
          d.speed.y += (dy/40) * (push/1.25);
        }

        d.x += d.speed.x;
        d.y += d.speed.y;
        d.speed.x *= 0.92;
        d.speed.y *= 0.92;

        const rr = d.r;
        ctx.globalAlpha = (this.state === "assemble") ? 0.995 : 0.99;
        ctx.fillRect(d.x - rr/2, d.y - rr/2, rr, rr);
      }

      if(this.state === "dissolve"){
        const tx = d.x0 + d.drift * (220 + 380*p);
        const ty = d.y0 + d.fall  * (260 + 920*p);

        d.x = lerp(d.x, tx, 0.06 + 0.14*p);
        d.y = lerp(d.y, ty, 0.06 + 0.14*p);

        const rr = Math.max(0.6, (d.r + 0.25) - 1.0*p);
        ctx.globalAlpha = 1 - p;
        ctx.fillRect(d.x - rr/2, d.y - rr/2, rr, rr);
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* Quotes */
const TEXTS = [
  "The number of pages in this book is no more or less than infinite. None is the first page, none the last.",
  "Every time I tried, a number of pages came between the cover and my thumb. It was as if they kept growing from the book.",
  "If time is infinite, we may be at any point in time.",
  "The other man dreamed me… He dreamed, I now realize, the date on the dollar bill.",
  "The man of yesterday is not the man of today.",
  "If this morning and this meeting are dreams, each of us has to believe that he is the dreamer.",
  "Time passed like the sands.",
  "The Congress of the World began with the first moment of the world and it will go on when we are dust.",
  "There’s no place on earth where it does not exist.",
  "I know that I am, and that’s what sets me apart from my numberless colleagues, present and future."
];

let idx = 0;
let pageNo = 25;

const page = new ParticlePage(canvas);

// ---- Loop state
let loopTimer = null;
const LOOP_MS = 4200;

function setPage(i){
  idx = clamp(i, 0, TEXTS.length - 1);
  pageNo = 25 + idx; // change rule if you want
  page.setContent(TEXTS[idx], pageNo);
  if(folio) folio.textContent = `— ${pageNo} —`;
}

function shuffle(){
  const r = Math.floor(Math.random() * TEXTS.length);
  setPage(r);
}

function toggleLoop(){
  const isOn = !!loopTimer;

  if(isOn){
    clearInterval(loopTimer);
    loopTimer = null;
    if(loopBtn) loopBtn.classList.remove("isOn");
    return;
  }

  if(loopBtn) loopBtn.classList.add("isOn");

  loopTimer = setInterval(()=>{
    const next = (idx + 1) % TEXTS.length;
    setPage(next);
  }, LOOP_MS);
}

// ---- Clock click handlers (ONLY)
ticks.forEach(btn=>{
  btn.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();

    const action = btn.dataset.action;
    if(action === "shuffle") return shuffle();
    if(action === "loop") return toggleLoop();

    const i = Number(btn.dataset.i);
    if(Number.isFinite(i)) setPage(i);
  });
});

// ---- keyboard (optional)
addEventListener("keydown", (e)=>{
  if(e.key === "ArrowRight"){
    setPage((idx + 1) % TEXTS.length);
  }
  if(e.key === "ArrowLeft"){
    setPage((idx - 1 + TEXTS.length) % TEXTS.length);
  }
  if(e.key.toLowerCase() === "l"){
    toggleLoop();
  }
  if(e.key.toLowerCase() === "s"){
    shuffle();
  }
});

/* loop */
function raf(now){
  page.draw(now);
  requestAnimationFrame(raf);
}

/* init */
setPage(0);
requestAnimationFrame(raf);