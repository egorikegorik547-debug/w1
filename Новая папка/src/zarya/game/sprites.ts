import { hash2 } from './rng';
import { TW, TH, type BuildingId } from './data';

export type Cv = HTMLCanvasElement;

export function mk(w: number, h: number): Cv {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

class P {
  c: Cv;
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.c = mk(w, h);
    this.g = this.c.getContext('2d')!;
  }
  px(x: number, y: number, col: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.g.fillStyle = col;
    this.g.fillRect(x, y, 1, 1);
  }
  r(x: number, y: number, w: number, h: number, col: string) {
    this.g.fillStyle = col;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  line(x0: number, y0: number, x1: number, y1: number, col: string) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 400; i++) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  shadow(cx: number, cy: number, rx: number, ry: number, a = 0.28) {
    this.g.fillStyle = `rgba(10,10,24,${a})`;
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const t = 1 - (y * y) / (ry * ry + 0.0001);
      if (t < 0) continue;
      const hw = Math.round(rx * Math.sqrt(t));
      this.g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, col: string) {
    this.g.fillStyle = col;
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const t = 1 - (y * y) / (ry * ry + 0.0001);
      if (t < 0) continue;
      const hw = Math.round(rx * Math.sqrt(t));
      this.g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
    }
  }
}

export function flipH(src: Cv): Cv {
  const c = mk(src.width, src.height);
  const g = c.getContext('2d')!;
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

function tone(v: number, x: number, y: number): number {
  const th = [-0.28, 0.12, 0.5];
  let t = 1;
  for (const k of th) if (v > k) t++;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(v - th[i]) < 0.07 && (x + y) & 1) {
      if (t === i + 1) t = i + 2;
      else if (t === i + 2) t = i + 1;
    }
  }
  return t;
}

/** Рисует «пушистую» форму из окружностей с освещением слева-сверху. circles: [cx, cy, r, yScale?] */
function blob(p: P, circles: number[][], pal: string[], seed: number): Int16Array {
  const { w, h } = p;
  const mask = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = -1;
      let bd = 9;
      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        const dx = x + 0.5 - c[0];
        const dy = (y + 0.5 - c[1]) / (c[3] || 1);
        const d = Math.sqrt(dx * dx + dy * dy) / c[2] + (hash2(x, y, seed) - 0.5) * 0.22;
        if (d < 1 && d < bd) {
          bd = d;
          best = i;
        }
      }
      mask[y * w + x] = best;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = mask[y * w + x];
      if (i < 0) continue;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || mask[y * w + x - 1] < 0 || mask[y * w + x + 1] < 0 || mask[(y - 1) * w + x] < 0 || mask[(y + 1) * w + x] < 0;
      if (edge) {
        p.px(x, y, pal[0]);
        continue;
      }
      const c = circles[i];
      const dx = (x + 0.5 - c[0]) / c[2];
      const dy = (y + 0.5 - c[1]) / (c[2] * (c[3] || 1));
      const v = -(dx * 0.5 + dy * 0.85) * 0.75 + (hash2(x * 3, y * 5, seed + 9) - 0.5) * 0.55 - (y / h - 0.5) * 0.35;
      p.px(x, y, pal[tone(v, x, y)]);
    }
  }
  return mask;
}

function trunk(p: P, cx: number, y0: number, y1: number, w: number, seed: number) {
  const x0 = cx - Math.floor(w / 2);
  p.r(x0 - 1, y0, 1, y1 - y0 + 1, '#241408');
  p.r(x0 + w, y0, 1, y1 - y0 + 1, '#241408');
  for (let y = y0; y <= y1; y++) {
    for (let i = 0; i < w; i++) {
      let col = '#6a4524';
      if (i === 0) col = '#8a5e36';
      else if (i === w - 1) col = '#4a2e18';
      else if (i === 1 && w > 3) col = '#7a5230';
      if (hash2(x0 + i, y, seed) < 0.12) col = '#3e2612';
      p.px(x0 + i, y, col);
    }
  }
  // корни
  p.px(x0 - 2, y1, '#241408');
  p.px(x0 + w + 1, y1, '#241408');
  p.px(x0 - 1, y1 - 1, '#4a2e18');
  p.px(x0 + w, y1 - 1, '#4a2e18');
  p.r(x0 - 1, y1 + 1 > p.h - 1 ? p.h - 1 : y1 + 1, w + 2, 1, '#241408');
}

function jitter(circles: number[][], seed: number, amt: number): number[][] {
  return circles.map((c, i) => [c[0] + (hash2(i, 1, seed) - 0.5) * 2 * amt, c[1] + (hash2(i, 2, seed) - 0.5) * 2 * amt * 0.7, c[2] + (hash2(i, 3, seed) - 0.5) * 1.2, ...c.slice(3)]);
}

const OAK_PAL = ['#16341b', '#21602c', '#2f8236', '#4aa43f', '#7ccb55'];
const AUT_PAL = [
  ['#5a2410', '#a8421a', '#d8661c', '#f09228', '#ffd058'],
  ['#4a1418', '#8a2428', '#b83a2c', '#dc5a34', '#f48a50'],
  ['#5a3c10', '#a07418', '#cc9c24', '#e8c43c', '#fbe880'],
  ['#16341b', '#4a8a2a', '#9a9a2a', '#d49a2a', '#f0c440'],
];

function oakSprite(v: number, pal = OAK_PAL, seed = 0): Cv {
  const p = new P(30, 34);
  p.shadow(15, 32, 11, 2.2);
  trunk(p, 15, 21, 31, 4, seed + v);
  const base = [
    [15, 12, 10],
    [8, 17, 7],
    [22, 17, 7],
    [15, 19, 8],
    [11, 8, 6],
    [19, 8, 6],
  ];
  blob(p, jitter(base, seed + v * 7 + 3, 1.4), pal, seed + v * 11);
  return p.c;
}

function conifer(W: number, H: number, tiers: number, maxHalf: number, trunkH: number, pal: string[], seed: number): Cv {
  const p = new P(W, H);
  const cx = Math.floor(W / 2);
  p.shadow(cx, H - 2, Math.floor(W / 2) - 2, 2);
  p.r(cx - 1, H - trunkH - 1, 2, trunkH, '#4a2e18');
  p.r(cx - 1, H - trunkH - 1, 1, trunkH, '#6a4524');
  p.r(cx - 2, H - 2, 4, 1, '#241408');
  const yb = H - trunkH - 1;
  const hf = yb - 1;
  const th = Math.ceil(hf / (1 + (tiers - 1) * 0.55));
  for (let t = 0; t < tiers; t++) {
    const top = 1 + Math.round(t * th * 0.55);
    const bot = Math.min(yb - 1, top + th - 1);
    const hm = maxHalf * (0.45 + (0.55 * (t + 1)) / tiers);
    for (let y = top; y <= bot; y++) {
      const frac = (y - top + 1) / (bot - top + 1);
      const half = Math.max(1, Math.round(hm * frac));
      for (let x = cx - half; x < cx + half; x++) {
        const u = (x + 0.5 - cx) / half;
        let col: string;
        if (x === cx - half || x === cx + half - 1) col = pal[0];
        else if (y === bot) col = (x + y) & 1 ? pal[0] : pal[1];
        else {
          const v = -u * 0.85 + (hash2(x, y, seed) - 0.5) * 0.5 + 0.25 - frac * 0.3;
          col = pal[tone(v, x, y)];
        }
        p.px(x, y, col);
      }
    }
  }
  return p.c;
}

function birchSprite(v: number): Cv {
  const p = new P(22, 32);
  p.shadow(11, 30, 7, 2);
  for (let y = 14; y <= 30; y++) {
    p.px(9, y, '#7a7a70');
    p.px(10, y, '#f0f0e8');
    p.px(11, y, '#c8c8bc');
    p.px(12, y, '#7a7a70');
    if (hash2(y, v, 5) < 0.34) p.px(hash2(y, v, 6) < 0.5 ? 10 : 11, y, '#2e2e2c');
  }
  p.r(8, 30, 6, 1, '#4a4a44');
  const base = [
    [11, 9, 7],
    [7, 12, 5],
    [15, 12, 5],
    [11, 14, 5.5],
    [9, 6, 4],
    [13, 5, 4],
  ];
  blob(p, jitter(base, v * 5 + 1, 0.9), ['#2c5e2a', '#4f9238', '#72b848', '#98d65c', '#c4ee84'], v * 13 + 40);
  return p.c;
}

function deadTree(): Cv {
  const p = new P(22, 30);
  p.shadow(11, 28, 6, 1.6);
  const c1 = '#5a4a3c';
  const c2 = '#8a7a66';
  for (let y = 10; y <= 28; y++) {
    p.px(10, y, c2);
    p.px(11, y, c1);
    p.px(9, y, '#2e241c');
    p.px(12, y, '#2e241c');
  }
  const br: number[][] = [
    [10, 16, 4, 9],
    [11, 13, 17, 6],
    [10, 21, 16, 16],
    [10, 11, 9, 4],
    [11, 10, 13, 3],
  ];
  for (const [x0, y0, x1, y1] of br) {
    p.line(x0, y0, x1, y1, c1);
    p.line(x0 - 1, y0, x1 - 1, y1, '#2e241c');
  }
  return p.c;
}

function cactusSprite(v: number): Cv {
  const p = new P(16, 26);
  p.shadow(8, 24, 5, 1.6);
  const O = '#12452a';
  const D = '#1f6b36';
  const M = '#2f8f46';
  const L = '#58bc68';
  const limb = (x: number, y: number, w: number, h: number) => {
    p.r(x - 1, y - 1, w + 2, h + 2, O);
    for (let i = 0; i < w; i++) p.r(x + i, y, 1, h, i === 0 ? L : i === w - 1 ? D : M);
  };
  limb(6, 4, 4, 20);
  if (v === 0) {
    limb(2, 12, 4, 3);
    limb(2, 8, 3, 7);
    limb(10, 9, 4, 3);
    limb(11, 5, 3, 7);
  } else {
    limb(11, 11, 3, 3);
    limb(11, 7, 3, 7);
  }
  for (let y = 5; y < 23; y += 3) p.px(8, y, D);
  p.r(7, 3, 2, 1, '#ff8ab8');
  p.px(7, 3, '#ffe060');
  return p.c;
}

function palmSprite(v: number): Cv {
  const p = new P(32, 38);
  p.shadow(15, 36, 7, 1.8);
  const pts: number[][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([14 + Math.sin(t * 2.2) * (v ? -4 : 4) * 1.0, 35 - t * 24]);
  }
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    p.r(x - 1, y, 3, 1, '#4a3018');
    p.px(x - 1, y, '#8a6038');
    p.px(x, y, i % 3 === 0 ? '#5a3e20' : '#7a5530');
  }
  const [tx, ty] = pts[pts.length - 1];
  const fronds: number[][] = [
    [-13, 6],
    [-10, -2],
    [-4, -6],
    [4, -6],
    [10, -2],
    [13, 6],
    [0, -8],
  ];
  fronds.forEach(([dx, dy], i) => {
    const ctrlx = tx + dx * 0.5;
    const ctrly = ty + Math.min(dy, 0) - 5;
    let prev: number[] | null = null;
    for (let s = 0; s <= 14; s++) {
      const t = s / 14;
      const x = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * ctrlx + t * t * (tx + dx);
      const y = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * ctrly + t * t * (ty + dy + 3);
      p.px(x, y, '#2f8a3c');
      p.px(x, y + 1, '#1c5a2a');
      if (s % 2 === 0) {
        p.px(x, y - 1, '#58b855');
        p.px(x + (dx > 0 ? 1 : -1), y + 2, '#2f8a3c');
      }
      prev = [x, y];
    }
    void prev;
    void i;
  });
  p.px(tx - 1, ty + 2, '#3a2412');
  p.px(tx + 1, ty + 2, '#3a2412');
  p.px(tx, ty + 3, '#3a2412');
  return p.c;
}

function bushSprite(berries: boolean): Cv {
  const p = new P(18, 13);
  p.shadow(9, 11, 7, 1.6);
  const mask = blob(
    p,
    [
      [9, 7, 6.5, 0.85],
      [4.5, 8, 4.2],
      [13.5, 8, 4.2],
    ],
    ['#143018', '#1f5a2a', '#2f7a35', '#48a03f', '#74c451'],
    77,
  );
  if (berries) {
    let n = 0;
    for (let k = 0; k < 80 && n < 7; k++) {
      const x = 3 + Math.floor(hash2(k, 1, 33) * 12);
      const y = 3 + Math.floor(hash2(k, 2, 33) * 7);
      if (mask[y * 18 + x] >= 0 && mask[y * 18 + x + 1] >= 0 && mask[(y + 1) * 18 + x] >= 0) {
        p.r(x, y, 2, 2, '#c81e34');
        p.px(x, y, '#ff8696');
        n++;
      }
    }
  } else {
    for (let k = 0; k < 6; k++) {
      const x = 3 + Math.floor(hash2(k, 7, 33) * 12);
      const y = 3 + Math.floor(hash2(k, 8, 33) * 7);
      if (mask[y * 18 + x] >= 0) p.px(x, y, '#8aa84a');
    }
  }
  return p.c;
}

function rockSprite(v: number, sand: boolean): Cv {
  const p = new P(18, 14);
  p.shadow(9, 12, 7, 1.7);
  const pal = sand ? ['#5a3c20', '#8a6038', '#b88650', '#d6a86c', '#efcf9a'] : ['#252830', '#454a58', '#6c7384', '#959cae', '#c0c6d4'];
  const sets = [
    [
      [9, 8, 6.5, 0.8],
      [5, 9, 4, 0.8],
      [13, 9, 4, 0.8],
    ],
    [
      [8, 7, 5.5, 0.9],
      [12, 9, 4.2, 0.8],
      [4, 9, 3.2, 0.8],
    ],
    [
      [9, 7, 7, 0.7],
      [6, 6, 4, 0.9],
    ],
  ];
  blob(p, sets[v % 3], pal, 123 + v * 7 + (sand ? 50 : 0));
  return p.c;
}

function stumpSprite(): Cv {
  const p = new P(12, 10);
  p.shadow(6, 8, 5, 1.3);
  p.r(2, 4, 8, 4, '#6a4426');
  p.r(2, 4, 2, 4, '#8a5e36');
  p.r(9, 4, 1, 4, '#3e2612');
  p.r(2, 8, 8, 1, '#241408');
  p.ellipse(6, 3, 4, 2, '#241408');
  p.ellipse(6, 3, 3, 1.4, '#d8aa72');
  p.px(6, 3, '#a47848');
  p.px(5, 3, '#a47848');
  p.px(7, 2, '#b88a58');
  return p.c;
}

export interface ObjSprites {
  [k: string]: Cv;
}

export function buildObjectSprites(): ObjSprites {
  const s: ObjSprites = {};
  for (let v = 0; v < 3; v++) s['oak' + v] = oakSprite(v, OAK_PAL, 10);
  for (let v = 0; v < 3; v++) s['birch' + v] = birchSprite(v);
  for (let v = 0; v < 4; v++) s['autumn' + v] = oakSprite(v, AUT_PAL[v], 30 + v);
  const pinePal = ['#0d2a1f', '#174a35', '#1f6a47', '#2f8a58', '#5aaa72'];
  s['pine0'] = conifer(20, 34, 4, 9, 4, pinePal, 1);
  s['pine1'] = conifer(18, 30, 4, 8, 4, pinePal, 2);
  s['pine2'] = conifer(22, 38, 5, 10, 4, pinePal, 3);
  const darkPal = ['#06181a', '#0c2e2c', '#144a40', '#1f6354', '#2f7f6a'];
  s['dark0'] = conifer(24, 44, 5, 11, 5, darkPal, 4);
  s['dark1'] = conifer(22, 40, 5, 10, 5, darkPal, 5);
  s['dead0'] = deadTree();
  s['cactus0'] = cactusSprite(0);
  s['cactus1'] = cactusSprite(1);
  s['palm0'] = palmSprite(0);
  s['palm1'] = palmSprite(1);
  s['bush'] = bushSprite(true);
  s['bushEmpty'] = bushSprite(false);
  for (let v = 0; v < 3; v++) s['rock' + v] = rockSprite(v, false);
  for (let v = 0; v < 2; v++) s['sandrock' + v] = rockSprite(v, true);
  s['stump'] = stumpSprite();
  return s;
}

/* ---------- ЛЮДИ ---------- */

export interface Look {
  skin: number;
  hair: number;
  cloth: number;
  female: boolean;
  /** 0 короткие, 1 длинные, 2 пучок */
  style?: number;
  /** 0 туника, 1 меховая жилетка, 2 платье/роба */
  outfit?: number;
  beard?: boolean;
  /** 0 нет, 1 повязка, 2 соломенная шляпа */
  acc?: number;
}

const SKIN = [
  ['#f8d8b4', '#d9a679'],
  ['#ebb98c', '#c58b5c'],
  ['#c48a5c', '#9a623c'],
  ['#946040', '#6e432b'],
];
const HAIR = ['#2a1a10', '#5a3a1c', '#a8742a', '#dcb64e', '#9a9aa0', '#b8452a'];
const CLOTH = [
  ['#9a6a3a', '#6a4020', '#c08a52'],
  ['#5a9a3a', '#3a6a2a', '#86c456'],
  ['#b04a3a', '#80342a', '#d8745a'],
  ['#4a76aa', '#385680', '#72a0d4'],
  ['#c4a454', '#8e7438', '#e4cc7c'],
];
const PANTS = ['#5a4632', '#3e4258', '#4c5a3a', '#6a5238', '#4a3a52'];

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function randomLook(rnd: () => number): Look {
  const female = rnd() < 0.5;
  const r = rnd();
  return {
    skin: Math.floor(rnd() * SKIN.length),
    hair: Math.floor(rnd() * HAIR.length),
    cloth: Math.floor(rnd() * CLOTH.length),
    female,
    style: female ? (rnd() < 0.55 ? 1 : 2) : rnd() < 0.8 ? 0 : 1,
    outfit: female ? (rnd() < 0.7 ? 2 : 0) : r < 0.6 ? 0 : 1,
    beard: !female && rnd() < 0.35,
    acc: rnd() < 0.18 ? 1 : rnd() < 0.12 ? 2 : 0,
  };
}

const personCache = new Map<string, Cv>();

/** dir: 0 вниз, 1 вверх, 2 вправо, 3 влево. frame: 0 стоит, 1/2 шаг, 3/4 работа. tool: 0 топор, 1 кирка, 2 молот, 3 сбор */
export function personSprite(look: Look, dir: number, frame: number, tool: number, kid: boolean): Cv {
  const key = `${look.skin}${look.hair}${look.cloth}${look.female ? 1 : 0}${look.style ?? 9}${look.outfit ?? 9}${look.beard ? 1 : 0}${look.acc ?? 0}|${dir}|${frame}|${tool}|${kid ? 1 : 0}`;
  const hit = personCache.get(key);
  if (hit) return hit;
  let cv: Cv;
  if (dir === 3) cv = flipH(personSprite(look, 2, frame, tool, kid));
  else cv = drawPerson(look, dir, frame, tool, kid);
  personCache.set(key, cv);
  return cv;
}

function outlined(src: Cv, col: string): Cv {
  const w = src.width;
  const h = src.height;
  const out = mk(w, h);
  const g = out.getContext('2d')!;
  const d = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  g.fillStyle = col;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (a(x, y) > 0) continue;
      if (a(x - 1, y) > 128 || a(x + 1, y) > 128 || a(x, y - 1) > 128 || a(x, y + 1) > 128) g.fillRect(x, y, 1, 1);
    }
  g.drawImage(src, 0, 0);
  return out;
}

function drawPerson(look: Look, dir: number, frame: number, tool: number, kid: boolean): Cv {
  const p = new P(16, 20);
  const sk = SKIN[look.skin];
  const hr = HAIR[look.hair];
  const hrL = shade(hr, 1.4);
  const hrD = shade(hr, 0.7);
  const cl = CLOTH[look.cloth];
  const pants = PANTS[(look.cloth + look.hair) % PANTS.length];
  const pantsD = shade(pants, 0.78);
  const female = look.female;
  const style = look.style ?? (female ? 1 : 0);
  const outfit = kid ? 0 : look.outfit ?? 0;
  const beard = !!look.beard && !female && !kid;
  const acc = look.acc ?? 0;
  const legH = kid ? 2 : 4;
  const torsoH = kid ? 3 : 5;
  const yBoot = 19;
  const yLegTop = yBoot - legH + 1;
  const yTorsoBot = yLegTop - 1;
  const yTorsoTop = yTorsoBot - torsoH + 1;
  const yHeadBot = yTorsoTop - 1;
  const yHeadTop = yHeadBot - 4;
  const boot = '#3a2616';
  const bootL = '#6a4a2c';
  // основной цвет верха и рукавов
  const top = outfit === 1 ? '#9a6a3e' : cl[0];
  const topD = outfit === 1 ? '#6e4624' : cl[1];
  const topL = outfit === 1 ? '#c08e58' : cl[2];
  const sleeve = outfit === 1 ? '#efe4c8' : cl[1];
  const skirt = outfit === 2 && legH > 2;

  const hat = () => {
    if (acc === 1) p.r(dir === 2 ? 6 : 5, yHeadTop + 2, dir === 2 ? 5 : 6, 1, '#d83a3e');
    if (acc === 2) {
      p.r(5, yHeadTop - 1, 6, 3, '#e4cc7c');
      p.r(5, yHeadTop - 1, 6, 1, '#f6e6a0');
      p.r(3, yHeadTop + 1, 10, 1, '#b89a50');
      p.r(5, yHeadTop + 1, 6, 1, '#a8883c');
    }
  };

  if (dir !== 2) {
    // ноги
    const lLift = frame === 1 ? 1 : 0;
    const rLift = frame === 2 ? 1 : 0;
    p.r(6, yLegTop, 2, legH - 1 - lLift, pants);
    p.r(8, yLegTop, 2, legH - 1 - rLift, pantsD);
    p.r(6, yBoot - lLift, 2, 1, boot);
    p.r(8, yBoot - rLift, 2, 1, boot);
    p.px(6, yBoot - lLift, bootL);
    p.px(8, yBoot - rLift, bootL);
    // руки
    const la = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const ra = -la;
    p.r(4, yTorsoTop + 1 + la, 1, torsoH - 2, sleeve);
    p.r(11, yTorsoTop + 1 + ra, 1, torsoH - 2, shade(sleeve, 0.85));
    p.px(4, yTorsoTop + torsoH - 1 + la, sk[0]);
    p.px(11, yTorsoTop + torsoH - 1 + ra, sk[1]);
    // торс
    p.r(5, yTorsoTop, 6, torsoH, top);
    p.r(5, yTorsoTop, 6, 1, topL);
    p.r(10, yTorsoTop + 1, 1, torsoH - 1, topD);
    if (outfit === 1) {
      p.r(7, yTorsoTop, 2, torsoH - 1, '#efe4c8');
      p.px(5, yTorsoTop + 1, '#d8b888');
      p.px(10, yTorsoTop + 2, '#6e4624');
    }
    // пояс
    if (!skirt) {
      p.r(5, yTorsoBot, 6, 1, '#4a3220');
      if (dir === 0) p.px(8, yTorsoBot, '#e8c860');
    }
    if (skirt) {
      p.r(5, yLegTop, 6, 2, top);
      p.r(5, yLegTop, 6, 1, '#4a3220');
      p.r(4, yLegTop + 1, 8, 1, topD);
      p.px(5, yLegTop + 1, topL);
      p.px(7, yLegTop + 1, topL);
      p.px(9, yLegTop + 1, topL);
      if (dir === 0) p.px(8, yLegTop, '#e8c860');
    }
    // ворот
    if (dir === 0 && outfit !== 1) p.r(7, yTorsoTop, 2, 1, sk[1]);
    // голова
    p.r(5, yHeadTop, 6, 5, sk[0]);
    p.r(10, yHeadTop + 1, 1, 4, sk[1]);
    if (style !== 1 || dir === 0) {
      p.px(4, yHeadTop + 3, sk[1]);
      p.px(11, yHeadTop + 3, sk[1]);
    }
    if (dir === 0) {
      // волосы
      p.r(5, yHeadTop, 6, 2, hr);
      p.r(6, yHeadTop, 2, 1, hrL);
      p.px(5, yHeadTop + 2, hr);
      p.px(10, yHeadTop + 2, hrD);
      p.px(8, yHeadTop + 2, hr);
      if (style === 1) {
        p.r(4, yHeadTop + 1, 1, 6, hr);
        p.r(11, yHeadTop + 1, 1, 6, hrD);
        p.px(4, yHeadTop + 7, hrD);
      } else if (style === 2) {
        p.r(7, yHeadTop - 1, 2, 1, hr);
        p.px(7, yHeadTop - 1, hrL);
      } else if (!kid) {
        p.px(4, yHeadTop + 1, hr);
        p.px(11, yHeadTop + 1, hrD);
      }
      // лицо
      p.px(6, yHeadTop + 3, '#1a1a22');
      p.px(9, yHeadTop + 3, '#1a1a22');
      if (female || kid) {
        p.px(5, yHeadTop + 4, '#ee9a8a');
        p.px(10, yHeadTop + 4, '#ee9a8a');
        p.px(8, yHeadBot, '#b05a52');
      } else p.px(8, yHeadTop + 4, sk[1]);
      if (beard) {
        p.r(5, yHeadTop + 4, 6, 1, hr);
        p.r(6, yHeadBot, 4, 1, hrD);
        p.px(8, yHeadTop + 4, '#b05a52');
      }
    } else {
      // вид сзади
      p.r(5, yHeadTop, 6, 4, hr);
      p.r(5, yHeadTop + 4, 6, 1, hrD);
      p.r(6, yHeadTop, 3, 1, hrL);
      if (style === 1) {
        p.r(4, yHeadTop + 1, 1, 7, hr);
        p.r(11, yHeadTop + 1, 1, 7, hrD);
        p.r(5, yHeadBot, 6, 2, hr);
        p.r(5, yHeadBot + 2, 6, 1, hrD);
      } else if (style === 2) {
        p.r(7, yHeadTop - 1, 2, 1, hr);
        p.px(7, yHeadTop - 1, hrL);
      }
    }
    hat();
  } else {
    // сбоку (вправо)
    const f1 = frame === 1;
    const f2 = frame === 2;
    const backLift = f2 ? 1 : 0;
    const frontLift = f1 ? 1 : 0;
    if (frame === 0 || frame >= 3) {
      p.r(7, yLegTop, 2, legH - 1, pants);
      p.r(7, yBoot, 3, 1, boot);
      p.px(9, yBoot, bootL);
    } else {
      p.r(6, yLegTop, 2, legH - 1 - backLift, pantsD);
      p.r(6, yBoot - backLift, 2, 1, boot);
      p.r(9, yLegTop, 2, legH - 1 - frontLift, pants);
      p.r(9, yBoot - frontLift, 3, 1, boot);
      p.px(11, yBoot - frontLift, bootL);
    }
    // торс
    p.r(6, yTorsoTop, 4, torsoH, top);
    p.r(6, yTorsoTop, 4, 1, topL);
    p.r(6, yTorsoTop + 1, 1, torsoH - 1, topD);
    if (outfit === 1) p.r(9, yTorsoTop + 1, 1, torsoH - 2, '#efe4c8');
    if (!skirt) {
      p.r(6, yTorsoBot, 4, 1, '#4a3220');
      p.px(9, yTorsoBot, '#e8c860');
    } else {
      p.r(5, yLegTop, 6, 2, top);
      p.r(5, yLegTop, 6, 1, '#4a3220');
      p.r(5, yLegTop + 1, 6, 1, topD);
      p.px(8, yLegTop + 1, topL);
    }
    // голова
    p.r(6, yHeadTop, 5, 5, sk[0]);
    p.r(6, yHeadTop, 5, 2, hr);
    p.r(6, yHeadTop + 2, 2, 3, hr);
    p.r(7, yHeadTop, 2, 1, hrL);
    p.px(9, yHeadTop + 3, '#1a1a22');
    p.px(11, yHeadTop + 3, sk[0]);
    p.px(10, yHeadBot, sk[1]);
    if (female || kid) p.px(10, yHeadTop + 4, '#ee9a8a');
    if (style === 1) {
      p.r(5, yHeadTop + 1, 2, 7, hr);
      p.r(5, yHeadTop + 4, 1, 4, hrD);
    } else if (style === 2) {
      p.r(5, yHeadTop - 1, 2, 2, hr);
      p.px(5, yHeadTop, hrD);
    }
    if (beard) {
      p.r(8, yHeadTop + 4, 3, 1, hr);
      p.px(10, yHeadBot, hrD);
    }
    hat();
    // рука + инструмент
    const ax = 8;
    const ay = yTorsoTop + 1;
    if (frame <= 2) {
      const sw = f1 ? 1 : f2 ? -1 : 0;
      p.r(ax + sw, ay, 2, torsoH - 2, sleeve);
      p.px(ax + sw + 1, ay + torsoH - 2, sk[0]);
    } else if (tool === 3) {
      const low = frame === 4 ? 2 : 0;
      p.r(ax + 1, ay + low, 3, 2, sleeve);
      p.px(ax + 4, ay + low + 1, sk[0]);
      if (frame === 4) p.px(ax + 4, ay + low + 2, '#c81e34');
    } else {
      const handle = '#7a5230';
      const headC = tool === 2 ? '#6a6a76' : '#a8aebc';
      if (frame === 3) {
        p.line(ax + 1, ay, ax + 2, ay - 2, sleeve);
        p.px(ax + 2, ay - 3, sk[0]);
        p.line(ax + 2, ay - 3, ax + 4, ay - 6, handle);
        if (tool === 0) {
          p.r(ax + 4, ay - 8, 2, 3, headC);
          p.px(ax + 6, ay - 7, '#d8dce8');
        } else if (tool === 1) {
          p.r(ax + 3, ay - 7, 4, 1, headC);
          p.px(ax + 7, ay - 6, headC);
        } else p.r(ax + 3, ay - 8, 3, 2, headC);
      } else {
        p.r(ax + 1, ay + 1, 3, 2, sleeve);
        p.px(ax + 4, ay + 2, sk[0]);
        p.line(ax + 4, ay + 2, ax + 6, ay + 5, handle);
        if (tool === 0) {
          p.r(ax + 6, ay + 4, 2, 3, headC);
          p.px(ax + 7, ay + 6, '#d8dce8');
        } else if (tool === 1) {
          p.r(ax + 5, ay + 5, 3, 1, headC);
          p.px(ax + 7, ay + 6, headC);
        } else p.r(ax + 5, ay + 4, 3, 3, headC);
      }
    }
  }
  const out = outlined(p.c, '#24150c');
  const g = out.getContext('2d')!;
  g.globalCompositeOperation = 'destination-over';
  const sp = new P(16, 20);
  sp.shadow(8, 19, 5, 1.3, 0.3);
  g.drawImage(sp.c, 0, 0);
  return out;
}

/* ---------- ЗДАНИЯ ---------- */

const WOOD_PAL = ['#c89a64', '#a8794a', '#7a5430'];

function planks(p: P, x: number, y: number, w: number, h: number, pal: string[], seed: number) {
  for (let r = 0; r < h; r++) {
    const m = r % 3;
    for (let i = 0; i < w; i++) {
      let col = pal[1];
      if (m === 2) col = pal[2];
      else if (m === 0) col = pal[0];
      else if (hash2(i + Math.floor(r / 3) * 7, Math.floor(r / 3), seed) < 0.07) col = pal[2];
      p.px(x + i, y + r, col);
    }
  }
}

function stones(p: P, x: number, y: number, w: number, h: number, pal: string[], seed: number) {
  const bandH = 4;
  for (let b = 0; b * bandH < h; b++) {
    let cx = -((b % 2) * 3) - Math.floor(hash2(b, 1, seed) * 3);
    while (cx < w) {
      const bw = 5 + Math.floor(hash2(b, cx + 50, seed) * 4);
      const shade = hash2(b, cx + 99, seed);
      for (let yy = 0; yy < bandH; yy++) {
        const py = b * bandH + yy;
        if (py >= h) break;
        for (let xx = 0; xx < bw; xx++) {
          const px = cx + xx;
          if (px < 0 || px >= w) continue;
          let col = shade < 0.33 ? pal[0] : pal[1];
          if (xx === 0 || yy === bandH - 1) col = pal[2];
          else if (yy === 0) col = pal[0];
          p.px(x + px, y + py, col);
        }
      }
      cx += bw;
    }
  }
}

function roofShape(p: P, xtl: number, xtr: number, yt: number, xbl: number, xbr: number, yb: number, pal: string[], seed: number) {
  for (let y = yt; y <= yb; y++) {
    const t = (y - yt) / Math.max(1, yb - yt);
    const xl = Math.round(xtl + (xbl - xtl) * t);
    const xr = Math.round(xtr + (xbr - xtr) * t);
    const row = y - yt;
    const band = row % 4;
    for (let x = xl; x <= xr; x++) {
      let col = pal[2];
      if (band === 3) col = pal[1];
      else if (((x + Math.floor(row / 4) * 2) % 5 === 0 || hash2(x, y, seed) < 0.05) && band < 3) col = pal[1];
      if (x < xl + (xr - xl) * 0.32 && (x + y) % 2 === 0 && band < 3) col = pal[3];
      if (y === yt) col = pal[3];
      if (x === xl || x === xr || y === yb) col = pal[0];
      p.px(x, y, col);
    }
  }
}

interface HouseOpts {
  tiles: number;
  wallH: number;
  roofH: number;
  wall: 'plank' | 'stone';
  wallPal: string[];
  roofPal: string[];
  windows: number;
  chimney?: boolean;
  chimney2?: boolean;
  open?: boolean;
  banner?: boolean;
  antlers?: boolean;
  beams?: boolean;
  doorW?: number;
  seed: number;
}

interface Sprite {
  cv: Cv;
  smoke?: { x: number; y: number };
  fire?: { x: number; y: number };
}

function house(o: HouseOpts): Sprite {
  const W = o.tiles * TW + 8;
  const H = o.wallH + o.roofH + 8;
  const p = new P(W, H);
  const bottom = H - 1;
  p.shadow(W / 2, bottom - 1, W / 2 - 1, 3, 0.3);
  const wl = 4;
  const wr = W - 5;
  const ww = wr - wl + 1;
  const wallTop = bottom - o.wallH;
  const roofTop = 6;
  const roofBot = wallTop + 2;
  let smoke: { x: number; y: number } | undefined;
  if (o.chimney) {
    const cxm = Math.round(W * 0.7);
    stones(p, cxm, 2, 5, roofBot - 2, ['#9a9aa6', '#7a7a88', '#52525e'], o.seed + 3);
    p.r(cxm - 1, 1, 7, 2, '#52525e');
    p.r(cxm - 1, 1, 7, 1, '#7a7a88');
    smoke = { x: cxm + 2, y: 0 };
  }
  if (o.chimney2) {
    const cxm = Math.round(W * 0.26);
    stones(p, cxm, 3, 5, roofBot - 3, ['#b0a49a', '#8a7a70', '#5a4a44'], o.seed + 5);
    p.r(cxm - 1, 2, 7, 2, '#5a4a44');
    p.r(cxm - 1, 2, 7, 1, '#8a7a70');
  }
  // стена
  if (o.open) {
    p.r(wl, wallTop, ww, o.wallH + 1, '#20150e');
    // ящики и бочки
    const crate = (x: number, y: number, s: number) => {
      p.r(x, y, s, s, '#a8794a');
      p.r(x, y, s, 1, '#c89a64');
      p.r(x, y + s - 1, s, 1, '#5a3a22');
      p.r(x, y, 1, s, '#5a3a22');
      p.r(x + s - 1, y, 1, s, '#5a3a22');
      p.line(x, y, x + s - 1, y + s - 1, '#7a5430');
    };
    const barrel = (x: number, y: number) => {
      p.r(x, y, 5, 6, '#8a5a30');
      p.r(x, y + 1, 5, 1, '#4a4a54');
      p.r(x, y + 4, 5, 1, '#4a4a54');
      p.r(x, y, 1, 6, '#b07a46');
      p.r(x + 4, y, 1, 6, '#5a3a22');
    };
    crate(wl + 3, bottom - 7, 7);
    crate(wl + 5, bottom - 13, 6);
    barrel(wl + 12, bottom - 7);
    crate(wr - 12, bottom - 8, 8);
    p.r(wr - 6, bottom - 5, 5, 4, '#d8c890');
    p.r(wr - 6, bottom - 5, 5, 1, '#efe4b8');
    p.px(wr - 5, bottom - 6, '#d8c890');
    // столбы
    p.r(wl, wallTop, 2, o.wallH + 1, '#5a3a22');
    p.r(wr - 1, wallTop, 2, o.wallH + 1, '#5a3a22');
    p.r(wl, wallTop, 1, o.wallH + 1, '#8a5e36');
    p.r(Math.round(W / 2) - 1, wallTop, 2, o.wallH + 1, '#5a3a22');
  } else if (o.wall === 'plank') {
    planks(p, wl, wallTop, ww, o.wallH, o.wallPal, o.seed);
    p.r(wr - 1, wallTop, 2, o.wallH, 'rgba(0,0,0,0.22)');
    p.r(wl, wallTop, 1, o.wallH, o.wallPal[2]);
  } else {
    stones(p, wl, wallTop, ww, o.wallH, o.wallPal, o.seed);
    p.r(wr - 1, wallTop, 2, o.wallH, 'rgba(0,0,0,0.2)');
  }
  if (o.beams) {
    const n = o.tiles * 2 + 1;
    for (let i = 0; i < n; i++) {
      const bx = wl + Math.round(((ww - 2) * i) / (n - 1));
      p.r(bx, wallTop, 2, o.wallH, '#4a2e18');
      p.r(bx, wallTop, 1, o.wallH, '#6a4524');
    }
    p.r(wl, wallTop + Math.floor(o.wallH * 0.45), ww, 2, '#4a2e18');
  }
  // фундамент
  if (!o.open) {
    p.r(wl, bottom - 1, ww, 2, '#6a6a76');
    for (let x = wl; x <= wr; x += 3) p.px(x, bottom - 1, '#8a8a96');
    p.r(wl, bottom, ww, 1, '#45454f');
  }
  // тень от крыши
  p.r(wl, roofBot, ww, 3, 'rgba(0,0,0,0.28)');

  if (!o.open) {
    // дверь
    const dw = o.doorW ?? 6;
    const dh = Math.min(o.wallH - 6, o.tiles > 2 ? 14 : 11);
    const dx = Math.round(W / 2 - dw / 2);
    const dy = bottom - 2 - dh + 1;
    p.r(dx - 1, dy - 1, dw + 2, dh + 1, '#2a180a');
    p.r(dx, dy, dw, dh, '#5a3a22');
    for (let i = 1; i < dw; i += 2) p.r(dx + i, dy, 1, dh, '#47301c');
    p.px(dx, dy, '#2a180a');
    p.px(dx + dw - 1, dy, '#2a180a');
    p.px(dx + dw - 2, dy + Math.floor(dh / 2), '#e8c860');
    // окна
    const winPositions: number[] = [];
    if (o.windows === 1) winPositions.push(wl + Math.round((dx - wl) / 2) - 2);
    if (o.windows === 2) {
      winPositions.push(wl + Math.round((dx - wl) / 2) - 2);
      winPositions.push(dx + dw + Math.round((wr - dx - dw) / 2) - 2);
    }
    if (o.windows >= 4) {
      const q = (dx - wl) / 2;
      winPositions.push(Math.round(wl + q / 2) - 2, Math.round(wl + q * 1.5) - 2);
      winPositions.push(Math.round(dx + dw + q / 2) - 2, Math.round(dx + dw + q * 1.5) - 2);
    }
    for (const wx of winPositions) {
      const wy = wallTop + 5;
      p.r(wx - 1, wy - 1, 6, 6, '#3a2616');
      p.r(wx, wy, 4, 4, '#f6d36a');
      p.r(wx, wy + 2, 4, 2, '#e8a83a');
      p.r(wx + 1, wy, 1, 4, '#3a2616');
      p.r(wx, wy + 1, 4, 1, '#3a2616');
      p.r(wx - 1, wy + 5, 6, 1, '#7a5430');
    }
    if (o.antlers) {
      const ax = Math.round(W / 2);
      const ay = wallTop + 3;
      p.px(ax, ay + 1, '#efe4c8');
      p.px(ax - 1, ay, '#efe4c8');
      p.px(ax + 1, ay, '#efe4c8');
      p.line(ax - 1, ay, ax - 4, ay - 1, '#efe4c8');
      p.line(ax + 1, ay, ax + 4, ay - 1, '#efe4c8');
      p.px(ax - 3, ay - 2, '#efe4c8');
      p.px(ax + 3, ay - 2, '#efe4c8');
      // шкура на стене
      p.r(wl + 3, wallTop + 6, 5, 7, '#c8a070');
      p.r(wl + 3, wallTop + 6, 5, 1, '#e0bc8a');
      p.px(wl + 4, wallTop + 9, '#8a6038');
      p.px(wl + 6, wallTop + 11, '#8a6038');
    }
  }
  // крыша (с свесами)
  roofShape(p, Math.round(W * 0.3), Math.round(W * 0.7), roofTop, 1, W - 2, roofBot, o.roofPal, o.seed + 9);
  if (o.banner) {
    for (const bx of [wl + 1, wr - 3]) {
      p.r(bx, roofTop - 4, 1, roofBot - roofTop + 10, '#4a2e18');
      p.r(bx + 1, roofTop - 3, 5, 9, '#b8283a');
      p.r(bx + 1, roofTop - 3, 5, 1, '#e0485a');
      p.px(bx + 3, roofTop + 6, '#12121a');
      p.px(bx + 2, roofTop + 5, '#b8283a');
      p.px(bx + 4, roofTop + 5, '#b8283a');
      p.r(bx + 2, roofTop - 1, 3, 3, '#f0c830');
    }
  }
  return { cv: p.c, smoke };
}

function drawTent(p: P, ox: number, oy: number, W: number, H: number, seed: number) {
  const hide = ['#4a3220', '#7a5638', '#a47a50', '#c8a070'];
  const cx = ox + Math.floor(W / 2);
  const apex = oy + 4;
  const base = oy + H - 2;
  // жерди
  p.line(cx - 1, apex - 4, cx + 1, apex + 2, '#5a3a22');
  p.line(cx + 1, apex - 4, cx - 1, apex + 2, '#7a5230');
  for (let y = apex; y <= base; y++) {
    const t = (y - apex) / (base - apex);
    const half = Math.max(1, Math.round(1 + t * (W / 2 - 2)));
    for (let x = cx - half; x <= cx + half; x++) {
      const u = (x - cx) / half;
      let col = hide[1];
      if (u < -0.35) col = hide[2];
      if (u < -0.75) col = hide[3];
      if (u > 0.35) col = hide[0];
      if (u > 0.6 && (x + y) % 2) col = hide[1];
      if (Math.abs(x - cx) === Math.floor(half * 0.5) && y > apex + 2) col = hide[0];
      if (hash2(x, y, seed) < 0.06) col = hide[0];
      if (x === cx - half || x === cx + half || y === base) col = '#2a1a0e';
      p.px(x, y, col);
    }
  }
  // узор
  const by = apex + Math.round((base - apex) * 0.55);
  for (let x = cx - 6; x <= cx + 6; x++) {
    const t = (by - apex) / (base - apex);
    const half = Math.max(1, Math.round(1 + t * (W / 2 - 2)));
    if (Math.abs(x - cx) < half - 1) p.px(x, by + ((x + 100) % 2), '#b8452a');
  }
  // вход
  const dh = Math.round((base - apex) * 0.5);
  for (let i = 0; i < dh; i++) {
    const y = base - 1 - i;
    const half = Math.max(0, Math.round(2.4 * (1 - i / dh)));
    for (let x = cx - half; x <= cx + half; x++) p.px(x, y, i < 2 ? '#3a2616' : '#1a100a');
  }
}

function tentSprite(): Sprite {
  const p = new P(24, 28);
  p.shadow(12, 26, 10, 2.4);
  drawTent(p, 2, 0, 20, 27, 5);
  return { cv: p.c };
}

function campSprite(): Sprite {
  const W = 2 * TW + 18;
  const H = 2 * TH + 22;
  const p = new P(W, H);
  const cx = Math.floor(W / 2);
  const fy = H - 12;
  // вытоптанная земля
  p.g.fillStyle = 'rgba(70,52,30,0.55)';
  p.ellipse(cx, fy + 2, 19, 9, 'rgba(84,62,36,0.7)');
  p.ellipse(cx, fy + 2, 14, 6.5, 'rgba(100,76,44,0.7)');
  for (let i = 0; i < 40; i++) {
    const x = cx - 18 + Math.floor(hash2(i, 1, 8) * 36);
    const y = fy - 5 + Math.floor(hash2(i, 2, 8) * 14);
    p.px(x, y, hash2(i, 3, 8) < 0.5 ? '#5a4228' : '#8a6a40');
  }
  // шатры
  drawTent(p, 0, 2, 20, 27, 11);
  drawTent(p, W - 22, 0, 20, 25, 22);
  // кострище
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const x = cx + Math.cos(a) * 7;
    const y = fy + 2 + Math.sin(a) * 3.4;
    p.r(x - 1, y - 1, 3, 2, '#7a7f8e');
    p.r(x - 1, y - 1, 3, 1, '#b4b9c8');
    p.px(x + 1, y, '#454a58');
  }
  p.ellipse(cx, fy + 2, 5, 2, '#1c1410');
  // брёвна-сиденья
  const log = (x: number, y: number, w: number) => {
    p.r(x, y, w, 4, '#6a4524');
    p.r(x, y, w, 1, '#8a5e36');
    p.r(x, y + 3, w, 1, '#3e2612');
    p.r(x + w, y + 1, 1, 2, '#d8aa72');
  };
  log(cx - 20, fy + 8, 9);
  log(cx + 11, fy + 8, 9);
  log(cx - 6, fy + 10, 11);
  // перекрещенные поленья
  p.line(cx - 4, fy + 3, cx + 4, fy, '#5a3a22');
  p.line(cx - 4, fy, cx + 4, fy + 3, '#7a5230');
  return { cv: p.c, fire: { x: cx, y: fy + 2 } };
}

function campfireSprite(): Sprite {
  const p = new P(18, 14);
  p.shadow(9, 10, 8, 3, 0.25);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = 9 + Math.cos(a) * 6;
    const y = 8 + Math.sin(a) * 2.6;
    p.r(x - 1, y - 1, 3, 2, '#7a7f8e');
    p.r(x - 1, y - 1, 3, 1, '#b4b9c8');
  }
  p.ellipse(9, 8, 4, 1.6, '#1c1410');
  p.line(5, 9, 13, 6, '#5a3a22');
  p.line(5, 6, 13, 9, '#7a5230');
  return { cv: p.c, fire: { x: 9, y: 9 } };
}

function shelterSprite(): Sprite {
  return tentSprite();
}

function farmSprite(): Sprite {
  const W = 3 * TW + 4;
  const H = 2 * TH + 8;
  const p = new P(W, H);
  const fx0 = 2;
  const fx1 = W - 3;
  const fy1 = H - 2;
  const fy0 = fy1 - 2 * TH + 2;
  for (let y = fy0; y <= fy1; y++) {
    const row = y - fy0;
    const m = row % 6;
    for (let x = fx0; x <= fx1; x++) {
      let col = '#7a4e2a';
      if (m < 2) col = '#8e5e32';
      else if (m === 2) col = '#5a3a1e';
      else if (hash2(x, y, 4) < 0.15) col = '#6a4424';
      p.px(x, y, col);
    }
  }
  for (let k = 0; k < 4; k++) {
    const yb = fy0 + 5 + k * 6;
    const gold = k % 2 === 0;
    for (let x = fx0 + 3; x < fx1 - 1; x += 3) {
      const h = 3 + Math.floor(hash2(x, k, 9) * 2);
      p.r(x, yb - h, 1, h, gold ? '#8cae3a' : '#4fa83e');
      p.px(x, yb - h, gold ? '#f0d050' : '#7ad050');
      p.px(x + 1, yb - h + 1, gold ? '#d8b840' : '#6ac04a');
      if (gold) p.px(x - 1, yb - h + 1, '#e8c848');
    }
  }
  // забор
  const post = (x: number, y: number) => {
    p.r(x, y - 3, 2, 5, '#6a4524');
    p.px(x, y - 3, '#a8794a');
  };
  p.r(fx0, fy0 - 1, fx1 - fx0, 1, '#8a6238');
  p.r(fx0, fy1, fx1 - fx0, 1, '#8a6238');
  p.r(fx0, fy1 - 1, fx1 - fx0, 1, '#5a3a22');
  for (let x = fx0; x <= fx1; x += 12) {
    post(x, fy0 + 1);
    post(x, fy1 + 1);
  }
  post(fx1 - 1, fy0 + 1);
  post(fx1 - 1, fy1 + 1);
  p.r(fx0, fy0 + 1, 1, fy1 - fy0, '#8a6238');
  p.r(fx1, fy0 + 1, 1, fy1 - fy0, '#6a4524');
  return { cv: p.c };
}

function shrineSprite(): Sprite {
  const W = 2 * TW + 10;
  const H = 2 * TH + 30;
  const p = new P(W, H);
  const cx = Math.floor(W / 2);
  const cy = H - 10;
  p.shadow(cx, cy + 3, 18, 6, 0.3);
  p.ellipse(cx, cy, 18, 8, '#4a4a58');
  p.ellipse(cx, cy - 1, 17, 7, '#8a8a98');
  p.ellipse(cx, cy - 1, 12, 5, '#a8a8b6');
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    p.px(cx + Math.cos(a) * 14.5, cy - 1 + Math.sin(a) * 6, i % 2 ? '#5ac8e8' : '#3a8ab0');
  }
  const stone = (x: number, y: number, h: number) => {
    p.r(x - 1, y - 1, 6, h + 2, '#32323e');
    p.r(x, y, 4, h, '#7a7a88');
    p.r(x, y, 1, h, '#a8a8b6');
    p.r(x + 3, y, 1, h, '#55556a');
    p.px(x + 1, y + 2, '#5ac8e8');
    p.px(x + 2, y + 4, '#5ac8e8');
    p.px(x + 1, y + 6, '#5ac8e8');
  };
  stone(5, cy - 12, 12);
  stone(W - 10, cy - 12, 12);
  stone(cx - 2, cy - 14, 12);
  // тотем
  const tx = cx - 3;
  const cols = ['#b8452a', '#2a9a8a', '#e0b030', '#6a3a8a'];
  for (let i = 0; i < 4; i++) {
    const by = cy - 28 + i * 7;
    p.r(tx - 1, by - 1, 8, 8, '#1a1018');
    p.r(tx, by, 6, 7, cols[i]);
    p.r(tx, by, 6, 1, 'rgba(255,255,255,0.3)');
    p.r(tx + 5, by, 1, 7, 'rgba(0,0,0,0.3)');
    p.px(tx + 1, by + 2, '#fff');
    p.px(tx + 4, by + 2, '#fff');
    p.px(tx + 1, by + 2, '#12121a');
    p.px(tx + 4, by + 2, '#12121a');
    p.r(tx + 2, by + 4, 2, 1, '#12121a');
  }
  p.line(tx - 1, cy - 20, tx - 5, cy - 24, '#e0b030');
  p.line(tx + 6, cy - 20, tx + 10, cy - 24, '#e0b030');
  // кристалл
  const kx = cx;
  const ky = cy - 38;
  p.g.fillStyle = 'rgba(122,224,255,0.28)';
  p.ellipse(kx, ky + 3, 7, 7, 'rgba(122,224,255,0.22)');
  p.ellipse(kx, ky + 3, 4, 4, 'rgba(122,224,255,0.3)');
  const cr = ['#2a6aa0', '#5ac8e8', '#bff4ff'];
  for (let y = -4; y <= 4; y++) {
    const hw = 3 - Math.floor(Math.abs(y) * 0.7);
    for (let x = -hw; x <= hw; x++) p.px(kx + x, ky + 3 + y, x < 0 ? cr[2] : x === hw ? cr[0] : cr[1]);
  }
  p.px(kx - 1, ky, '#fff');
  return { cv: p.c, fire: undefined };
}

export interface BuildingSprites {
  cv: Record<BuildingId, Cv>;
  smoke: Partial<Record<BuildingId, { x: number; y: number }>>;
  fire: Partial<Record<BuildingId, { x: number; y: number }>>;
}

function cemeterySprite(): Sprite {
  const W = 3 * TW + 8;
  const H = 2 * TH + 12;
  const p = new P(W, H);
  const bottom = H - 1;
  p.r(3, bottom - 22, W - 6, 22, 'rgba(60,80,50,0.35)');
  // ограда
  const wood = '#6a4a2a';
  const woodL = '#9a7446';
  for (let x = 3; x < W - 3; x += 4) {
    p.r(x, bottom - 6, 2, 7, wood);
    p.px(x, bottom - 6, woodL);
    p.px(x, bottom - 7, woodL);
  }
  p.r(3, bottom - 4, W - 6, 1, woodL);
  for (let x = 3; x < W - 3; x += 4) {
    p.r(x, bottom - 21, 2, 7, wood);
    p.px(x, bottom - 21, woodL);
  }
  p.r(3, bottom - 19, W - 6, 1, wood);
  for (const y of [bottom - 20, bottom - 5]) {
    p.r(3, y, 1, 1, woodL);
  }
  // большой каменный крест на заднем плане
  const cx = Math.round(W / 2);
  p.r(cx - 1, bottom - 30, 3, 11, '#8a8a98');
  p.r(cx - 3, bottom - 27, 7, 3, '#8a8a98');
  p.r(cx - 1, bottom - 30, 1, 11, '#b4b4c4');
  p.r(cx - 3, bottom - 27, 7, 1, '#b4b4c4');
  p.r(cx - 2, bottom - 20, 5, 2, '#5a5a68');
  // тусклые цветы
  for (const [fx, fy, col] of [[8, bottom - 9, '#e06a8a'], [W - 12, bottom - 10, '#f0e070'], [W - 20, bottom - 8, '#a07ae0']] as [number, number, string][]) {
    p.px(fx, fy, col);
    p.px(fx, fy + 1, '#3a7a3a');
  }
  return { cv: p.c };
}

export function buildBuildingSprites(): BuildingSprites {
  const list: Record<BuildingId, Sprite> = {
    camp: campSprite(),
    campfire: campfireSprite(),
    shelter: shelterSprite(),
    house: house({
      tiles: 2,
      wallH: 16,
      roofH: 13,
      wall: 'plank',
      wallPal: WOOD_PAL,
      roofPal: ['#4a3410', '#8a6a22', '#b8942e', '#e0c050'],
      windows: 2,
      chimney: true,
      seed: 3,
    }),
    stonehouse: house({
      tiles: 2,
      wallH: 17,
      roofH: 14,
      wall: 'stone',
      wallPal: ['#b4b4bc', '#9696a2', '#62626e'],
      roofPal: ['#4a1814', '#8e3426', '#bc5236', '#e07a50'],
      windows: 2,
      chimney: true,
      seed: 7,
    }),
    storage: house({
      tiles: 2,
      wallH: 15,
      roofH: 11,
      wall: 'plank',
      wallPal: WOOD_PAL,
      roofPal: ['#2e1c0a', '#5e3e1a', '#8a5e30', '#b08044'],
      windows: 0,
      open: true,
      seed: 5,
    }),
    farm: farmSprite(),
    lodge: house({
      tiles: 2,
      wallH: 15,
      roofH: 12,
      wall: 'plank',
      wallPal: ['#8a6038', '#6a4426', '#4a2e18'],
      roofPal: ['#2e2012', '#54402a', '#7a5c3a', '#a08058'],
      windows: 1,
      antlers: true,
      chimney: true,
      seed: 13,
    }),
    shrine: shrineSprite(),
    hall: house({
      tiles: 3,
      wallH: 24,
      roofH: 17,
      wall: 'stone',
      wallPal: ['#c0b8a8', '#a29a8a', '#7a7262'],
      roofPal: ['#1a2640', '#2e4268', '#456294', '#6c8cc4'],
      windows: 4,
      chimney: true,
      banner: true,
      beams: true,
      doorW: 9,
      seed: 17,
    }),
    barracks: house({
      tiles: 3,
      wallH: 18,
      roofH: 13,
      wall: 'stone',
      wallPal: ['#b0aaa0', '#938c82', '#5e5850'],
      roofPal: ['#3a0e0e', '#7a1e1e', '#a82c2c', '#d04848'],
      windows: 2,
      banner: true,
      beams: true,
      doorW: 8,
      seed: 21,
    }),
    market: house({
      tiles: 2,
      wallH: 14,
      roofH: 11,
      wall: 'plank',
      wallPal: WOOD_PAL,
      roofPal: ['#6a2a1a', '#b0442a', '#e8dcc0', '#f6eedc'],
      windows: 0,
      open: true,
      seed: 25,
    }),
    forge: house({
      tiles: 2,
      wallH: 16,
      roofH: 12,
      wall: 'stone',
      wallPal: ['#8e8e98', '#6e6e7a', '#44444e'],
      roofPal: ['#1c1c24', '#34343e', '#4c4c58', '#686876'],
      windows: 1,
      chimney: true,
      seed: 29,
    }),
    library: house({
      tiles: 2,
      wallH: 19,
      roofH: 14,
      wall: 'stone',
      wallPal: ['#d0c8b4', '#b0a890', '#847c66'],
      roofPal: ['#14284a', '#244a82', '#3a6cb4', '#5c92d8'],
      windows: 3,
      beams: true,
      banner: true,
      seed: 33,
    }),
    workshop: house({
      tiles: 2,
      wallH: 16,
      roofH: 12,
      wall: 'plank',
      wallPal: ['#b48a58', '#946a3c', '#6a4826'],
      roofPal: ['#2a2a30', '#4a4a54', '#6a6a76', '#8a8a98'],
      windows: 2,
      chimney: true,
      beams: true,
      seed: 41,
    }),
    foundry: house({
      tiles: 2,
      wallH: 18,
      roofH: 13,
      wall: 'stone',
      wallPal: ['#9a8a84', '#7a6a66', '#4e423e'],
      roofPal: ['#1c1214', '#3a2428', '#5a363a', '#7e4a4a'],
      windows: 1,
      chimney: true,
      chimney2: true,
      seed: 43,
    }),
    factory: house({
      tiles: 3,
      wallH: 24,
      roofH: 15,
      wall: 'stone',
      wallPal: ['#c0705a', '#9a5444', '#6a3428'],
      roofPal: ['#2a3038', '#46505c', '#66727e', '#8896a4'],
      windows: 4,
      chimney: true,
      chimney2: true,
      beams: true,
      doorW: 10,
      seed: 47,
    }),
    tower: house({
      tiles: 2,
      wallH: 30,
      roofH: 12,
      wall: 'stone',
      wallPal: ['#aaaab4', '#8a8a96', '#565662'],
      roofPal: ['#2a2a38', '#44445a', '#62627e', '#8484a4'],
      windows: 1,
      banner: true,
      doorW: 6,
      seed: 37,
    }),
    bowyer: house({
      tiles: 2,
      wallH: 15,
      roofH: 12,
      wall: 'plank',
      wallPal: ['#c29a5e', '#a07440', '#704c28'],
      roofPal: ['#2a3a1c', '#46602c', '#6a8a42', '#92b25a'],
      windows: 1,
      beams: true,
      antlers: true,
      seed: 51,
    }),
    armory: house({
      tiles: 2,
      wallH: 17,
      roofH: 12,
      wall: 'stone',
      wallPal: ['#9a9aa8', '#767686', '#4a4a58'],
      roofPal: ['#22222c', '#3c3c4c', '#585870', '#7a7a96'],
      windows: 1,
      chimney: true,
      banner: true,
      seed: 53,
    }),
    stable: house({
      tiles: 3,
      wallH: 14,
      roofH: 11,
      wall: 'plank',
      wallPal: ['#b88a58', '#94683a', '#68461f'],
      roofPal: ['#5a3c14', '#8a6420', '#b88c32', '#e0b44a'],
      windows: 0,
      open: true,
      doorW: 9,
      seed: 55,
    }),
    siegeworks: house({
      tiles: 3,
      wallH: 18,
      roofH: 11,
      wall: 'plank',
      wallPal: ['#a07a4c', '#80603a', '#583e22'],
      roofPal: ['#3a2a1c', '#5a4430', '#7e6448', '#a48a68'],
      windows: 0,
      open: true,
      beams: true,
      doorW: 11,
      seed: 57,
    }),
    gunsmith: house({
      tiles: 2,
      wallH: 18,
      roofH: 13,
      wall: 'stone',
      wallPal: ['#b8a898', '#948474', '#605248'],
      roofPal: ['#1c1c20', '#34343c', '#505058', '#707078'],
      windows: 2,
      chimney: true,
      chimney2: true,
      seed: 59,
    }),
    cemetery: cemeterySprite(),
  };
  const cv = {} as Record<BuildingId, Cv>;
  const smoke: BuildingSprites['smoke'] = {};
  const fire: BuildingSprites['fire'] = {};
  (Object.keys(list) as BuildingId[]).forEach((k) => {
    cv[k] = list[k].cv;
    if (list[k].smoke) smoke[k] = list[k].smoke;
    if (list[k].fire) fire[k] = list[k].fire;
  });
  return { cv, smoke, fire };
}

export function buildFlames(): Cv[] {
  const out: Cv[] = [];
  for (let f = 0; f < 4; f++) {
    const p = new P(10, 14);
    const sway = [0, 1, 0, -1][f];
    const outer = [1, 2, 2, 4, 4, 6, 6, 6, 6, 6, 6, 4];
    const rows = outer.length;
    for (let i = 0; i < rows; i++) {
      const y = 13 - (rows - 1 - i) - 1;
      const tip = (rows - 1 - i) / rows;
      const shift = Math.round(sway * (1 - i / rows) * 2);
      const w = outer[i];
      const cx = 5 + shift;
      p.r(cx - w / 2, y, w, 1, '#e8541c');
      if (i >= 3) p.r(cx - (w - 2) / 2, y, w - 2, 1, '#ff9a2a');
      if (i >= 6) p.r(cx - Math.max(2, w - 4) / 2, y, Math.max(2, w - 4), 1, '#ffe680');
      void tip;
    }
    out.push(p.c);
  }
  return out;
}

/* ---------- ИКОНКИ ---------- */

export function buildIcons(): Record<string, string> {
  const icons: Record<string, string> = {};
  {
    const p = new P(14, 14);
    const log = (y: number, x: number) => {
      p.r(x, y, 11, 6, '#241408');
      p.r(x + 1, y + 1, 8, 4, '#6a4524');
      p.r(x + 1, y + 1, 8, 1, '#8a5e36');
      p.r(x + 1, y + 4, 8, 1, '#4a2e18');
      p.r(x + 8, y + 1, 2, 4, '#d8aa72');
      p.px(x + 9, y + 2, '#a47848');
      p.px(x + 9, y + 3, '#a47848');
    };
    log(1, 0);
    log(7, 2);
    icons.wood = p.c.toDataURL();
  }
  {
    const p = new P(14, 14);
    blob(
      p,
      [
        [7, 8, 5.8, 0.85],
        [4, 9, 3.5],
        [10, 9, 3.5],
      ],
      ['#252830', '#454a58', '#6c7384', '#959cae', '#c0c6d4'],
      5,
    );
    icons.stone = p.c.toDataURL();
  }
  {
    const p = new P(14, 14);
    blob(
      p,
      [
        [4.5, 9, 3.6],
        [9.5, 9, 3.6],
        [7, 6, 3.6],
      ],
      ['#4a0a16', '#8a1428', '#c8283c', '#e8506a', '#ffa0ae'],
      9,
    );
    p.r(7, 1, 1, 3, '#2f7a35');
    p.r(8, 1, 3, 2, '#48a03f');
    icons.food = p.c.toDataURL();
  }
  {
    const p = new P(14, 14);
    blob(p, [[7, 6, 5.2]], ['#6a4a08', '#c89a18', '#f0c830', '#ffe45a', '#fff8c0'], 3);
    p.r(5, 11, 4, 2, '#8a8a96');
    p.r(5, 11, 4, 1, '#b4b4c0');
    p.r(6, 13, 2, 1, '#4a4a56');
    icons.know = p.c.toDataURL();
  }
  {
    const p = new P(14, 14);
    blob(p, [[7, 7, 5.4]], ['#5a3a00', '#b08410', '#e8b820', '#ffd84a', '#fff2a8'], 11);
    p.r(6, 4, 2, 6, '#8a6208');
    p.r(5, 5, 4, 1, '#8a6208');
    p.r(5, 8, 4, 1, '#8a6208');
    icons.gold = p.c.toDataURL();
  }
  {
    const p = new P(14, 14);
    p.r(6, 1, 2, 9, '#c8ccd8');
    p.r(6, 1, 1, 9, '#f0f2f8');
    p.r(3, 9, 8, 2, '#8a5a2a');
    p.r(6, 11, 2, 3, '#5a3a1a');
    p.r(6, 0, 2, 1, '#e8ecf4');
    icons.army = p.c.toDataURL();
  }
  {
    const p = new P(14, 14);
    p.r(1, 6, 12, 7, '#2a180a');
    p.r(2, 7, 10, 5, '#b98a52');
    p.r(2, 7, 10, 1, '#dcb078');
    p.r(2, 11, 10, 1, '#7a5430');
    p.r(6, 7, 2, 5, '#e8d8a8');
    p.r(3, 1, 8, 5, '#1c3a40');
    p.r(4, 2, 6, 3, '#5fd0d6');
    p.r(4, 2, 6, 1, '#b0f0f4');
    p.r(6, 5, 2, 1, '#e8d8a8');
    icons.goods = p.c.toDataURL();
  }
  {
    const lk: Look = { skin: 0, hair: 1, cloth: 1, female: false, style: 0, outfit: 0 };
    icons.pop = personSprite(lk, 0, 0, 0, false).toDataURL();
  }
  {
    const p = new P(11, 11);
    p.r(0, 0, 11, 10, '#7a4a1a');
    p.r(1, 1, 9, 8, '#fff2c8');
    p.r(4, 10, 3, 1, '#7a4a1a');
    p.line(3, 7, 7, 2, '#7a5230');
    p.r(6, 2, 3, 2, '#a8aebc');
    p.px(8, 3, '#e8ecf4');
    icons.mark = p.c.toDataURL();
  }
  return icons;
}
