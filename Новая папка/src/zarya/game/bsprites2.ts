import { TH, TW, BUILDINGS } from './data';
import type { SpecId } from './meta';
import { hash2 } from './rng';
import { mk, type BuildingSprites, type Cv } from './sprites';
import { ARCH, SPEC_BUILD_IDS, SPEC_STYLE, type WallKind } from './specbuild';

interface Pal {
  wall: string[];
  roof: string[];
  accent: string;
  trim: string;
}

const PALS: Record<SpecId, Pal> = {
  smith: { wall: ['#a39890', '#7a6e66', '#4c423c'], roof: ['#2e2220', '#523630', '#774c3e', '#a8694a'], accent: '#f08a24', trim: '#3a2c26' },
  miner: { wall: ['#a6aab8', '#7e8294', '#545868'], roof: ['#2e2418', '#4e3c26', '#705436', '#977650'], accent: '#9fb0d0', trim: '#2c2a34' },
  lumber: { wall: ['#c08c52', '#92683a', '#5e4022'], roof: ['#1e3a22', '#2f5a30', '#4a8244', '#78b660'], accent: '#4fc07a', trim: '#3a2814' },
  warrior: { wall: ['#b09484', '#85665a', '#583e36'], roof: ['#4a1414', '#7c2424', '#b03c3c', '#e0685a'], accent: '#ff5a5f', trim: '#2c1a18' },
  trader: { wall: ['#ecdcb4', '#cbb484', '#8e7a50'], roof: ['#16304e', '#27507c', '#4278ac', '#78aede'], accent: '#ffd45a', trim: '#4a3a1e' },
  farmer: { wall: ['#e4cc96', '#bc9c64', '#80622e'], roof: ['#6a4c14', '#9c7e2a', '#caa844', '#efd676'], accent: '#8ad04a', trim: '#4a3418' },
  sage: { wall: ['#eceef6', '#bcc0d6', '#82869f'], roof: ['#22224c', '#36367e', '#5252b0', '#8686e0'], accent: '#5ab4ff', trim: '#2a2a4a' },
  factory: { wall: ['#bc6e54', '#92503c', '#602e26'], roof: ['#22262c', '#3c4852', '#5a6c78', '#8499a8'], accent: '#62dce2', trim: '#20242a' },
};

function sh(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}

class Pn {
  c: Cv;
  g: CanvasRenderingContext2D;
  constructor(public w: number, public h: number) {
    this.c = mk(w, h);
    this.g = this.c.getContext('2d')!;
  }
  r(x: number, y: number, w: number, h: number, col: string) {
    this.g.fillStyle = col;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  px(x: number, y: number, col: string) {
    this.r(x, y, 1, 1, col);
  }
  ell(cx: number, cy: number, rx: number, ry: number, col: string) {
    this.g.fillStyle = col;
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const t = 1 - (y * y) / (ry * ry + 0.001);
      if (t < 0) continue;
      const hw = Math.round(rx * Math.sqrt(t));
      this.g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, col: string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, col);
  }
}

function wallTex(p: Pn, kind: WallKind, x: number, y: number, w: number, h: number, pal: string[], seed: number) {
  p.r(x, y, w, h, pal[0]);
  if (kind === 'plank') {
    for (let r = 0; r < h; r += 3) p.r(x, y + r + 2, w, 1, pal[2]);
    for (let i = 0; i < w; i += 5) for (let r = 0; r < h; r += 6) p.r(x + i + ((r / 6) % 2 ? 2 : 0), y + r, 1, 3, pal[1]);
  } else if (kind === 'log') {
    for (let r = 0; r < h; r += 4) {
      p.r(x, y + r, w, 1, sh(pal[0], 1.15));
      p.r(x, y + r + 1, w, 2, pal[1]);
      p.r(x, y + r + 3, w, 1, pal[2]);
    }
    for (let r = 0; r < h; r += 4) {
      p.r(x - 1, y + r, 2, 3, pal[0]);
      p.r(x + w - 1, y + r, 2, 3, pal[0]);
    }
  } else if (kind === 'stone' || kind === 'metal') {
    for (let r = 0; r * 4 < h; r++) {
      let cx = -((r % 2) * 3);
      while (cx < w) {
        const bw = 5 + Math.floor(hash2(r, cx + 9, seed) * 4);
        const t = hash2(r, cx + 33, seed);
        const col = t < 0.3 ? pal[0] : t < 0.75 ? sh(pal[0], 0.93) : pal[1];
        for (let yy = 0; yy < 4 && r * 4 + yy < h; yy++) for (let xx = 0; xx < bw && cx + xx < w; xx++) if (cx + xx >= 0) p.px(x + cx + xx, y + r * 4 + yy, xx === 0 || yy === 3 ? pal[2] : yy === 0 ? sh(pal[0], 1.1) : col);
        if (kind === 'metal' && cx >= 0) p.px(x + cx + 1, y + r * 4 + 1, '#d8dce4');
        cx += bw;
      }
    }
  } else if (kind === 'brick') {
    for (let r = 0; r * 3 < h; r++) {
      p.r(x, y + r * 3 + 2, w, 1, '#c9b8a8');
      for (let i = (r % 2) * 3; i < w; i += 6) {
        p.r(x + i, y + r * 3, 1, 2, '#c9b8a8');
        if (hash2(i, r, seed) < 0.25) p.r(x + i + 1, y + r * 3, 4, 2, pal[1]);
      }
    }
  } else {
    for (let i = 0; i < w * h * 0.04; i++) p.px(x + hash2(i, 1, seed) * w, y + hash2(i, 2, seed) * h, pal[1]);
    p.r(x, y, w, 2, sh(pal[0], 1.06));
    p.r(x, y, 2, h, '#6a4a2e');
    p.r(x + w - 2, y, 2, h, '#6a4a2e');
    p.r(x, y + Math.floor(h / 2), w, 1, '#6a4a2e');
    for (let i = 8; i < w - 8; i += 9) p.line(x + i, y + 1, x + i + 3, y + Math.floor(h / 2), '#6a4a2e');
  }
  // объём: тень справа, блик слева, низ
  p.g.fillStyle = 'rgba(10,8,24,0.22)';
  p.g.fillRect(x + w - Math.max(3, Math.round(w * 0.12)), y, Math.max(3, Math.round(w * 0.12)), h);
  p.g.fillStyle = 'rgba(255,248,220,0.14)';
  p.g.fillRect(x, y, 2, h);
  p.g.fillStyle = 'rgba(0,0,0,0.18)';
  p.g.fillRect(x, y + h - 2, w, 2);
}

function roofPoly(p: Pn, xtl: number, xtr: number, yt: number, xbl: number, xbr: number, yb: number, pal: string[], seed: number, rough = false) {
  for (let y = yt; y <= yb; y++) {
    const t = (y - yt) / Math.max(1, yb - yt);
    const xl = Math.round(xtl + (xbl - xtl) * t);
    const xr = Math.round(xtr + (xbr - xtr) * t);
    const row = y - yt;
    for (let x = xl; x <= xr; x++) {
      let col = pal[2];
      const band = row % 4;
      if (band === 3) col = pal[1];
      else if ((x + Math.floor(row / 4) * 2) % 5 === 0 && band < 3) col = pal[1];
      if (x < xl + (xr - xl) * 0.3 && (x + y) % 2 === 0 && band < 3) col = pal[3];
      if (x > xr - (xr - xl) * 0.22) col = band === 3 ? pal[0] : pal[1];
      if (rough && hash2(x, y, seed) < 0.18) col = hash2(y, x, seed) < 0.5 ? pal[3] : pal[0];
      if (y === yt) col = pal[3];
      if (x === xl || x === xr || y === yb) col = pal[0];
      p.px(x, y, col);
    }
  }
  p.g.fillStyle = 'rgba(0,0,0,0.28)';
  p.g.fillRect(Math.round(Math.min(xbl, xtl)), yb + 1, Math.round(Math.max(xbr, xtr) - Math.min(xbl, xtl)) + 1, 2);
}

function windowAt(p: Pn, x: number, y: number, trim: string) {
  p.r(x - 1, y - 1, 6, 7, trim);
  p.r(x, y, 4, 5, '#ffe08a');
  p.r(x, y, 4, 2, '#fff2b8');
  p.r(x + 1, y, 1, 5, '#8a5a1e');
  p.r(x, y + 2, 4, 1, '#8a5a1e');
  p.r(x - 1, y + 6, 6, 1, sh(trim, 1.4));
}

function doorAt(p: Pn, cx: number, bottom: number, wd: number, trim: string, big = false) {
  const h = big ? 12 : 9;
  const x = cx - Math.floor(wd / 2);
  p.r(x - 1, bottom - h - 1, wd + 2, h + 1, trim);
  p.r(x, bottom - h, wd, h, '#3a2412');
  p.r(x + 1, bottom - h + 1, wd - 2, h - 1, '#5a3a1e');
  if (big) p.r(cx, bottom - h, 1, h, '#2a180c');
  p.r(x + wd - 2, bottom - Math.round(h / 2), 1, 1, '#ffd45a');
  p.ell(cx, bottom - h, wd / 2, 1.5, trim);
}

function paint(id: string): { cv: Cv; smoke?: { x: number; y: number }; fire?: { x: number; y: number } } {
  const info = SPEC_STYLE[id];
  const def = BUILDINGS[id];
  const arch = ARCH[info.arch];
  const st = arch.style;
  const pal = PALS[info.spec];
  const seed = info.idx * 31 + info.spec.length * 7 + info.arch.length;
  const lvl = info.tier; // ступень развития делает здание богаче
  const rich = lvl >= 12;
  const grand = lvl >= 22;
  const pw = def.w * TW;
  const ph = def.h * TH;
  let smoke: { x: number; y: number } | undefined;
  let fire: { x: number; y: number } | undefined;

  if (st.kind === 'field') {
    const p = new Pn(pw + 8, ph + 14);
    const x0 = 4;
    const y0 = 8;
    p.g.fillStyle = 'rgba(10,10,20,0.2)';
    p.g.fillRect(x0 + 2, y0 + ph - 1, pw, 3);
    const cropCol = [sh(pal.accent, 0.8), pal.accent, '#e8c84a'];
    if (st.decor.includes('crops')) {
      p.r(x0, y0, pw, ph, '#6a4424');
      for (let r = 0; r < ph; r += 3) {
        p.r(x0, y0 + r, pw, 1, '#4e3016');
        for (let i = 1; i < pw - 1; i += 3) {
          const t = hash2(i, r, seed);
          p.px(x0 + i, y0 + r + 1, cropCol[t < 0.4 ? 0 : t < 0.8 ? 1 : 2]);
          p.px(x0 + i, y0 + r, cropCol[1]);
        }
      }
      if (st.decor.includes('scarecrow')) {
        p.r(x0 + pw - 7, y0 - 6, 1, 10, '#6a4a22');
        p.r(x0 + pw - 10, y0 - 4, 7, 1, '#6a4a22');
        p.r(x0 + pw - 8, y0 - 8, 3, 3, '#e8d098');
        p.r(x0 + pw - 9, y0 - 9, 5, 1, '#8a5a1e');
      }
    } else if (st.decor.includes('trees')) {
      p.r(x0, y0, pw, ph, '#5e9a3e');
      for (let i = 0; i < 5; i++) p.r(x0 + hash2(i, 5, seed) * pw, y0 + hash2(i, 6, seed) * ph, 3, 2, '#7ac050');
      const spots: [number, number][] = [[6, 6], [pw - 10, 6], [pw / 2 - 2, ph - 6], [4, ph - 4], [pw - 8, ph - 4]];
      spots.forEach(([tx, ty], k) => {
        const cx = x0 + tx + 2;
        const cy = y0 + ty;
        p.r(cx, cy, 2, 5, '#6a4426');
        p.ell(cx + 1, cy - 4, 5, 5, '#2f7a30');
        p.ell(cx, cy - 5, 4, 4, '#48a040');
        p.px(cx - 2, cy - 5, k % 2 ? '#ff5a5a' : '#ffd45a');
        p.px(cx + 2, cy - 3, k % 2 ? '#ffd45a' : '#ff5a5a');
      });
      for (let i = 0; i < 9; i++) p.px(x0 + hash2(i, 8, seed) * pw, y0 + hash2(i, 9, seed) * ph, ['#ff7ab0', '#ffe05a', '#ffffff'][i % 3]);
    } else {
      p.r(x0, y0, pw, ph, '#6aa844');
      for (let i = 0; i < 14; i++) p.px(x0 + hash2(i, 5, seed) * pw, y0 + hash2(i, 6, seed) * ph, '#86c85a');
      for (let i = 0; i < 4; i++) {
        const ax = x0 + 6 + i * (pw / 4.4);
        const ay = y0 + 6 + (i % 2) * 6;
        p.ell(ax, ay, 4, 2.5, i % 2 ? '#f4f0e6' : '#8a6a46');
        p.r(ax + 3, ay - 3, 3, 3, i % 2 ? '#f4f0e6' : '#8a6a46');
        p.r(ax - 2, ay + 2, 1, 2, '#3a2a1a');
        p.r(ax + 2, ay + 2, 1, 2, '#3a2a1a');
      }
    }
    if (st.decor.includes('fence') || st.decor.includes('crops')) {
      p.r(x0 - 1, y0 + ph - 1, pw + 2, 1, '#8a6238');
      for (let i = 0; i <= pw; i += 4) p.r(x0 + i - 1, y0 + ph - 4, 1, 5, '#6a4a28');
      p.r(x0 - 1, y0 + ph - 3, pw + 2, 1, '#b88a52');
      p.r(x0 - 1, y0, 1, ph, '#6a4a28');
      p.r(x0 + pw, y0, 1, ph, '#6a4a28');
    }
    return { cv: p.c };
  }

  if (st.kind === 'statue') {
    const p = new Pn(pw + 14, ph + 30);
    const cx = Math.round(p.w / 2);
    const b = p.h - 3;
    p.g.fillStyle = 'rgba(10,10,24,0.3)';
    p.ell(cx + 1, b - 1, 9, 3, 'rgba(10,10,24,0.3)');
    wallTex(p, 'stone', cx - 7, b - 8, 14, 8, pal.wall, seed);
    wallTex(p, 'stone', cx - 5, b - 15, 10, 7, pal.wall, seed + 1);
    p.r(cx - 6, b - 16, 12, 1, sh(pal.wall[0], 1.15));
    const fig = grand ? '#e8c860' : sh(pal.wall[0], 1.12);
    p.r(cx - 2, b - 30, 4, 4, fig);
    p.r(cx - 3, b - 26, 6, 10, fig);
    p.r(cx - 5, b - 25, 2, 7, fig);
    p.r(cx + 3, b - 29, 2, 12, fig);
    p.r(cx + 4, b - 33, 1, 4, '#c8d0e0');
    p.r(cx - 1, b - 30, 1, 3, sh(fig, 1.25));
    p.r(cx + 1, b - 26, 2, 10, sh(fig, 0.78));
    p.r(cx - 4, b - 32, 8, 1, pal.accent);
    return { cv: p.c };
  }

  if (st.kind === 'well') {
    const p = new Pn(pw + 10, 34);
    const cx = Math.round(p.w / 2);
    const b = 31;
    p.ell(cx + 1, b - 1, 10, 3, 'rgba(10,10,24,0.3)');
    wallTex(p, 'stone', cx - 7, b - 9, 14, 9, pal.wall, seed);
    p.ell(cx, b - 9, 7, 2.5, sh(pal.wall[0], 1.15));
    p.ell(cx, b - 9, 5, 1.6, '#1c3a5a');
    p.r(cx - 7, b - 22, 2, 14, '#6a4426');
    p.r(cx + 5, b - 22, 2, 14, '#6a4426');
    roofPoly(p, cx - 4, cx + 4, b - 28, cx - 10, cx + 10, b - 21, pal.roof, seed);
    p.r(cx, b - 21, 1, 8, '#c8b078');
    p.r(cx - 1, b - 13, 3, 3, '#8a6238');
    return { cv: p.c };
  }

  if (st.kind === 'mine') {
    const p = new Pn(pw + 10, ph + 26);
    const b = p.h - 3;
    const cx = Math.round(p.w / 2);
    p.ell(cx, b - 1, pw / 2 + 2, 4, 'rgba(10,10,24,0.28)');
    for (let y = 0; y < 24; y++) {
      const hw = Math.round((pw / 2 + 2) * Math.sqrt(Math.max(0, 1 - ((24 - y - 12) / 14) ** 2)));
      for (let x = -hw; x <= hw; x++) {
        const t = hash2(x + 50, y, seed);
        const base = pal.wall[x < -hw * 0.2 ? 0 : x > hw * 0.4 ? 2 : 1];
        p.px(cx + x, b - 24 + y, t < 0.12 ? sh(base, 1.2) : t > 0.9 ? sh(base, 0.8) : base);
      }
    }
    p.r(cx - 7, b - 13, 14, 13, '#1a1410');
    p.r(cx - 8, b - 14, 2, 14, '#6a4426');
    p.r(cx + 6, b - 14, 2, 14, '#6a4426');
    p.r(cx - 8, b - 15, 17, 2, '#8a6238');
    p.r(cx - 5, b - 11, 10, 11, '#0c0a08');
    p.r(cx - 5, b - 2, 10, 1, '#8a8a96');
    if (st.decor.includes('cart')) {
      p.r(cx + 9, b - 6, 9, 5, '#5a4a38');
      p.r(cx + 10, b - 8, 7, 2, pal.accent);
      p.ell(cx + 11, b - 1, 1.5, 1.5, '#222');
      p.ell(cx + 16, b - 1, 1.5, 1.5, '#222');
    }
    p.px(cx - 9, b - 18, '#ffe27a');
    return { cv: p.c, fire: undefined };
  }

  if (st.kind === 'yard') {
    const p = new Pn(pw + 10, ph + 26);
    const b = p.h - 2;
    p.r(5, b - ph + 2, pw, ph - 2, '#a08458');
    for (let i = 0; i < pw; i += 4) p.r(5 + i, b - ph + 2, 1, ph - 2, '#80663e');
    const cols = [pal.accent, pal.roof[3], '#ffffff', pal.roof[2]];
    const n = def.w >= 3 ? 3 : 2;
    for (let s = 0; s < n; s++) {
      const sx = 6 + s * Math.floor((pw - 2) / n);
      const sw = Math.floor((pw - 4) / n) - 1;
      const sy = b - 16 - (s % 2) * 3;
      p.r(sx, sy, 1, 16 + (s % 2) * 3, '#6a4426');
      p.r(sx + sw - 1, sy, 1, 16 + (s % 2) * 3, '#6a4426');
      for (let i = 0; i < sw; i++) p.r(sx + i, sy - 3, 1, 5 + (i % 2), cols[(i >> 1) % 2 === 0 ? s % 4 : 2]);
      p.r(sx, sy + 3, sw, 1, 'rgba(0,0,0,0.3)');
      p.r(sx + 1, sy + 9, sw - 2, 4, '#7a5a34');
      for (let i = 0; i < 3; i++) p.r(sx + 2 + i * 3, sy + 7, 2, 2, ['#e04a3a', '#f0c030', '#6ab04a'][(i + s) % 3]);
    }
    p.r(pw - 3, b - 6, 5, 5, '#8a6238');
    p.r(pw - 3, b - 6, 5, 1, '#b88a52');
    return { cv: p.c };
  }

  // ───── здания с корпусом ─────
  const extra = (st.decor.includes('stack') ? 12 : 0) + (st.decor.includes('tower') ? 10 : 0) + (st.kind === 'mill' ? 12 : 0);
  const W = pw + 12;
  const H = st.wallH + st.roofH + 18 + extra + (grand ? 4 : 0);
  const p = new Pn(W, H);
  const bottom = H - 3;
  p.ell(W / 2 + 2, bottom - 1, W / 2 - 1, 4, 'rgba(10,10,24,0.32)');
  const wl = 6;
  const wr = W - 7;
  const ww = wr - wl + 1;
  const wallTop = bottom - st.wallH;
  const cxm = Math.round((wl + wr) / 2);

  if (st.kind === 'mill') {
    // конусная башня
    for (let y = 0; y < st.wallH; y++) {
      const t = y / st.wallH;
      const half = Math.round(ww * (0.3 + 0.2 * t));
      const rowY = wallTop + y;
      for (let x = cxm - half; x <= cxm + half; x++) {
        const rel = (x - (cxm - half)) / (half * 2 + 1);
        p.px(x, rowY, rel < 0.12 ? sh(pal.wall[0], 1.12) : rel > 0.7 ? pal.wall[2] : y % 3 === 2 ? pal.wall[2] : pal.wall[1]);
      }
    }
    roofPoly(p, cxm - 1, cxm + 1, wallTop - 8, cxm - ww * 0.36, cxm + ww * 0.36, wallTop + 1, pal.roof, seed);
    doorAt(p, cxm, bottom, 5, pal.trim);
    const hub = { x: cxm, y: wallTop - 2 };
    const L1 = 16;
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      p.line(hub.x, hub.y, hub.x + dx * L1 * 0.7, hub.y + dy * L1 * 0.7, '#8a6238');
      for (let k = 6; k < L1; k += 2) {
        const px = hub.x + dx * k * 0.7;
        const py = hub.y + dy * k * 0.7;
        p.r(px, py - (dy < 0 ? 0 : 2) * 0, 2, 2, '#e8dcc0');
      }
    }
    p.r(hub.x - 1, hub.y - 1, 3, 3, '#4a3418');
    return { cv: p.c };
  }

  wallTex(p, st.wall, wl, wallTop, ww, st.wallH, pal.wall, seed);
  // фундамент
  p.r(wl - 1, bottom - 2, ww + 2, 3, sh(pal.wall[2], 0.8));
  for (let i = 0; i < ww; i += 4) p.px(wl + i, bottom - 2, sh(pal.wall[1], 0.9));

  if (st.decor.includes('columns')) {
    const n = def.w >= 3 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const x = wl + 2 + Math.round((i * (ww - 8)) / (n - 1));
      p.r(x, wallTop + 3, 4, st.wallH - 4, sh(pal.wall[0], 1.12));
      p.r(x + 3, wallTop + 3, 1, st.wallH - 4, pal.wall[2]);
      p.r(x - 1, wallTop + 2, 6, 2, sh(pal.wall[0], 1.2));
      p.r(x - 1, bottom - 4, 6, 2, sh(pal.wall[0], 1.2));
    }
  }

  // окна
  if (st.windows > 0 && !st.decor.includes('columns') && st.kind !== 'wall') {
    const rows = st.wallH > 24 ? 2 : 1;
    for (let r = 0; r < rows; r++) {
      const per = Math.max(1, Math.ceil(st.windows / rows));
      for (let i = 0; i < per; i++) {
        const x = wl + Math.round(((i + 1) * ww) / (per + 1)) - 2;
        if (r === rows - 1 && (st.decor.includes('door') || st.decor.includes('bigdoor')) && Math.abs(x + 2 - cxm) < 5) continue;
        windowAt(p, x, wallTop + 4 + r * 11, pal.trim);
      }
    }
  } else if (st.windows > 0 && st.decor.includes('columns')) {
    for (let i = 0; i < st.windows; i++) windowAt(p, wl + 6 + Math.round((i * (ww - 16)) / Math.max(1, st.windows - 1)) + 1, wallTop + 5, pal.trim);
  }

  if (st.decor.includes('door')) doorAt(p, cxm, bottom - 1, 6, pal.trim);
  if (st.decor.includes('bigdoor')) doorAt(p, cxm, bottom - 1, 10, pal.trim, true);
  if (st.decor.includes('open')) {
    p.r(wl + 3, wallTop + 3, ww - 6, st.wallH - 4, '#2a1a0e');
    for (let i = 0; i < 3; i++) p.r(wl + 5 + i * 8, bottom - 7, 7, 3, '#c89a64');
  }
  if (st.decor.includes('arch')) {
    p.r(cxm - 7, wallTop + 6, 14, st.wallH - 6, '#1a1612');
    p.ell(cxm, wallTop + 6, 7, 4, '#1a1612');
    p.r(cxm - 8, wallTop + 6, 1, st.wallH - 6, sh(pal.wall[0], 1.2));
    p.r(cxm + 7, wallTop + 6, 1, st.wallH - 6, sh(pal.wall[0], 1.2));
    for (let i = -6; i <= 6; i += 3) p.r(cxm + i, wallTop + 7, 1, st.wallH - 8, '#6a5a4a');
  }
  if (st.decor.includes('bars')) for (let i = 0; i < 3; i++) p.r(wl + 6 + i * Math.floor(ww / 3.2), wallTop + 5, 1, 6, '#222');
  if (st.decor.includes('sign')) {
    p.r(wl + ww - 9, wallTop + 5, 1, 4, '#3a2412');
    p.r(wl + ww - 11, wallTop + 8, 8, 5, pal.accent);
    p.r(wl + ww - 10, wallTop + 9, 6, 1, '#ffffff');
    p.r(wl + ww - 10, wallTop + 11, 4, 1, sh(pal.accent, 0.6));
  }
  if (st.decor.includes('weapons')) {
    for (let i = 0; i < 3; i++) {
      const x = wl + 3 + i * 3;
      p.r(x, bottom - 14, 1, 13, '#6a4a22');
      p.r(x - 1, bottom - 16, 3, 3, '#d8dce8');
    }
  }
  if (st.decor.includes('shield')) {
    p.r(wl + ww - 10, bottom - 11, 7, 8, pal.accent);
    p.r(wl + ww - 10, bottom - 11, 7, 1, '#e8e8f0');
    p.r(wl + ww - 7, bottom - 10, 1, 7, '#e8e8f0');
    p.r(wl + ww - 9, bottom - 8, 5, 1, '#e8e8f0');
  }
  if (st.decor.includes('barrels')) for (let i = 0; i < 2; i++) {
    const x = wl + ww - 6 - i * 6;
    p.r(x, bottom - 7, 5, 7, '#8a5a2a');
    p.r(x, bottom - 6, 5, 1, '#3a2a1a');
    p.r(x, bottom - 3, 5, 1, '#3a2a1a');
    p.r(x, bottom - 7, 5, 1, '#b88a52');
  }
  if (st.decor.includes('crates') || st.decor.includes('sacks')) {
    p.r(wl + 1, bottom - 6, 6, 6, '#a07a42');
    p.r(wl + 1, bottom - 6, 6, 1, '#d0a868');
    p.line(wl + 1, bottom - 6, wl + 6, bottom - 1, '#6a4a22');
    if (st.decor.includes('sacks')) {
      p.ell(wl + 11, bottom - 3, 3, 3, '#d8c898');
      p.px(wl + 11, bottom - 6, '#8a6a3a');
    }
  }
  if (st.decor.includes('logs') || st.decor.includes('hay')) {
    for (let i = 0; i < 3; i++) {
      p.r(wl + 1, bottom - 4 - i * 3, 12 - i, 3, st.decor.includes('hay') ? '#e0c050' : '#8a5e36');
      if (!st.decor.includes('hay')) p.r(wl + 1, bottom - 4 - i * 3, 2, 3, '#d8aa72');
    }
  }
  if (st.decor.includes('wheel')) {
    p.ell(wl + ww - 7, bottom - 9, 6, 6, '#5a3a1e');
    p.ell(wl + ww - 7, bottom - 9, 4, 4, '#3a2a1a');
    p.line(wl + ww - 13, bottom - 9, wl + ww - 1, bottom - 9, '#8a6238');
    p.line(wl + ww - 7, bottom - 15, wl + ww - 7, bottom - 3, '#8a6238');
  }
  if (st.decor.includes('anvil')) {
    p.r(wl + 3, bottom - 5, 7, 2, '#444a56');
    p.r(wl + 4, bottom - 3, 5, 3, '#2e323c');
    p.r(wl + 3, bottom - 6, 9, 1, '#8a909c');
  }
  if (st.decor.includes('pipes')) {
    p.r(wl + ww - 3, wallTop, 3, st.wallH, '#4a5560');
    p.r(wl + ww - 3, wallTop + 4, 3, 1, '#8aa0b0');
    p.r(wl + ww - 3, wallTop + 12, 3, 1, '#8aa0b0');
  }
  if (st.decor.includes('telescope')) {
    p.line(cxm + 2, wallTop - st.roofH + 2, cxm + 12, wallTop - st.roofH - 6, '#8a6238');
    p.r(cxm + 11, wallTop - st.roofH - 8, 3, 3, '#d8dce8');
  }
  if (st.decor.includes('balcony')) {
    p.r(wl + 4, wallTop + 11, ww - 8, 2, sh(pal.wall[2], 1));
    for (let i = 0; i < ww - 8; i += 3) p.r(wl + 4 + i, wallTop + 8, 1, 3, pal.trim);
  }

  // кровля
  const rt = wallTop - st.roofH;
  const ov = 4;
  switch (st.roof) {
    case 'gable':
      roofPoly(p, wl + ww * 0.24, wr - ww * 0.24, rt, wl - ov, wr + ov, wallTop + 3, pal.roof, seed);
      break;
    case 'hip':
      roofPoly(p, wl + ww * 0.34, wr - ww * 0.34, rt, wl - ov, wr + ov, wallTop + 3, pal.roof, seed);
      p.r(cxm - 1, rt - 2, 3, 2, pal.roof[3]);
      break;
    case 'thatch':
      roofPoly(p, wl + ww * 0.3, wr - ww * 0.3, rt, wl - ov - 1, wr + ov + 1, wallTop + 4, pal.roof, seed, true);
      break;
    case 'tent':
      roofPoly(p, cxm - 1, cxm + 1, rt - 2, wl - ov - 2, wr + ov + 2, wallTop + 3, pal.roof, seed);
      for (let i = wl; i < wr; i += 6) p.line(cxm, rt, i, wallTop + 2, pal.accent);
      break;
    case 'spire': {
      const tall = rt - 6;
      roofPoly(p, cxm - 1, cxm + 1, tall, cxm - ww * 0.42, cxm + ww * 0.42, wallTop + 2, pal.roof, seed);
      p.r(cxm, tall - 5, 1, 6, '#c8c8d0');
      p.r(cxm + 1, tall - 5, 4, 3, pal.accent);
      break;
    }
    case 'dome': {
      const rx = Math.round(ww * 0.46);
      const ry = st.roofH + 4;
      for (let y = 0; y < ry; y++) {
        const hw = Math.round(rx * Math.sqrt(1 - ((ry - y) / ry) ** 2));
        for (let x = -hw; x <= hw; x++) {
          const k = (x + hw) / (2 * hw + 1);
          p.px(cxm + x, wallTop - ry + y + 2, k < 0.25 ? pal.roof[3] : k > 0.7 ? pal.roof[0] : (y + x) % 5 === 0 ? pal.roof[1] : pal.roof[2]);
        }
      }
      p.r(cxm - rx - 1, wallTop + 1, rx * 2 + 3, 2, sh(pal.wall[0], 1.1));
      p.r(cxm, wallTop - ry - 4, 1, 5, '#ffd45a');
      break;
    }
    case 'flat':
      p.r(wl - 2, wallTop - 3, ww + 4, 4, sh(pal.wall[0], 1.12));
      p.r(wl - 2, wallTop, ww + 4, 1, pal.wall[2]);
      if (st.decor.includes('crenel') || st.decor.includes('tower')) for (let i = 0; i < ww + 4; i += 5) p.r(wl - 2 + i, wallTop - 7, 3, 5, sh(pal.wall[0], 1.12));
      p.r(wl - 2, wallTop - 2, ww + 4, 1, pal.wall[1]);
      break;
    default:
      break;
  }
  if (st.decor.includes('crenel') && st.roof === 'spire') for (let i = -ww / 2; i < ww / 2; i += 5) p.r(cxm + i, wallTop - 2, 3, 3, pal.wall[1]);
  if (st.decor.includes('tower')) {
    const tx = wl - 3;
    wallTex(p, 'stone', tx, wallTop - 8, 9, st.wallH + 8, pal.wall, seed + 4);
    p.r(tx - 1, wallTop - 11, 11, 3, sh(pal.wall[0], 1.15));
    for (let i = 0; i < 11; i += 4) p.r(tx - 1 + i, wallTop - 14, 3, 3, sh(pal.wall[0], 1.15));
    windowAt(p, tx + 2, wallTop - 1, pal.trim);
  }
  if (st.decor.includes('chimney')) {
    const cx2 = wl + Math.round(ww * 0.72);
    wallTex(p, 'stone', cx2, rt - 3, 5, wallTop - rt + 2, ['#9a9aa6', '#7a7a88', '#52525e'], seed + 3);
    p.r(cx2 - 1, rt - 4, 7, 2, '#52525e');
    if (st.decor.includes('smoke')) smoke = { x: cx2 + 2, y: rt - 5 };
  }
  if (st.decor.includes('stack')) {
    const sx = wl + Math.round(ww * 0.7);
    p.r(sx, 2, 6, wallTop, pal.wall[1]);
    p.r(sx, 2, 2, wallTop, sh(pal.wall[0], 1.1));
    p.r(sx + 4, 2, 2, wallTop, pal.wall[2]);
    p.r(sx - 1, 1, 8, 2, '#222');
    p.r(sx, 8, 6, 1, pal.accent);
    smoke = { x: sx + 3, y: 0 };
    if (st.decor.includes('stack2')) {
      const sx2 = wl + 4;
      p.r(sx2, 6, 5, wallTop, pal.wall[1]);
      p.r(sx2 - 1, 5, 7, 2, '#222');
    }
  }
  if (st.decor.includes('lantern')) {
    p.r(wl + 3, wallTop + 10, 1, 4, '#222');
    p.r(wl + 2, wallTop + 14, 3, 3, '#ffd870');
    p.px(wl + 3, wallTop + 15, '#fff6c0');
  }
  if (st.decor.includes('awning')) {
    for (let i = 0; i < ww; i += 3) p.r(wl + i, wallTop + 14, 3, 4, (i / 3) % 2 ? '#f4f0e6' : pal.accent);
  }
  if (st.decor.includes('banner')) {
    const bx = wl + 5;
    p.r(bx, wallTop - 2, 1, 14, '#3a2a1a');
    p.r(bx + 1, wallTop - 1, 6, 10, pal.accent);
    p.r(bx + 1, wallTop + 9, 2, 2, pal.accent);
    p.r(bx + 5, wallTop + 9, 2, 2, pal.accent);
    p.r(bx + 3, wallTop + 2, 2, 3, '#ffffff');
  }
  if (st.decor.includes('flag')) {
    p.r(cxm, rt - 12, 1, 14, '#3a2a1a');
    p.r(cxm + 1, rt - 12, 8, 5, pal.accent);
    p.r(cxm + 1, rt - 9, 8, 1, sh(pal.accent, 0.7));
  }
  if (st.decor.includes('bell')) {
    p.r(cxm - 2, rt - 6, 5, 6, pal.trim);
    p.r(cxm - 1, rt - 5, 3, 4, '#ffd45a');
    p.px(cxm, rt - 1, '#8a6a1e');
  }
  if (st.decor.includes('antlers')) {
    p.line(cxm - 4, rt + 1, cxm - 7, rt - 4, '#e8dcc0');
    p.line(cxm + 4, rt + 1, cxm + 7, rt - 4, '#e8dcc0');
  }
  if (st.decor.includes('fire')) {
    fire = { x: wl + 5, y: bottom - 6 };
    p.r(wl + 2, bottom - 4, 8, 4, '#2a1a12');
  }
  if (st.decor.includes('planks')) {
    p.r(wl - 2, bottom - 1, ww + 4, 3, '#8a6238');
    for (let i = 0; i < ww + 4; i += 4) p.r(wl - 2 + i, bottom - 1, 1, 3, '#5a3a1e');
  }
  // богатство: золотой декор у высоких ступеней
  if (rich) {
    p.r(wl - 1, wallTop + 1, ww + 2, 1, '#ffd45a');
    if (grand) p.r(wl - 1, bottom - 4, ww + 2, 1, '#ffd45a');
  }
  return { cv: p.c, smoke, fire };
}

const built = new Set<string>();

/** Создаёт спрайты построек выбранной специализации (лениво) */
export function ensureSpecSprites(b: BuildingSprites, spec: SpecId) {
  if (built.has(spec)) {
    for (const id of SPEC_BUILD_IDS[spec]) if (!b.cv[id]) built.delete(spec);
    if (!b.cv.manor) built.delete(spec);
    if (built.has(spec)) return;
  }
  SPEC_STYLE.manor = { spec, arch: 'hall', tier: 20, idx: 20 };
  {
    const r = paint('manor');
    b.cv.manor = r.cv;
    if (r.smoke) b.smoke.manor = r.smoke;
  }
  for (const id of SPEC_BUILD_IDS[spec]) {
    const r = paint(id);
    b.cv[id] = r.cv;
    if (r.smoke) b.smoke[id] = r.smoke;
    if (r.fire) b.fire[id] = r.fire;
  }
  built.add(spec);
}
