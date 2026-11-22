import { B, BIOME_MINI, TH, TW } from './data';
import { hash2, ValueNoise } from './rng';
import { mk, type Cv } from './sprites';
import type { World } from './worldgen';

const hex = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

const PAL: string[][] = [];
PAL[B.DEEP] = ['#1a548c', '#1f6199', '#256fa8', '#2f7fb8', '#3d90c8'];
PAL[B.WATER] = ['#2c88b8', '#3898c8', '#48aad8', '#62bee6', '#86d4f2'];
PAL[B.BEACH] = ['#dccb92', '#e6d6a0', '#eee0ae', '#f4e8be', '#faf0cc'];
PAL[B.DESERT] = ['#d4b06a', '#debc76', '#e8c884', '#f0d494', '#f8e0a4'];
PAL[B.STEPPE] = ['#85833a', '#96933f', '#a6a14c', '#b8b25a', '#c9c36c'];
PAL[B.FIELD] = ['#3f8a34', '#4e9d3d', '#5fb046', '#72c24f', '#8cd45e'];
PAL[B.FSTEPPE] = ['#548f38', '#64a040', '#76b248', '#8bc352', '#a0d260'];
PAL[B.OAK] = ['#2a6428', '#347432', '#40843a', '#4e9442', '#5ea44c'];
PAL[B.BIRCH] = ['#559a3c', '#66ab44', '#78bc4e', '#8ccc58', '#a2da68'];
PAL[B.AUTUMN] = ['#667430', '#768436', '#88883a', '#9a8e40', '#ac9c4a'];
PAL[B.TAIGA] = ['#295a46', '#336a50', '#3e7a5a', '#4a8c66', '#589c74'];
PAL[B.DARK] = ['#1b3834', '#24443e', '#2d5148', '#375f54', '#426d60'];
const RGB = PAL.map((p) => p.map(hex));

export function renderTerrain(world: World): Cv {
  const { w, h, biome, seed } = world;
  const W = w * TW;
  const H = h * TH;
  const c = mk(W, H);
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const d = img.data;
  const nA = new ValueNoise(seed + 901);
  const nB = new ValueNoise(seed + 902);
  const nD = new ValueNoise(seed + 903);

  const bAt = (px: number, py: number) => {
    const tx = px < 0 ? 0 : px >= W ? w - 1 : Math.floor(px / TW);
    const ty = py < 0 ? 0 : py >= H ? h - 1 : Math.floor(py / TH);
    return biome[ty * w + tx];
  };

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const jx = Math.floor((hash2(px >> 1, py >> 1, seed + 11) - 0.5) * 7);
      const jy = Math.floor((hash2(px >> 1, py >> 1, seed + 12) - 0.5) * 5);
      const b = bAt(px + jx, py + jy);
      const fine = hash2(px, py, seed + 13);
      let idx: number;
      if (b <= B.WATER) {
        const streak = nB.at(px / 15, py / 4.2);
        const v = streak + (fine - 0.5) * 0.22;
        idx = v < 0.3 ? 0 : v < 0.46 ? 1 : v < 0.62 ? 2 : v < 0.78 ? 3 : 4;
      } else {
        const lf = nA.fbm(px / 20, py / 15, 2);
        const v = (lf - 0.5) * 2.4 + 0.5 + (fine - 0.5) * 0.35;
        idx = v < 0.22 ? 0 : v < 0.4 ? 1 : v < 0.7 ? 2 : v < 0.86 ? 3 : 4;
        if (b === B.DESERT) {
          const dune = Math.sin((px * 0.32 + py * 1.15) / 7 + nD.at(px / 40, py / 30) * 9);
          if (dune > 0.84) idx = 4;
          else if (dune < -0.92) idx = 0;
          else if (idx === 0 || idx === 4) idx = 2;
        }
      }
      let col = RGB[b][idx];
      if (b === B.WATER) {
        // пена у берега
        const near = bAt(px - 4, py) > B.WATER || bAt(px + 4, py) > B.WATER || bAt(px, py - 3) > B.WATER || bAt(px, py + 3) > B.WATER;
        if (near) col = hash2(px, py, seed + 14) < 0.5 ? [232, 246, 255] : [168, 224, 244];
      } else if (b === B.BEACH) {
        const wet = bAt(px - 3, py) <= B.WATER || bAt(px + 3, py) <= B.WATER || bAt(px, py - 2) <= B.WATER || bAt(px, py + 2) <= B.WATER;
        if (wet) col = [196, 178, 124];
      }
      const o = (py * W + px) * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  // ---- Декор ----
  const f = (x: number, y: number, ww: number, hh: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, ww, hh);
  };
  const tuft = (x: number, y: number, c0: string, c1: string, c2: string) => {
    f(x, y, 1, 1, c0);
    f(x - 1, y - 1, 1, 1, c1);
    f(x + 1, y - 1, 1, 1, c1);
    f(x, y - 2, 1, 2, c2);
  };
  const flower = (x: number, y: number, col: string) => {
    f(x, y, 1, 1, '#3a8a30');
    f(x, y - 1, 1, 1, col);
    f(x - 1, y - 2, 1, 1, col);
    f(x + 1, y - 2, 1, 1, col);
    f(x, y - 2, 1, 1, '#ffe46a');
    f(x, y - 3, 1, 1, col);
  };
  const FLOWERS = ['#ffffff', '#ff8ac0', '#ffd23a', '#7ab4ff', '#ff6a5a', '#c89aff'];
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const b = biome[ty * w + tx];
      if (b <= B.WATER) continue;
      const k = (n: number) => hash2(tx, ty, seed + 40 + n);
      const rx = (n: number) => tx * TW + 2 + Math.floor(k(n) * (TW - 4));
      const ry = (n: number) => ty * TH + 3 + Math.floor(k(n + 50) * (TH - 4));
      switch (b) {
        case B.FIELD:
        case B.FSTEPPE: {
          const nt = Math.floor(k(1) * (b === B.FIELD ? 4 : 3));
          for (let i = 0; i < nt; i++) tuft(rx(2 + i), ry(2 + i), '#2f7a2c', '#4a9a3a', '#7ac850');
          if (k(9) < (b === B.FIELD ? 0.2 : 0.09)) flower(rx(10), ry(10), FLOWERS[Math.floor(k(11) * FLOWERS.length)]);
          if (b === B.FIELD && nD.at(tx / 5, ty / 5) > 0.6) {
            for (let i = 0; i < 6; i++) {
              const x = tx * TW + 1 + i * 2 + (k(20 + i) < 0.5 ? 0 : 1);
              const y = ty * TH + 4 + Math.floor(k(30 + i) * 6);
              f(x, y, 1, 3, '#a8b040');
              f(x, y - 1, 1, 2, '#e8c840');
              f(x, y - 2, 1, 1, '#fff0a0');
            }
          }
          break;
        }
        case B.STEPPE: {
          const nt = Math.floor(k(1) * 3.5);
          for (let i = 0; i < nt; i++) tuft(rx(2 + i), ry(2 + i), '#6a6428', '#b8ac58', '#e4d684');
          if (k(8) < 0.22) {
            const x = rx(9);
            const y = ry(9);
            f(x, y, 1, 1, '#8a8438');
            f(x, y - 1, 1, 1, '#d8cc7c');
            f(x, y - 2, 1, 1, '#ece4a8');
            f(x + 1, y - 3, 1, 1, '#f4eec0');
            f(x + 1, y - 4, 1, 1, '#f4eec0');
          }
          if (k(12) < 0.06) {
            const x = rx(12);
            const y = ry(12);
            f(x - 2, y - 1, 5, 2, '#7a8a58');
            f(x - 1, y - 2, 3, 1, '#9aaa70');
          }
          if (k(13) < 0.05) {
            f(rx(13), ry(13), 2, 1, '#8a8a90');
          }
          break;
        }
        case B.DESERT: {
          if (k(1) < 0.3) {
            const x = rx(2);
            const y = ry(2);
            f(x, y, 2, 1, '#a88650');
            f(x, y - 1, 1, 1, '#d8c08a');
          }
          if (k(3) < 0.1) {
            const x = rx(4);
            const y = ry(4);
            f(x, y, 1, 1, '#8a6a38');
            f(x - 1, y - 1, 1, 1, '#a8864e');
            f(x + 1, y - 1, 1, 1, '#a8864e');
          }
          if (k(5) < 0.03) {
            const x = rx(5);
            const y = ry(5);
            f(x, y, 4, 1, '#efe8d4');
            f(x + 1, y - 1, 1, 1, '#efe8d4');
          }
          break;
        }
        case B.BEACH: {
          if (k(1) < 0.18) f(rx(2), ry(2), 2, 1, '#fff4e0');
          if (k(3) < 0.1) f(rx(4), ry(4), 1, 1, '#ffb0c0');
          if (k(5) < 0.12) f(rx(6), ry(6), 2, 1, '#b8a878');
          break;
        }
        case B.OAK:
        case B.BIRCH:
        case B.AUTUMN:
        case B.TAIGA:
        case B.DARK: {
          const leaf = b === B.AUTUMN ? ['#e8821e', '#c8501c', '#e8c030'] : b === B.TAIGA ? ['#6a4a30', '#8a6a44', '#4a3a28'] : b === B.DARK ? ['#1a2a28', '#102020', '#2a4a44'] : ['#2a6a2a', '#7a5a30', '#8ab04a'];
          const nl = Math.floor(k(1) * (b === B.AUTUMN ? 7 : 4));
          for (let i = 0; i < nl; i++) {
            const x = rx(2 + i);
            const y = ry(2 + i);
            if (b === B.TAIGA || b === B.DARK) f(x, y, 2, 1, leaf[Math.floor(k(20 + i) * 3)]);
            else f(x, y, 1, 1, leaf[Math.floor(k(20 + i) * 3)]);
          }
          if (k(9) < 0.4) tuft(rx(10), ry(10), '#1f5a24', '#2f7a30', '#4a9a3c');
          if (b === B.TAIGA && k(14) < 0.25) f(rx(14), ry(14), 3, 2, '#5aa078');
          if (b === B.DARK && k(15) < 0.3) f(rx(15), ry(15), 3, 2, '#2e5a50');
          if (k(16) < (b === B.DARK ? 0.05 : 0.03)) {
            const x = rx(17);
            const y = ry(17);
            if (b === B.DARK) {
              f(x, y, 1, 2, '#9ad8e8');
              f(x - 1, y - 1, 3, 1, '#4ab8e0');
              f(x, y - 1, 1, 1, '#c8f4ff');
            } else {
              f(x, y, 1, 2, '#efe4c8');
              f(x - 1, y - 1, 3, 1, '#d8402a');
              f(x, y - 1, 1, 1, '#ffffff');
            }
          }
          if (b === B.OAK || b === B.BIRCH) {
            if (k(18) < 0.07) flower(rx(19), ry(19), FLOWERS[Math.floor(k(21) * FLOWERS.length)]);
          }
          break;
        }
      }
    }
  }
  return c;
}

export function renderMinimap(world: World): Cv {
  const { w, h, biome } = world;
  const c = mk(w, h);
  const g = c.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      g.fillStyle = BIOME_MINI[biome[y * w + x]];
      g.fillRect(x, y, 1, 1);
      const o = world.objs[y * w + x];
      if (o && o.kind === 'tree') {
        g.fillStyle = 'rgba(0,30,10,0.28)';
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}
