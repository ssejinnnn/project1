const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

let W = 0, H = 0, DPR = 1;

function resize(){
  DPR = Math.max(1, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize", resize);

/* =========================
   Mouse (hover)
========================= */
let mouseX = -9999, mouseY = -9999;
canvas.addEventListener("mousemove", (e)=>{
  const r = canvas.getBoundingClientRect();
  mouseX = e.clientX - r.left;
  mouseY = e.clientY - r.top;
});
canvas.addEventListener("mouseleave", ()=>{
  mouseX = -9999; mouseY = -9999;
});

/* =========================
   BG floating letters
========================= */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const bg = [];
const BG_COUNT = 210;

function initBG(){
  bg.length = 0;
  for(let i=0;i<BG_COUNT;i++){
    bg.push({
      ch: LETTERS[(Math.random()*LETTERS.length)|0],
      x: Math.random()*W,
      y: Math.random()*H,
      vx:(Math.random()-0.5)*0.06,
      vy:(Math.random()-0.5)*0.06,
      size: 12 + Math.random()*18,
      alpha: 0.06 + Math.random()*0.10,
      rot:(Math.random()-0.5)*0.25
    });
  }
}
function updateBG(){
  for(const p of bg){
    p.x += p.vx; p.y += p.vy;
    if(p.x<0)p.x=W; if(p.x>W)p.x=0;
    if(p.y<0)p.y=H; if(p.y>H)p.y=0;
  }
}
function drawBG(){
  ctx.save();
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  for(const p of bg){
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle="rgba(255,245,225,.9)";
    ctx.font = `${p.size}px "EB Garamond", serif`;
    ctx.fillText(p.ch,0,0);
    ctx.restore();
  }
  ctx.restore();
}

/* =========================
   Quotes
========================= */
const QUOTES = [
  "An invisible labyrinth of time.",
  "The phrase “to various future times, but not to all” suggested the image of bifurcating in time, not in space.",
  "In all fiction, when a man is faced with alternatives he chooses one at the expense of the others. In the almost unfathomable Ts’ui Pên, he chooses—simultaneously—all of them.",
  "He believed in an infinite series of times, in a dizzily growing, ever spreading network of diverging, converging and parallel times.",
  "He thus creates various futures, various times which start others that will in their turn branch out and bifurcate in other times.",
  "This web of time—the strands of which approach one another, bifurcate, intersect or ignore each other through the centuries—embraces every possibility."
];

/* =========================
   Helpers
========================= */
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function inSafeArea(x,y){
  const leftTop = (x < 520 && y < 150);
  const rightTop = (x > W-260 && y < 130);
  return !(leftTop || rightTop);
}

function pickLayout(i){
  const layouts = [
    {nx:0.52, ny:0.46},
    {nx:0.32, ny:0.34},
    {nx:0.70, ny:0.30},
    {nx:0.60, ny:0.60},
    {nx:0.36, ny:0.66},
    {nx:0.66, ny:0.78}
  ];
  const t = layouts[i] || {nx:0.5, ny:0.5};
  return {
    x: W * (t.nx + (Math.random()-0.5)*0.04),
    y: H * (t.ny + (Math.random()-0.5)*0.05),
  };
}

function styleFor(i){
  const sizes = [30, 22, 20, 26, 18, 24];
  const angles = [-0.06, 0.03, -0.02, 0.05, 0.00, -0.04];
  const opacities = [0.95, 0.88, 0.86, 0.92, 0.82, 0.90];
  return {
    size: (sizes[i] || 22) + (Math.random()-0.5)*2,
    angle: (angles[i] || 0) + (Math.random()-0.5)*0.02,
    alpha: (opacities[i] || 0.9)
  };
}

function wrapLines(text, maxWidth){
  const words = text.split(/\s+/);
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
function clampLines(lines, maxLines){
  if(lines.length <= maxLines) return lines;
  const cut = lines.slice(0, maxLines);
  cut[maxLines-1] = cut[maxLines-1].replace(/\s+$/,"") + "…";
  return cut;
}

/* =========================
   Easing + swirl curve
========================= */
function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }
function easeInOut(t){ return t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
function easeOutQuad(t){ return 1 - (1-t)*(1-t); }

// smooth swirl around final position
function curvePoint(s){
  const a = Math.PI * 2 * s;
  const x = Math.cos(a) * 140 + Math.cos(a*2) * 55;
  const y = Math.sin(a) * 55  + Math.sin(a*2) * 22;
  return {x,y};
}

/* =========================
   Scramble -> Final char
========================= */
function displayChar(finalCh, tChar, seed){
  if(finalCh === " ") return " ";
  if(tChar > 0.82) return finalCh;

  const speed = 0.10 + (1 - tChar) * 0.45;
  const tick = Math.floor(performance.now() * 0.001 / speed);

  const base = (finalCh.charCodeAt(0) * 17 + tick * 13 + (seed|0)) >>> 0;
  return LETTERS[base % LETTERS.length];
}

/* =========================
   Build chars for sentence
========================= */
function buildChars(lines, size){
  const chars = [];
  ctx.font = `${size}px "EB Garamond", serif`;
  const lineH = size * 1.25;
  const totalH = lineH * (lines.length - 1);

  for(let li=0; li<lines.length; li++){
    const text = lines[li];
    const widths = [];
    for(let i=0;i<text.length;i++) widths.push(ctx.measureText(text[i]).width);

    const lineW = widths.reduce((a,b)=>a+b,0);
    let x = -lineW/2;

    for(let ci=0; ci<text.length; ci++){
      const ch = text[ci];
      const w = widths[ci];

      const R = 220 + Math.random()*620;
      const ang = Math.random()*Math.PI*2;

      chars.push({
        ch,
        fx: x + w/2,
        fy: (li * lineH) - totalH/2,
        idx: chars.length,

        // scattered start offset
        sx: Math.cos(ang)*R + (Math.random()-0.5)*140,
        sy: Math.sin(ang)*R + (Math.random()-0.5)*140,

        // stagger per char
        delay: chars.length * 0.016 + Math.random()*0.06
      });

      x += w;
    }
  }
  return chars;
}

/* =========================
   Floating (sentence-level)
========================= */
function floatOffset(n, now, k){
  const t = now * 0.001;
  const ramp = 0.10 + 0.90 * k;

  const x = (Math.sin(t * n.fSp1 + n.fPh1) * n.fAmp1
          +  Math.sin(t * n.fSp2 + n.fPh2) * n.fAmp2) * ramp;

  const y = (Math.cos(t * (n.fSp1*0.9) + n.fPh1) * (n.fAmp1 * 0.75)
          +  Math.sin(t * (n.fSp2*0.8) + n.fPh2) * (n.fAmp2 * 0.65)) * ramp;

  const r = Math.sin(t * n.rSp + n.rPh) * n.rAmp * ramp;
  return {x,y,r};
}

/* =========================
   Hover picking
========================= */
function estimateHoverRadius(n){
  const base = 80 + n.size * 3.2;
  const extra = Math.min(240, n.text.length * 2.2);
  return base + extra;
}

function updateHover(){
  let best = null;
  let bestD = Infinity;

  for(const n of nodes){
    const r = estimateHoverRadius(n);
    const cx = n.x + (n._fx||0);
    const cy = n.y + (n._fy||0);
    const d = Math.hypot(mouseX - cx, mouseY - cy);
    if(d < r && d < bestD){
      best = n;
      bestD = d;
    }
  }

  for(const n of nodes){
    const target = (n === best) ? 1 : 0;
    n.hover = (n.hover || 0) + (target - (n.hover || 0)) * 0.12;
  }
}

/* =========================
   Nodes + links
========================= */
const nodes = [];
const links = [];

function addNode(){
  if(nodes.length >= QUOTES.length) return;

  const i = nodes.length;
  let pos = pickLayout(i);

  pos.x = clamp(pos.x, 120, W-120);
  pos.y = clamp(pos.y, 110, H-90);
  if(!inSafeArea(pos.x, pos.y)) pos.y = 170 + Math.random()*80;

  const st = styleFor(i);

  ctx.font = `${st.size}px "EB Garamond", serif`;
  const maxWidth = Math.min(620, W * 0.62);
  let lines = wrapLines(QUOTES[i], maxWidth);
  lines = clampLines(lines, 3);

  const seed = (Math.random() * 1e9) | 0;

  const n = {
    text: QUOTES[i],
    lines,
    x: pos.x,
    y: pos.y,
    size: st.size,
    angle: st.angle,
    baseAlpha: st.alpha,

    seed,
    t0: performance.now(),
    dur: 1900,

    chars: buildChars(lines, st.size),

    // floating params (unique per node)
    fAmp1: 10 + Math.random()*18,
    fAmp2: 4 + Math.random()*10,
    fSp1: 0.14 + Math.random()*0.22,
    fSp2: 0.08 + Math.random()*0.18,
    fPh1: Math.random()*Math.PI*2,
    fPh2: Math.random()*Math.PI*2,
    rAmp: 0.010 + Math.random()*0.020,
    rSp:  0.06 + Math.random()*0.16,
    rPh:  Math.random()*Math.PI*2,

    hover: 0,
    _fx: 0,
    _fy: 0
  };

  if(nodes.length > 0){
    links.push({ a: nodes[nodes.length-1], b: n, t0: performance.now(), dur: 700 });
  }
  nodes.push(n);
}

canvas.addEventListener("click", addNode);

/* =========================
   Buttons (optional)
========================= */
let auto = false;
let lastAuto = 0;

document.getElementById("clear")?.addEventListener("click", (e)=>{
  e.stopPropagation();
  nodes.length = 0;
  links.length = 0;
});
document.getElementById("shuffle")?.addEventListener("click", (e)=>{
  e.stopPropagation();
  for(let i=0;i<nodes.length;i++){
    let pos = pickLayout(i);
    pos.x = clamp(pos.x, 120, W-120);
    pos.y = clamp(pos.y, 110, H-90);
    if(!inSafeArea(pos.x, pos.y)) pos.y = 170 + Math.random()*80;

    const st = styleFor(i);

    ctx.font = `${st.size}px "EB Garamond", serif`;
    const maxWidth = Math.min(620, W * 0.62);
    let lines = wrapLines(nodes[i].text, maxWidth);
    lines = clampLines(lines, 3);

    nodes[i].x = pos.x;
    nodes[i].y = pos.y;
    nodes[i].size = st.size;
    nodes[i].angle = st.angle;
    nodes[i].baseAlpha = st.alpha;
    nodes[i].lines = lines;
    nodes[i].chars = buildChars(lines, st.size);

    nodes[i].t0 = performance.now();
    nodes[i].dur = 1900;
    nodes[i].seed = (Math.random() * 1e9) | 0;

    nodes[i].fAmp1 = 10 + Math.random()*18;
    nodes[i].fAmp2 = 4 + Math.random()*10;
    nodes[i].fSp1 = 0.14 + Math.random()*0.22;
    nodes[i].fSp2 = 0.08 + Math.random()*0.18;
    nodes[i].fPh1 = Math.random()*Math.PI*2;
    nodes[i].fPh2 = Math.random()*Math.PI*2;
    nodes[i].rAmp = 0.010 + Math.random()*0.020;
    nodes[i].rSp  = 0.06 + Math.random()*0.16;
    nodes[i].rPh  = Math.random()*Math.PI*2;
    nodes[i].hover = 0;
  }
  for(const L of links){
    L.t0 = performance.now();
    L.dur = 600;
  }
});
document.getElementById("auto")?.addEventListener("click", (e)=>{
  e.stopPropagation();
  auto = !auto;
  e.currentTarget.textContent = `auto drift: ${auto ? "on" : "off"}`;
  lastAuto = performance.now();
});

/* =========================
   Draw links
========================= */
function drawLinks(now){
  ctx.save();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = "rgba(255,240,220,.35)";

  for(const L of links){
    const tt = clamp((now - L.t0)/L.dur, 0, 1);
    const k = easeOutQuad(tt);

    const x1 = L.a.x + (L.a._fx||0), y1 = L.a.y + (L.a._fy||0);
    const x2 = L.b.x + (L.b._fx||0), y2 = L.b.y + (L.b._fy||0);

    const mx = x1 + (x2-x1)*k;
    const my = y1 + (y2-y1)*k;

    ctx.globalAlpha = 0.10 + 0.25*k;

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(mx,my);
    ctx.stroke();
  }
  ctx.restore();
}

/* =========================
   Draw nodes (SCRAMBLE + FLOAT + HOVER COLOR/SHADOW)
========================= */
function drawNodes(now){
  ctx.save();
  ctx.textAlign="center";
  ctx.textBaseline="middle";

  for(const n of nodes){
    const tt = clamp((now - n.t0)/n.dur, 0, 1);
    const k = easeOutCubic(tt);

    // float
    const f = floatOffset(n, now, k);
    n._fx = f.x;
    n._fy = f.y;

    const hover = n.hover || 0;

    // ✅ text fill: brown -> ivory only on hover (smooth)
    const brown = { r:65, g:54, b:42 };
    const hoverFill = { r:255, g:245, b:230 };
    const fr = Math.floor(brown.r + (hoverFill.r - brown.r) * hover);
    const fg = Math.floor(brown.g + (hoverFill.g - brown.g) * hover);
    const fb = Math.floor(brown.b + (hoverFill.b - brown.b) * hover);
    const fill = `rgba(${fr}, ${fg}, ${fb}, 1)`;

    // ✅ glow strength
    const shadowBlur = 18 + 26 * hover;
    const shadowAlpha = 0.55 + 0.25 * hover;

    // ✅ shadowColor changes on hover exactly as you asked
    const glowColor = hover > 0.01
      ? `rgba(255, 245, 230, ${shadowAlpha})`
      : `rgba(0, 0, 0, ${shadowAlpha})`;

    // transform first (important order)
    const scale = 1 + 0.09 * hover;
    const rot = (n.angle + f.r) * (1 - 0.55 * hover);

    ctx.save();
    ctx.translate(n.x + f.x, n.y + f.y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    ctx.font = `${n.size}px "EB Garamond", serif`;
    ctx.fillStyle = fill;

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = shadowBlur;

    // draw chars
    for(const c of n.chars){
      const tChar = clamp((k - c.delay) / (1 - c.delay), 0, 1);
      const kk = easeInOut(tChar);

      const swirl = curvePoint(kk);
      const amp = (1 - tChar);

      const px = c.fx + c.sx * amp * 0.55 + swirl.x * amp * 0.95;
      const py = c.fy + c.sy * amp * 0.55 + swirl.y * amp * 0.95;

      const aBase = n.baseAlpha * (0.06 + 0.94 * tChar);
      const a = clamp(aBase * (1 + 0.28 * hover), 0, 1);

      const ch = displayChar(c.ch, tChar, n.seed + c.idx * 97);

      if(ch !== " "){
        // small extra glow pass for hover (optional but nice)
        if(hover > 0.01){
          ctx.globalAlpha = a * (0.16 + 0.22 * hover);
          ctx.shadowBlur = shadowBlur * 1.25;
          ctx.fillText(ch, px, py);
          ctx.shadowBlur = shadowBlur;
        }

        // main
        ctx.globalAlpha = a;
        ctx.fillText(ch, px, py);
      }
    }

    // underline glow on hover
    if(hover > 0.02){
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.16 * hover;
      ctx.strokeStyle = "rgba(255,245,230,0.95)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-220, 30);
      ctx.quadraticCurveTo(0, 44, 220, 30);
      ctx.stroke();

      // restore
      ctx.shadowBlur = shadowBlur;
      ctx.shadowColor = glowColor;
    }

    ctx.restore();
  }

  ctx.restore();
}

/* =========================
   Loop
========================= */
function loop(now){
  // clear
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(DPR,0,0,DPR,0,0);

  updateBG();
  drawBG();

  if(auto && (now - lastAuto) > 1300 && nodes.length < QUOTES.length){
    addNode();
    lastAuto = now;
  }

  updateHover();
  drawLinks(now);
  drawNodes(now);

  requestAnimationFrame(loop);
}

/* =========================
   Init
========================= */
resize();
initBG();
requestAnimationFrame(loop);
