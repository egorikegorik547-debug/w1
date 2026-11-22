import { B } from './data';
import { hash2, mulberry32, ValueNoise } from './rng';
import type { MapType } from './meta';

export type ObjKind = 'tree' | 'bush' | 'rock' | 'cactus' | 'palm' | 'stump';

export interface Obj {
  id: number;
  kind: ObjKind;
  spr: string;
  amount: number;
  max: number;
  marked: boolean;
  regrow: number;
  shake: number;
  tx: number;
  ty: number;
}

export interface World {
  w: number;
  h: number;
  seed: number;
  biome: Uint8Array;
  objs: (Obj | null)[];
  blocked: Uint8Array;
  startX: number;
  startY: number;
  nextObjId: number;
  landId: Int16Array;
  landCount: number;
  type: MapType;
}

const TREE_WOOD: Record<string, number> = { oak: 5, birch: 3, autumn: 4, pine: 4, dark: 6, dead: 2, palm: 3, cactus: 2 };

export function isBlockingKind(k: ObjKind) {
  return k === 'tree' || k === 'rock' || k === 'cactus' || k === 'palm';
}

export function makeObj(world: World, kind: ObjKind, spr: string, tx: number, ty: number): Obj {
  const base = spr.replace(/\d+$/, '');
  let amount = 1;
  if (kind === 'tree' || kind === 'palm' || kind === 'cactus') amount = TREE_WOOD[base] ?? 4;
  if (kind === 'bush') amount = 6;
  if (kind === 'rock') amount = 8;
  if (kind === 'stump') amount = 0;
  const o: Obj = { id: world.nextObjId++, kind, spr, amount, max: amount, marked: false, regrow: 0, shake: 0, tx, ty };
  const idx = ty * world.w + tx;
  world.objs[idx] = o;
  world.blocked[idx] = isBlockingKind(kind) ? 1 : 0;
  return o;
}

function rankNormalize(arr: Float32Array): Float32Array {
  const N = arr.length;
  const idx = Array.from({ length: N }, (_, i) => i).sort((a, b) => arr[a] - arr[b]);
  const out = new Float32Array(N);
  for (let r = 0; r < N; r++) out[idx[r]] = r / (N - 1);
  return out;
}

interface Blob {
  x: number;
  y: number;
  r: number;
}

function makeBlobs(type: MapType, w: number, h: number, seed: number): Blob[] {
  const rnd = mulberry32(seed * 17 + 3);
  const s = Math.min(w, h);
  const blobs: Blob[] = [];
  const place = (n: number, rMin: number, rMax: number, sep: number, margin: number) => {
    for (let k = 0; k < n; k++) {
      let q = sep;
      let ok = false;
      for (let t = 0; t < 120 && !ok; t++) {
        const r = rMin + rnd() * (rMax - rMin);
        const x = margin + rnd() * (w - margin * 2);
        const y = margin + rnd() * (h - margin * 2);
        if (blobs.every((b) => Math.hypot(b.x - x, b.y - y) >= (r + b.r) * q)) {
          blobs.push({ x, y, r });
          ok = true;
        }
        q *= 0.985;
      }
    }
  };
  if (type === 'continent') {
    blobs.push({ x: w / 2 + (rnd() - 0.5) * s * 0.06, y: h / 2 + (rnd() - 0.5) * s * 0.06, r: s * 0.42 });
    place(2, s * 0.05, s * 0.08, 1.1, s * 0.12);
  } else if (type === 'continents') {
    place(s >= 140 ? 4 : 3, s * 0.2, s * 0.25, 1.05, s * 0.2);
    place(2, s * 0.05, s * 0.08, 1.1, s * 0.1);
  } else if (type === 'archipelago') {
    place(Math.round(s / 8), Math.max(7, s * 0.08), Math.max(10, s * 0.15), 0.55, s * 0.1);
  } else {
    place(Math.max(3, Math.round(s / 20)), Math.max(10, s * 0.075), Math.max(12, s * 0.115), 1.5, s * 0.12);
  }
  return blobs;
}

function labelLands(w: number, h: number, biome: Uint8Array): { id: Int16Array; count: number } {
  const id = new Int16Array(w * h);
  let count = 0;
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (biome[i] <= B.WATER || id[i]) continue;
    count++;
    id[i] = count;
    stack.push(i);
    while (stack.length) {
      const c = stack.pop()!;
      const x = c % w;
      const y = (c - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (biome[ni] > B.WATER && !id[ni]) {
          id[ni] = count;
          stack.push(ni);
        }
      }
    }
  }
  return { id, count };
}

export function generateWorld(seed: number, w = 100, h = 100, type: MapType = 'continents'): World {
  const nE = new ValueNoise(seed * 3 + 1);
  const nT = new ValueNoise(seed * 5 + 2);
  const nM = new ValueNoise(seed * 7 + 3);
  const nC = new ValueNoise(seed * 11 + 4);
  const nG = new ValueNoise(seed * 13 + 5);
  const N = w * h;

  const elev = new Float32Array(N);
  const tempRaw = new Float32Array(N);
  const moistRaw = new Float32Array(N);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      elev[i] = nE.fbm(x / 22, y / 22, 4);
      tempRaw[i] = nT.fbm(x / 36, y / 36, 3) * 0.72 + (y / h) * 0.28;
      moistRaw[i] = nM.fbm(x / 28, y / 28, 3);
    }
  }
  const temp = rankNormalize(tempRaw);
  const moist = rankNormalize(moistRaw);
  const blobs = makeBlobs(type, w, h, seed);
  const nW = new ValueNoise(seed * 19 + 6);

  const biome = new Uint8Array(N);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      const edgeW = 3 + nC.at(x / 7, y / 7) * 5;
      let mv = -9;
      for (const bl of blobs) {
        const dd = Math.hypot(x - bl.x, y - bl.y) + (nW.fbm(x / 9, y / 9, 3) - 0.5) * bl.r * 0.9;
        const v = 1 - dd / bl.r;
        if (v > mv) mv = v;
      }
      const e = mv + (elev[i] - 0.5) * 0.5;
      let b: number;
      if (d < edgeW) b = d < edgeW - 2.5 ? B.DEEP : B.WATER;
      else if (e < -0.5) b = B.DEEP;
      else if (e < 0.03) b = B.WATER;
      else if (e < 0.11) b = B.BEACH;
      else {
        const t = temp[i];
        const m = Math.min(1, Math.max(0, moist[i] + (nG.at(x / 5, y / 5) - 0.5) * 0.06));
        if (t > 0.68 && m < 0.38) b = B.DESERT;
        else if (m < 0.3) b = B.STEPPE;
        else if (t > 0.68 && m < 0.5) b = B.STEPPE;
        else if (m < 0.46) b = B.FIELD;
        else if (m < 0.58) b = B.FSTEPPE;
        else {
          if (t < 0.28) b = m > 0.8 ? B.DARK : B.TAIGA;
          else if (t < 0.5) b = m > 0.76 ? B.TAIGA : B.BIRCH;
          else if (t < 0.64) b = m < 0.8 ? B.AUTUMN : B.OAK;
          else b = B.OAK;
        }
      }
      biome[i] = b;
    }
  }
  // Пляжи вдоль воды
  const copy = Uint8Array.from(biome);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (copy[i] <= B.BEACH) continue;
      let nearWater = false;
      for (let dy = -1; dy <= 1 && !nearWater; dy++)
        for (let dx = -1; dx <= 1; dx++) if (copy[(y + dy) * w + x + dx] <= B.WATER) { nearWater = true; break; }
      if (nearWater) biome[i] = B.BEACH;
    }
  }

  const world: World = {
    w,
    h,
    seed,
    biome,
    objs: new Array(N).fill(null),
    blocked: new Uint8Array(N),
    startX: Math.floor(w / 2),
    startY: Math.floor(h / 2),
    nextObjId: 1,
    landId: new Int16Array(0),
    landCount: 0,
    type,
  };
  for (let i = 0; i < N; i++) if (biome[i] <= B.WATER) world.blocked[i] = 1;

  // Объекты
  const pick = (r: number, opts: [string, number][]) => {
    let acc = 0;
    for (const [k, p] of opts) {
      acc += p;
      if (r < acc) return k;
    }
    return opts[opts.length - 1][0];
  };
  const variantOf = (x: number, y: number, n: number) => Math.floor(hash2(x, y, seed + 5) * n);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const b = biome[i];
      if (b <= B.WATER) continue;
      const r = hash2(x, y, seed + 77);
      const r2 = hash2(x, y, seed + 78);
      const r3 = hash2(x, y, seed + 79);
      const c = nC.fbm(x / 6, y / 6, 2);
      const cl = 0.35 + Math.min(1.4, Math.max(0, (c - 0.3) * 3));
      let treeType: string | null = null;
      let p = 0;
      switch (b) {
        case B.OAK:
          p = 0.55 * cl;
          treeType = pick(r2, [['oak', 0.82], ['birch', 0.12], ['autumn', 0.06]]);
          break;
        case B.BIRCH:
          p = 0.5 * cl;
          treeType = pick(r2, [['birch', 0.82], ['oak', 0.18]]);
          break;
        case B.AUTUMN:
          p = 0.55 * cl;
          treeType = pick(r2, [['autumn', 0.6], ['oak', 0.22], ['birch', 0.18]]);
          break;
        case B.TAIGA:
          p = 0.58 * cl;
          treeType = pick(r2, [['pine', 0.88], ['birch', 0.1], ['dark', 0.02]]);
          break;
        case B.DARK:
          p = 0.72 * cl;
          treeType = pick(r2, [['dark', 0.82], ['pine', 0.18]]);
          break;
        case B.FSTEPPE: {
          const g = nG.fbm(x / 9, y / 9, 2);
          p = g > 0.54 ? 0.46 : 0.012;
          treeType = pick(r2, [['oak', 0.6], ['birch', 0.4]]);
          break;
        }
        case B.FIELD:
          p = 0.01;
          treeType = 'oak';
          break;
        case B.STEPPE:
          p = 0.004;
          treeType = pick(r2, [['oak', 0.5], ['dead', 0.5]]);
          break;
        case B.DESERT:
          p = 0.026;
          treeType = pick(r2, [['cactus', 0.85], ['dead', 0.15]]);
          break;
        case B.BEACH:
          if (temp[i] > 0.6) {
            p = 0.1;
            treeType = 'palm';
          }
          break;
      }
      if (treeType && r < p) {
        const kind = treeType === 'palm' ? 'palm' : treeType === 'cactus' ? 'cactus' : 'tree';
        const nv = treeType === 'oak' || treeType === 'birch' || treeType === 'pine' ? 3 : treeType === 'autumn' ? 4 : treeType === 'dark' ? 2 : treeType === 'palm' ? 2 : treeType === 'cactus' ? 2 : 1;
        makeObj(world, kind, treeType + variantOf(x, y, nv), x, y);
        continue;
      }
      // кусты с ягодами
      const bushP =
        b === B.FIELD ? 0.022 : b === B.FSTEPPE ? 0.022 : b === B.OAK ? 0.016 : b === B.BIRCH ? 0.02 : b === B.AUTUMN ? 0.013 : b === B.TAIGA ? 0.007 : b === B.STEPPE ? 0.004 : 0;
      if (r2 < bushP && r3 < 0.9) {
        makeObj(world, 'bush', 'bush', x, y);
        continue;
      }
      // камни
      const rockP =
        b === B.STEPPE ? 0.022 : b === B.DESERT ? 0.02 : b === B.FSTEPPE ? 0.01 : b === B.FIELD ? 0.007 : b === B.BEACH ? 0.006 : b === B.TAIGA || b === B.DARK ? 0.014 : 0.01;
      if (hash2(x, y, seed + 91) < rockP) {
        const sand = b === B.DESERT || b === B.BEACH || b === B.STEPPE;
        makeObj(world, 'rock', (sand ? 'sandrock' : 'rock') + variantOf(x, y, sand ? 2 : 3), x, y);
      }
    }
  }

  // Выбор стартовой точки
  let best: { x: number; y: number } | null = null;
  let bestScore = -1e9;
  const okBiome = (b0: number) => b0 === B.FIELD || b0 === B.FSTEPPE || b0 === B.STEPPE || b0 === B.OAK || b0 === B.BIRCH || b0 === B.AUTUMN;
  for (let pass = 0; pass < 2 && !best; pass++) {
    for (let cy = 10; cy < h - 10; cy += 2) {
      for (let cx = 10; cx < w - 10; cx += 2) {
        const b0 = biome[cy * w + cx];
        if (pass === 0 ? !okBiome(b0) : b0 <= B.BEACH) continue;
        let bad = false;
        for (let dy = -3; dy <= 3 && !bad; dy++) for (let dx = -4; dx <= 4; dx++) if (biome[(cy + dy) * w + cx + dx] <= B.WATER) { bad = true; break; }
        if (bad) continue;
        let trees = 0;
        let bushes = 0;
        let grass = 0;
        let wat = 0;
        for (let dy = -9; dy <= 9; dy++) {
          for (let dx = -9; dx <= 9; dx++) {
            const xx = cx + dx;
            const yy = cy + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const bi = biome[yy * w + xx];
            if (bi <= B.WATER) wat++;
            if (bi === B.FIELD || bi === B.FSTEPPE) grass++;
            const o = world.objs[yy * w + xx];
            if (o?.kind === 'tree') trees++;
            if (o?.kind === 'bush') bushes++;
          }
        }
        const dist = Math.hypot(cx - w / 2, cy - h / 2);
        const score = 100 - Math.abs(trees - 30) * 1.2 + grass * 0.12 + Math.min(bushes, 4) * 4 - dist * 0.25 - wat * 0.35 + (b0 === B.FIELD || b0 === B.FSTEPPE ? 20 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = { x: cx, y: cy };
        }
      }
    }
  }
  if (!best) best = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
  const sx = best.x;
  const sy = best.y;
  world.startX = sx - 1;
  world.startY = sy - 1;

  // Расчистка стоянки
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const xx = sx + dx;
      const yy = sy + dy;
      const i = yy * w + xx;
      if (biome[i] <= B.WATER) continue;
      if (biome[i] === B.DESERT || biome[i] === B.BEACH) biome[i] = B.FIELD;
      world.objs[i] = null;
      world.blocked[i] = 0;
    }
  }

  const rnd = (k: number) => hash2(sx, sy, seed + k);
  const countAround = (pred: (o: Obj) => boolean, r0: number, r1: number) => {
    let n = 0;
    for (let dy = -r1; dy <= r1; dy++)
      for (let dx = -r1; dx <= r1; dx++) {
        const d = Math.hypot(dx, dy);
        if (d < r0 || d > r1) continue;
        const o = world.objs[(sy + dy) * w + sx + dx];
        if (o && pred(o)) n++;
      }
    return n;
  };
  const plant = (kind: ObjKind, spr: string, r0: number, r1: number, seedK: number) => {
    for (let tries = 0; tries < 60; tries++) {
      const a = hash2(tries, seedK, seed + 400) * Math.PI * 2;
      const rr = r0 + hash2(tries, seedK + 1, seed + 401) * (r1 - r0);
      const x = Math.round(sx + Math.cos(a) * rr);
      const y = Math.round(sy + Math.sin(a) * rr * 0.8);
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      const i = y * w + x;
      if (biome[i] <= B.BEACH || world.objs[i] || world.blocked[i]) continue;
      if (biome[i] === B.DESERT) biome[i] = B.STEPPE;
      makeObj(world, kind, spr, x, y);
      return;
    }
  };
  const needBush = 5 - countAround((o) => o.kind === 'bush', 3, 10);
  for (let k = 0; k < needBush; k++) plant('bush', 'bush', 4, 9, k);
  const needTrees = 14 - countAround((o) => o.kind === 'tree', 5, 12);
  for (let k = 0; k < needTrees; k++) plant('tree', 'oak' + Math.floor(rnd(k + 10) * 3), 6, 11, 100 + k * 3);
  const needRocks = 4 - countAround((o) => o.kind === 'rock', 5, 14);
  for (let k = 0; k < needRocks; k++) plant('rock', 'rock' + Math.floor(rnd(k + 30) * 3), 7, 13, 200 + k * 3);

  const lands = labelLands(w, h, biome);
  world.landId = lands.id;
  world.landCount = lands.count;
  return world;
}
