export interface Pt {
  x: number;
  y: number;
}

export class Pathfinder {
  w: number;
  h: number;
  g: Float32Array;
  parent: Int32Array;
  seen: Uint32Array;
  closed: Uint32Array;
  stamp = 0;
  heapIdx: number[] = [];
  heapF: number[] = [];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.g = new Float32Array(w * h);
    this.parent = new Int32Array(w * h);
    this.seen = new Uint32Array(w * h);
    this.closed = new Uint32Array(w * h);
  }

  private push(idx: number, f: number) {
    const hi = this.heapIdx;
    const hf = this.heapF;
    let i = hi.length;
    hi.push(idx);
    hf.push(f);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p] <= f) break;
      hi[i] = hi[p];
      hf[i] = hf[p];
      i = p;
    }
    hi[i] = idx;
    hf[i] = f;
  }

  private pop(): number {
    const hi = this.heapIdx;
    const hf = this.heapF;
    const top = hi[0];
    const lastI = hi.pop()!;
    const lastF = hf.pop()!;
    const n = hi.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = i * 2 + 1;
        if (c >= n) break;
        if (c + 1 < n && hf[c + 1] < hf[c]) c++;
        if (hf[c] >= lastF) break;
        hi[i] = hi[c];
        hf[i] = hf[c];
        i = c;
      }
      hi[i] = lastI;
      hf[i] = lastF;
    }
    return top;
  }

  find(
    blocked: Uint8Array,
    sx: number,
    sy: number,
    isGoal: (x: number, y: number) => boolean,
    hx: number,
    hy: number,
    partial = false,
    maxNodes = 5000,
  ): Pt[] | null {
    const { w, h, g, parent, seen, closed } = this;
    this.stamp++;
    const stamp = this.stamp;
    this.heapIdx.length = 0;
    this.heapF.length = 0;
    const heur = (x: number, y: number) => {
      const dx = Math.abs(x - hx);
      const dy = Math.abs(y - hy);
      return Math.max(0, dx + dy - 0.586 * Math.min(dx, dy) - 1);
    };
    const s = sy * w + sx;
    g[s] = 0;
    parent[s] = -1;
    seen[s] = stamp;
    this.push(s, heur(sx, sy));
    let best = s;
    let bestH = heur(sx, sy);
    let iter = 0;
    let goal = -1;
    while (this.heapIdx.length && iter++ < maxNodes) {
      const idx = this.pop();
      if (closed[idx] === stamp) continue;
      closed[idx] = stamp;
      const x = idx % w;
      const y = (idx / w) | 0;
      if (isGoal(x, y)) {
        goal = idx;
        break;
      }
      const hh = heur(x, y);
      if (hh < bestH) {
        bestH = hh;
        best = idx;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (blocked[ni] && !(isGoal(nx, ny) && false)) continue;
          if (dx && dy && (blocked[y * w + nx] || blocked[ny * w + x])) continue;
          if (closed[ni] === stamp) continue;
          const ng = g[idx] + (dx && dy ? 1.414 : 1);
          if (seen[ni] !== stamp || ng < g[ni]) {
            seen[ni] = stamp;
            g[ni] = ng;
            parent[ni] = idx;
            this.push(ni, ng + heur(nx, ny));
          }
        }
      }
    }
    let end = goal;
    if (end < 0) {
      if (!partial || best === s) return null;
      end = best;
    }
    const path: Pt[] = [];
    let cur = end;
    while (cur !== s && cur >= 0) {
      path.push({ x: cur % w, y: (cur / w) | 0 });
      cur = parent[cur];
    }
    path.reverse();
    return path;
  }
}
