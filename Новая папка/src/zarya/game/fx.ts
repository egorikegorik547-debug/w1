/* ───────────── Эффекты, анимации и «сок» мира ─────────────
 * ветер, тени от солнца, эмоции над головой, следы, пыль, флаги,
 * ambient-частицы (листья, птицы, бабочки), bloom и цветокоррекция
 */
import { B, TH, TW } from './data';
import type { Game, Unit } from './game';
import { hash2 } from './rng';
import { mk, type Cv } from './sprites';

type Ctx = CanvasRenderingContext2D;

/* ---------- ветер ---------- */

/** сила ветра 0..1, плавно бежит волной слева направо */
export function windAt(g: Game, x = 0): number {
  const t = g.waterT;
  const w = 0.5 + 0.34 * Math.sin(t * 0.8 - x * 0.02) + 0.16 * Math.sin(t * 2.3 - x * 0.05) * Math.sin(t * 0.27);
  return Math.max(0, Math.min(1, w));
}

/* ---------- свет ---------- */

export function lightOf(g: Game) {
  return Math.max(0, Math.min(1, 0.5 + 0.55 * Math.sin((g.dayT - 0.25) * Math.PI * 2)));
}

/* ---------- тени от солнца ---------- */

const silCache = new WeakMap<Cv, Cv>();
function silhouette(src: Cv): Cv {
  const hit = silCache.get(src);
  if (hit) return hit;
  const c = mk(src.width, src.height);
  const x = c.getContext('2d')!;
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#0a1232';
  x.fillRect(0, 0, c.width, c.height);
  silCache.set(src, c);
  return c;
}

function sunParams(g: Game) {
  const d = g.dayT;
  if (d < 0.2 || d > 0.82) return { k: 0.25, len: 0.22, a: 0.1 };
  const s = Math.max(0, Math.min(1, (d - 0.22) / 0.58));
  const k = (s - 0.5) * 2;
  const edge = 1 - Math.abs(k);
  return { k: k * 1.25, len: 0.2 + 0.32 * Math.abs(k), a: 0.07 + 0.2 * Math.min(1, edge * 2.2) };
}

/** длинная косая тень по направлению солнца. cx — центр, by — «земля» */
export function drawShadow(ctx: Ctx, g: Game, spr: Cv, cx: number, by: number, strength = 1, shrink = 1) {
  const p = sunParams(g);
  const a = p.a * strength;
  if (a < 0.02) return;
  const si = silhouette(spr);
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, a);
  ctx.transform(1, 0, p.k, -p.len * shrink, Math.round(cx), Math.round(by));
  ctx.drawImage(si, -Math.round(spr.width / 2), -spr.height);
  ctx.restore();
}

/** мягкая овальная «контактная» тень под ногами */
export function drawContact(ctx: Ctx, fx: number, fy: number, rx: number, a: number) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#0a0a1c';
  ctx.fillRect(Math.round(fx - rx), Math.round(fy - 1), rx * 2, 2);
  ctx.fillRect(Math.round(fx - rx + 1), Math.round(fy - 2), rx * 2 - 2, 1);
  ctx.fillRect(Math.round(fx - rx + 1), Math.round(fy + 1), rx * 2 - 2, 1);
  ctx.globalAlpha = a * 0.55;
  ctx.fillRect(Math.round(fx - rx - 1), Math.round(fy), rx * 2 + 2, 1);
  ctx.globalAlpha = 1;
}

/* ---------- флаги и знамёна, колышущиеся на ветру ---------- */

function shadeCol(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const gg = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${gg},${b})`;
}

export function drawFlag(ctx: Ctx, g: Game, x: number, y: number, col: string, size = 1) {
  const t = g.waterT;
  const w = windAt(g, x);
  const len = Math.round(8 * size);
  const hh = Math.round(5 * size);
  const ph = Math.round(14 * size);
  ctx.fillStyle = '#2a1c10';
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - ph - 1, 3, ph + 1);
  ctx.fillStyle = '#9a7448';
  ctx.fillRect(Math.round(x), Math.round(y) - ph, 1, ph);
  ctx.fillStyle = '#ffe27a';
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - ph - 2, 3, 2);
  const lite = shadeCol(col, 1.35);
  const dark = shadeCol(col, 0.65);
  for (let c = 0; c < len; c++) {
    const amp = (0.25 + c * 0.14) * (0.3 + 1.0 * w);
    const yo = Math.round(Math.sin(t * 5.2 - c * 0.85 + x * 0.07) * amp);
    const cx = Math.round(x) + 1 + c;
    const cy = Math.round(y) - ph + yo;
    const h = c > len - 3 ? hh - 1 : hh;
    ctx.fillStyle = dark;
    ctx.fillRect(cx, cy + h - 1, 1, 1);
    ctx.fillStyle = col;
    ctx.fillRect(cx, cy + 1, 1, Math.max(1, h - 2));
    ctx.fillStyle = lite;
    ctx.fillRect(cx, cy, 1, 1);
  }
}

export const FLAG_BUILDINGS: Record<string, { col: string; dx: number; dy: number; size: number }> = {
  hall: { col: '#d8aa2a', dx: 0, dy: 6, size: 1.2 },
  barracks: { col: '#c8303a', dx: 4, dy: 5, size: 1.1 },
  tower: { col: '#3a6ad8', dx: 0, dy: 4, size: 1 },
  camp: { col: '#e8742a', dx: -6, dy: 2, size: 0.9 },
  armory: { col: '#8a2a30', dx: 0, dy: 5, size: 0.9 },
  stable: { col: '#c8884a', dx: 0, dy: 5, size: 0.9 },
  siegeworks: { col: '#a02a2a', dx: 0, dy: 5, size: 0.9 },
  shrine: { col: '#7a5ad8', dx: 0, dy: 3, size: 0.9 },
  market: { col: '#2aa86a', dx: 0, dy: 6, size: 0.9 },
};

/* ---------- пиксельные эмоции ---------- */

const EMOTE_ART: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  heart: {
    rows: ['.rr.rr.', 'rhrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    pal: { r: '#e8304a', h: '#ff9aa8' },
  },
  beer: {
    rows: ['.fffff.', 'fffffff', '.yyyyyk', '.yhyyyk', '.yyyyyk', '.yyyyy.', '.ddddd.'],
    pal: { f: '#ffffff', y: '#f0a820', h: '#ffd868', d: '#8a5a1a', k: '#8890a0' },
  },
  question: {
    rows: ['..bbb..', '.bb.bb.', '.....bb', '....bb.', '...bb..', '.......', '...bb..'],
    pal: { b: '#2a5ac8' },
  },
  hammer: {
    rows: ['.gggg..', '.gHHg..', '.gggg..', '..bb...', '..bb...', '..bb...', '..bb...'],
    pal: { g: '#7a8294', H: '#c0c8d8', b: '#8a5a2a' },
  },
  sword: {
    rows: ['.....ss', '....sSs', '...sSs.', 'b.sSs..', '.bSs...', '.bb....', 'b.b....'],
    pal: { s: '#8890a0', S: '#e8ecf4', b: '#8a5a2a' },
  },
  exclaim: {
    rows: ['...r...', '..rrr..', '..rrr..', '..rrr..', '...r...', '.......', '...r...'],
    pal: { r: '#e82a2a' },
  },
};

const emoteCv: Record<string, Cv> = {};
function emoteSprite(key: string): Cv {
  if (emoteCv[key]) return emoteCv[key];
  const art = EMOTE_ART[key];
  const c = mk(13, 14);
  const x = c.getContext('2d')!;
  x.fillStyle = '#2a1c24';
  x.fillRect(1, 0, 11, 11);
  x.fillRect(0, 1, 13, 9);
  x.fillRect(5, 11, 3, 2);
  x.fillRect(6, 13, 1, 1);
  x.fillStyle = '#fffaf0';
  x.fillRect(2, 1, 9, 9);
  x.fillRect(1, 2, 11, 7);
  x.fillRect(5, 11, 3, 1);
  x.fillRect(6, 12, 1, 1);
  x.fillStyle = '#e4d8c4';
  x.fillRect(2, 9, 9, 1);
  art.rows.forEach((row, yy) => {
    for (let xx = 0; xx < 7; xx++) {
      const ch = row[xx];
      if (ch === '.') continue;
      x.fillStyle = art.pal[ch];
      x.fillRect(3 + xx, 2 + yy, 1, 1);
    }
  });
  emoteCv[key] = c;
  return c;
}

function periodic(t: number, ph: number, period: number, dur: number) {
  const m = (t + ph) % period;
  return m < dur ? m : -1;
}

/** какую эмоцию показывать над головой (null — никакой) */
export function emoteFor(g: Game, u: Unit): { key: string; age: number } | null {
  if (u.sleeping || u.spawn > 0) return null;
  const t = g.waterT;
  const L = g.life;
  const ph = (u.id * 1.931) % 9;
  if ((u.flee ?? 0) > 0) return { key: 'exclaim', age: 1 };
  const alarm = L.raiders.length > 0 || L.battleT > 0;
  if ((u.role === 'soldier' || u.role === 'hunter') && (alarm || u.phase === 'work')) {
    const m = periodic(t, ph, 4.2, 3.1);
    if (m >= 0) return { key: 'sword', age: m };
    return null;
  }
  if (u.role !== 'none') return null;
  if (u.task.type === 'craft') {
    const P = L.prod[u.task.site];
    if (P && P.status && P.status.indexOf('Не хватает') >= 0) {
      const m = periodic(t, ph, 3.6, 2.6);
      if (m >= 0) return { key: 'hammer', age: m };
    }
    return null;
  }
  if (u.moving || u.task.type !== 'idle') return null;
  if (u.trait === 'drunkard' && L.evening && !u.child) {
    const c = g.buildings[0];
    if (c && Math.hypot(u.x - (c.x + 1), u.y - (c.y + 1)) < 10) {
      const m = periodic(t, ph, 3.4, 2.6);
      if (m >= 0) return { key: 'beer', age: m };
    }
  }
  if (u.fam > 0) {
    const m = periodic(t, u.fam * 3.1, 12, 2.8);
    if (m >= 0) {
      for (const o of g.units) {
        if (o !== u && o.fam === u.fam && !o.moving && o.spawn <= 0 && !o.sleeping && Math.abs(o.x - u.x) < 2 && Math.abs(o.y - u.y) < 1.6) return { key: 'heart', age: m };
      }
    }
  }
  if (!u.child && lightOf(g) > 0.5) {
    const m = periodic(t, ph * 2.3, 14 + (u.id % 5), 2.4);
    if (m >= 0) return { key: 'question', age: m };
  }
  return null;
}

export function drawEmote(ctx: Ctx, g: Game, u: Unit, fx: number, fy: number) {
  const e = emoteFor(g, u);
  if (!e) return;
  const spr = emoteSprite(e.key);
  const pop = Math.min(1, e.age / 0.18);
  const bob = Math.round(Math.sin(g.waterT * 4 + u.id) * 1);
  const yy = Math.round(fy - (u.child ? 31 : 36) - bob + (1 - pop) * 6);
  ctx.globalAlpha = Math.min(1, pop * 1.4);
  ctx.drawImage(spr, Math.round(fx - 6), yy);
  ctx.globalAlpha = 1;
}

/* ---------- паника: капли пота ---------- */

export function drawSweat(ctx: Ctx, g: Game, u: Unit, fx: number, fy: number) {
  const t = g.waterT;
  for (let k = 0; k < 3; k++) {
    const ph = (t * 1.8 + k * 0.37 + u.id * 0.13) % 1;
    const side = k % 2 ? 1 : -1;
    const x = Math.round(fx + side * (4 + k) + (u.dir === 2 ? -2 : u.dir === 3 ? 2 : 0));
    const y = Math.round(fy - 24 + ph * 9);
    ctx.globalAlpha = 1 - ph * 0.7;
    ctx.fillStyle = '#bfe8ff';
    ctx.fillRect(x, y, 1, 2);
    ctx.fillStyle = '#5ab0ff';
    ctx.fillRect(x, y + 1, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/* ---------- световой след от замаха ---------- */

export function drawSlash(ctx: Ctx, fx: number, fy: number, dir: number, q: number, tool: number) {
  const ds = dir === 3 ? -1 : 1;
  const px = fx + ds * 2;
  const py = fy - 14;
  const R = tool === 3 ? 10 : tool === 1 ? 8 : 9;
  const a1 = -2.3 + q * 2.9;
  const a0 = Math.max(-2.3, a1 - 1.5);
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const f = i / n;
    const x = Math.round(px + Math.cos(a) * R * ds);
    const y = Math.round(py + Math.sin(a) * R * 0.9 + (dir === 0 ? 2 : dir === 1 ? -2 : 0));
    ctx.globalAlpha = 0.08 + f * f * 0.75 * (1 - q * 0.35);
    ctx.fillStyle = f > 0.75 ? '#ffffff' : '#b8e4ff';
    ctx.fillRect(x, y, 1, 1);
    if (f > 0.35) {
      ctx.globalAlpha *= 0.7;
      ctx.fillRect(x - ds, y, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------- следы, пыль ---------- */

export interface Print {
  x: number;
  y: number;
  t: number;
  d: number;
  side: number;
}

export function isRunning(u: Unit) {
  if ((u.flee ?? 0) > 0) return true;
  if (u.role === 'thief' || u.role === 'bandit') return true;
  if (u.role === 'soldier') return u.order?.kind === 'move' || (u.order?.kind === 'attack' && u.phase === 'goto');
  return false;
}

export function footFx(g: Game, u: Unit, dt: number) {
  if (!u.moving) {
    u.lx = u.x;
    u.ly = u.y;
    return;
  }
  const w = g.world;
  const bx = Math.floor(u.x);
  const by = Math.floor(u.y);
  if (bx < 0 || by < 0 || bx >= w.w || by >= w.h) return;
  const biome = w.biome[by * w.w + bx];
  const sandy = biome === B.BEACH || biome === B.DESERT;
  if (sandy) {
    const d = Math.hypot(u.x - (u.lx ?? u.x), u.y - (u.ly ?? u.y));
    if (d > 0.5) {
      g.prints.push({ x: u.x, y: u.y, t: 0, d: u.dir, side: g.prints.length & 1 });
      if (g.prints.length > 600) g.prints.shift();
      u.lx = u.x;
      u.ly = u.y;
    }
  }
  if (isRunning(u)) {
    u.fxT = (u.fxT ?? 0) - dt;
    if (u.fxT <= 0) {
      u.fxT = 0.09 + Math.random() * 0.05;
      const col = sandy ? 'rgba(236,214,160,0.75)' : biome >= B.OAK ? 'rgba(170,150,110,0.6)' : 'rgba(200,184,140,0.65)';
      const back = u.dir === 2 ? -1 : u.dir === 3 ? 1 : 0;
      g.particles.push({ x: u.x * TW + back * 3 + (Math.random() - 0.5) * 3, y: u.y * TH - 1, vx: back * (3 + Math.random() * 5) + (Math.random() - 0.5) * 4, vy: -4 - Math.random() * 5, life: 0.5, max: 0.5, color: col, size: 2, grav: 4, grow: 3 });
    }
  }
}

export function updatePrints(g: Game, dt: number) {
  const a = g.prints;
  for (let i = a.length - 1; i >= 0; i--) {
    a[i].t += dt;
    if (a[i].t > 16) a.splice(i, 1);
  }
}

export function drawPrints(ctx: Ctx, g: Game, left: number, top: number, vw: number, vh: number) {
  for (const p of g.prints) {
    const px = p.x * TW;
    const py = p.y * TH;
    if (px < left - 4 || px > left + vw + 4 || py < top - 4 || py > top + vh + 4) continue;
    const k = p.t / 16;
    const horiz = p.d === 2 || p.d === 3;
    const ox = horiz ? 0 : p.side ? 2 : -2;
    const oy = horiz ? (p.side ? 1 : -1) : 0;
    ctx.globalAlpha = 0.5 * (1 - k) * (1 - k * 0.4);
    ctx.fillStyle = '#8a7444';
    ctx.fillRect(Math.round(px + ox), Math.round(py + oy), horiz ? 2 : 1, horiz ? 1 : 2);
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = '#f6e6b8';
    ctx.fillRect(Math.round(px + ox), Math.round(py + oy) + (horiz ? 1 : 2), horiz ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;
}

let marchT = 0;
export function marchFx(g: Game, dt: number) {
  marchT -= dt;
  if (marchT > 0) return;
  marchT = 0.12;
  for (const m of g.marches) {
    const k = Math.min(1, m.t / m.dur);
    const x = (m.sx + 0.5 + (m.tx - m.sx) * k) * TW;
    const y = (m.sy + 0.7 + (m.ty - m.sy) * k) * TH;
    const back = m.tx >= m.sx ? -1 : 1;
    for (let i = 0; i < 2; i++) g.particles.push({ x: x + back * (4 + Math.random() * 8), y: y + (Math.random() - 0.5) * 8, vx: back * (3 + Math.random() * 6), vy: -3 - Math.random() * 4, life: 0.8, max: 0.8, color: 'rgba(200,182,140,0.6)', size: 2, grav: 0, grow: 4 });
  }
}

/* ---------- анимированная трава, цветы и вода ---------- */

const GRASS_COL: Record<number, [string, string]> = {
  [B.STEPPE]: ['#c8b45a', '#a89a44'],
  [B.FIELD]: ['#86c850', '#5eaa3a'],
  [B.FSTEPPE]: ['#8cc04c', '#68a03a'],
  [B.OAK]: ['#6cb446', '#4a9234'],
  [B.BIRCH]: ['#92cc58', '#6cae3e'],
  [B.AUTUMN]: ['#e0a838', '#c07a28'],
  [B.TAIGA]: ['#4e9a62', '#367a4c'],
  [B.DARK]: ['#3e8a4a', '#2c6a3a'],
};
const FLOWER_COL = ['#ff8aa8', '#ffffff', '#ffe27a', '#b08aff', '#ff9a4a'];

export function drawGroundLife(ctx: Ctx, g: Game, c0: number, c1: number, r0: number, r1: number) {
  const w = g.world;
  const t = g.waterT;
  const wy = Math.floor(t * 1.6);
  for (let ty = Math.max(0, r0); ty <= Math.min(w.h - 1, r1); ty++) {
    for (let tx = Math.max(0, c0); tx <= Math.min(w.w - 1, c1); tx++) {
      const i = ty * w.w + tx;
      const b = w.biome[i];
      if (b <= B.WATER) {
        const hh = hash2(tx, ty, 91);
        if (hh < 0.2) {
          const ph = (t * (0.9 + hh * 2) + hh * 40) % 3;
          if (ph < 1.6) {
            ctx.globalAlpha = 0.34 * Math.sin((ph / 1.6) * Math.PI) * (b === B.DEEP ? 0.7 : 1);
            ctx.fillStyle = '#d8f4ff';
            const x = tx * TW + Math.floor(hash2(tx, ty, 92) * 8) + Math.round(ph * 2);
            const yy = ty * TH + 3 + Math.floor(hash2(tx, ty, 93) * 6);
            ctx.fillRect(x, yy, 5, 1);
            ctx.fillRect(x + 1, yy + 1, 3, 1);
          }
        }
        continue;
      }
      const col = GRASS_COL[b];
      if (!col || w.blocked[i] || w.objs[i]) continue;
      const h1 = hash2(tx, ty, 71);
      if (h1 < 0.24) {
        const x = tx * TW + 2 + Math.floor(hash2(tx, ty, 72) * 11);
        const y = ty * TH + 4 + Math.floor(hash2(tx, ty, 73) * 7);
        const wind = windAt(g, x);
        const sway = Math.round(Math.sin(t * 2.1 + tx * 0.7 + ty * 0.35) * (0.4 + wind * 1.1));
        const tall = h1 < 0.1 ? 4 : 3;
        ctx.fillStyle = col[1];
        ctx.fillRect(x, y - 1, 1, 2);
        ctx.fillRect(x + 2, y - 1, 1, 2);
        ctx.fillStyle = col[0];
        ctx.fillRect(x + 1, y - 2, 1, 3);
        ctx.fillRect(x + 1, y - tall, 1, tall - 2);
        ctx.fillRect(x + 1 + sway, y - tall - 1, 1, 1);
        if (tall === 4) ctx.fillRect(x + sway, y - 3, 1, 1);
      } else if (h1 > 0.945 && b >= B.STEPPE && b <= B.BIRCH) {
        const x = tx * TW + 2 + Math.floor(hash2(tx, ty, 74) * 12);
        const y = ty * TH + 4 + Math.floor(hash2(tx, ty, 75) * 7);
        const c = FLOWER_COL[Math.floor(hash2(tx, ty, 76) * FLOWER_COL.length)];
        const bob = Math.round(Math.sin(t * 2.4 + tx * 1.3 + ty) * windAt(g, x) * 0.9);
        ctx.fillStyle = '#4a8a30';
        ctx.fillRect(x, y, 1, 2);
        ctx.fillStyle = c;
        ctx.fillRect(x + bob, y - 1, 1, 1);
        if (((wy + tx * 3 + ty) & 7) === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + bob, y - 2, 1, 1);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------- ambient: листья, птицы, бабочки, пыльца ---------- */

export function drawAmbient(ctx: Ctx, g: Game, left: number, top: number, vw: number, vh: number) {
  const t = g.waterT;
  const light = lightOf(g);
  const day = Math.max(0, Math.min(1, (light - 0.35) / 0.4));
  const w = windAt(g, left);
  const leafCols = ['#6cb446', '#92cc58', '#e0a838', '#c8742a', '#4a9a4a'];
  for (let i = 0; i < 16; i++) {
    const sp = 14 + (i % 5) * 5 + w * 26;
    const x = left + (((i * 97.3 + t * sp) % (vw + 60)) - 30);
    const y = top + ((i * 53.7 + t * (5 + (i % 3) * 2)) % (vh + 20)) - 10 + Math.sin(t * 2.2 + i * 1.7) * 5;
    const fl = Math.floor(t * 6 + i) & 1;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = leafCols[i % leafCols.length];
    ctx.fillRect(Math.round(x), Math.round(y), fl ? 2 : 1, fl ? 1 : 2);
  }
  ctx.globalAlpha = 1;
  if (day < 0.1) return;
  for (let k = 0; k < 2; k++) {
    const per = 70 + k * 23;
    const m = (t + k * 31) % per;
    if (m > 26) continue;
    const f = m / 26;
    const bx = left - 30 + f * (vw + 60);
    const by = top + vh * (0.15 + k * 0.28) + Math.sin(f * 6 + k) * 8;
    for (let n = 0; n < 4; n++) {
      const x = bx - n * 9 - (n % 2) * 3;
      const y = by + n * 4 * (n % 2 ? 1 : -1) * 0.8;
      const wing = Math.floor(t * 7 + n + k) & 1;
      ctx.globalAlpha = 0.6 * day;
      ctx.fillStyle = '#10141c';
      ctx.fillRect(Math.round(x), Math.round(y) + (wing ? 1 : 0), 2, 1);
      ctx.fillRect(Math.round(x) - 1, Math.round(y) + (wing ? 0 : 1), 1, 1);
      ctx.fillRect(Math.round(x) + 2, Math.round(y) + (wing ? 0 : 1), 1, 1);
      ctx.globalAlpha = 0.14 * day;
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(Math.round(x), Math.round(y) + 18, 3, 1);
    }
  }
  const wd = g.world;
  for (let i = 0; i < 7; i++) {
    const cx = left + ((((i * 71.3 + Math.sin(t * 0.13 + i) * 40) % vw) + vw) % vw);
    const cy = top + ((((i * 47.9 + Math.cos(t * 0.17 + i * 2) * 30) % vh) + vh) % vh);
    const x = cx + Math.sin(t * 0.9 + i * 3) * 16;
    const y = cy + Math.cos(t * 1.3 + i) * 8 + Math.sin(t * 7 + i) * 1.2;
    const tx = Math.floor(x / TW);
    const ty = Math.floor(y / TH);
    if (tx < 0 || ty < 0 || tx >= wd.w || ty >= wd.h) continue;
    const b = wd.biome[ty * wd.w + tx];
    if (b < B.STEPPE || b > B.BIRCH) continue;
    const flap = Math.floor(t * 9 + i * 2) & 1;
    const col = ['#ff9ac8', '#ffe27a', '#9ad0ff', '#ffffff', '#ffa050', '#c89aff'][i % 6];
    ctx.globalAlpha = day;
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x) - (flap ? 2 : 1), Math.round(y) - (flap ? 1 : 0), flap ? 2 : 1, flap ? 2 : 1);
    ctx.fillRect(Math.round(x) + 1, Math.round(y) - (flap ? 1 : 0), flap ? 2 : 1, flap ? 2 : 1);
    ctx.fillStyle = '#2a1a20';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  for (let i = 0; i < 10; i++) {
    const x = left + ((i * 131.1 + t * 3) % vw);
    const y = top + ((((i * 71.9 - t * 2.2) % vh) + vh) % vh);
    const a = (0.25 + 0.4 * Math.sin(t * 1.6 + i * 2)) * day;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff2b0';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/* ---------- экранные эффекты: bloom, лучи, цветокор ---------- */

let bloomCv: Cv | null = null;
let bloomCv2: Cv | null = null;

export function bloom(ctx: Ctx, cw: number, ch: number, strength: number) {
  const qw = Math.max(4, Math.ceil(cw / 6));
  const qh = Math.max(4, Math.ceil(ch / 6));
  if (!bloomCv) bloomCv = mk(qw, qh);
  if (!bloomCv2) bloomCv2 = mk(qw >> 1, qh >> 1);
  if (bloomCv.width !== qw || bloomCv.height !== qh) {
    bloomCv.width = qw;
    bloomCv.height = qh;
    bloomCv2.width = qw >> 1;
    bloomCv2.height = qh >> 1;
  }
  const a = bloomCv.getContext('2d')!;
  const b = bloomCv2.getContext('2d')!;
  a.imageSmoothingEnabled = true;
  b.imageSmoothingEnabled = true;
  a.globalCompositeOperation = 'copy';
  a.filter = 'brightness(0.8) contrast(1.9) saturate(1.2)';
  a.drawImage(ctx.canvas, 0, 0, qw, qh);
  a.filter = 'none';
  b.globalCompositeOperation = 'copy';
  b.drawImage(bloomCv, 0, 0, qw >> 1, qh >> 1);
  a.globalCompositeOperation = 'copy';
  a.drawImage(bloomCv2, 0, 0, qw, qh);
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = strength;
  ctx.drawImage(bloomCv, 0, 0, cw, ch);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function godRays(ctx: Ctx, g: Game, cw: number, ch: number, light: number, rain: number) {
  const day = Math.max(0, Math.min(1, (light - 0.5) / 0.4)) * (1 - rain);
  if (day < 0.05) return;
  const t = g.waterT;
  const warm = 1 - Math.abs(g.dayT - 0.5) * 3;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x0 = ((i * 0.19 + 0.04) * cw + Math.sin(t * 0.12 + i * 2) * cw * 0.03) % cw;
    const wdt = cw * (0.05 + (i % 3) * 0.025);
    const sk = ch * 0.55;
    const gr = ctx.createLinearGradient(x0, 0, x0 + sk * 0.3, ch);
    const a = (0.028 + 0.016 * Math.sin(t * 0.5 + i * 1.7)) * day * (0.6 + 0.4 * Math.max(0, warm));
    gr.addColorStop(0, `rgba(255,236,170,${a})`);
    gr.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + wdt, 0);
    ctx.lineTo(x0 + wdt + sk * 0.55, ch);
    ctx.lineTo(x0 + sk * 0.55 - wdt * 0.2, ch);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function colorGrade(ctx: Ctx, cw: number, ch: number, night: number) {
  ctx.globalCompositeOperation = 'soft-light';
  const gr = ctx.createLinearGradient(0, 0, 0, ch);
  gr.addColorStop(0, `rgba(90,150,255,${0.16 * (1 - night)})`);
  gr.addColorStop(0.55, 'rgba(255,255,255,0)');
  gr.addColorStop(1, `rgba(255,170,90,${0.14 * (1 - night)})`);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = 'source-over';
}
