import { BUILDINGS, TH, TW } from './data';
import type { Building, Game, Unit } from './game';
import { claimWhy, type Animal } from './life';
import { SPECS } from './meta';
import { personSprite } from './sprites';
import type { March } from './towns';
import { drawContact, drawFlag, drawShadow, isRunning } from './fx';

type Ctx = CanvasRenderingContext2D;

const rc = (ctx: Ctx, ox: number, oy: number, x: number, y: number, w: number, h: number, col: string) => {
  ctx.fillStyle = col;
  ctx.fillRect(ox + x, oy + y, w, h);
};

const BLADE: Record<string, string> = { bronze_sword: '#d09a46', iron_sword: '#b4bac6', steel_sword: '#eef4ff' };

function weaponArt(ctx: Ctx, ox: number, oy: number, dir: number, weapon: string | null, working: boolean) {
  if (!weapon) return;
  const sx = dir === 3 ? 2 : 13;
  const sw = working ? 1 : 0;
  switch (weapon) {
    case 'spear':
      rc(ctx, ox, oy, sx, 2 - sw, 1, 17, '#8a6a3a');
      rc(ctx, ox, oy, sx - 1, 0 - sw, 3, 3, '#d8dce8');
      break;
    case 'club':
      rc(ctx, ox, oy, sx, 8 - sw, 2, 7, '#7a5a30');
      rc(ctx, ox, oy, sx - 1, 7 - sw, 4, 3, '#5a3a1c');
      break;
    case 'bow': {
      const d = dir === 3 ? -1 : 1;
      for (const [x, y] of [[1, 6], [2, 7], [2, 8], [2, 9], [2, 10], [1, 11]]) rc(ctx, ox, oy, sx + x * d, y, 1, 1, '#8a5a2a');
      rc(ctx, ox, oy, sx, 6, 1, 6, '#e8e0c8');
      break;
    }
    case 'crossbow':
      rc(ctx, ox, oy, sx - 2, 10, 6, 1, '#5a3a1a');
      rc(ctx, ox, oy, sx, 8, 1, 5, '#7a5226');
      rc(ctx, ox, oy, sx - 2, 9, 1, 1, '#c8c8d0');
      break;
    case 'musket':
      rc(ctx, ox, oy, sx, 7 - sw, 1, 11, '#3a3030');
      rc(ctx, ox, oy, sx, 6 - sw, 1, 3, '#9a9aa6');
      rc(ctx, ox, oy, sx, 13, 1, 4, '#6a4426');
      break;
    default: {
      const col = BLADE[weapon] ?? '#c0c6d0';
      rc(ctx, ox, oy, sx, 5 - sw, 1, 9, col);
      rc(ctx, ox, oy, sx - 1, 13 - sw, 3, 1, '#6a4a20');
      rc(ctx, ox, oy, sx, 14 - sw, 1, 2, '#4a2e18');
    }
  }
}

/** Воины, охотники, воры и странники — снаряжение поверх человечка */
export function drawRoleGear(ctx: Ctx, g: Game, u: Unit, ox: number, oy: number, dir: number, working: boolean) {
  const role = u.role;
  if (role === 'soldier') {
    const gr = u.gear;
    const hero = !!u.hero;
    // шлем
    rc(ctx, ox, oy, 5, 5, 6, 3, hero ? '#d8b040' : '#8c93a4');
    rc(ctx, ox, oy, 5, 5, 6, 1, hero ? '#fff0a0' : '#c4cadb');
    rc(ctx, ox, oy, 7, 3, 2, 2, hero ? '#e03a3a' : '#3a6ad8');
    // броня
    if (gr?.armor === 'chainmail') {
      rc(ctx, ox, oy, 5, 11, 6, 4, '#aab0c0');
      for (let i = 0; i < 6; i += 2) rc(ctx, ox, oy, 5 + i, 12, 1, 1, '#6a7080');
      rc(ctx, ox, oy, 5, 14, 6, 1, '#6a7080');
    } else if (gr?.armor === 'leather') {
      rc(ctx, ox, oy, 5, 11, 6, 4, '#8a5a30');
      rc(ctx, ox, oy, 5, 11, 6, 1, '#b07a44');
      rc(ctx, ox, oy, 5, 13, 6, 1, '#4a2e18');
    } else {
      rc(ctx, ox, oy, 5, 13, 6, 1, '#d8c070');
    }
    if (hero) rc(ctx, ox, oy, dir === 3 ? 10 : 5, 11, 1, 6, '#c03030');
    weaponArt(ctx, ox, oy, dir, gr?.weapon ?? null, working);
    if (gr?.shield && dir !== 1) {
      const x = dir === 3 ? 11 : 2;
      rc(ctx, ox, oy, x, 10, 3, 5, '#2a5ac8');
      rc(ctx, ox, oy, x, 10, 3, 1, '#e0e0f0');
      rc(ctx, ox, oy, x + 1, 12, 1, 1, '#ffe27a');
    }
    if (gr?.horse) rc(ctx, ox, oy, 5, 2, 1, 2, '#a07a4a');
    return;
  }
  if (role === 'hunter') {
    rc(ctx, ox, oy, 5, 5, 6, 2, '#3a6a3a');
    rc(ctx, ox, oy, 5, 5, 6, 1, '#5a9a4a');
    rc(ctx, ox, oy, dir === 3 ? 10 : 5, 3, 1, 3, '#d8503a');
    rc(ctx, ox, oy, 5, 11, 6, 1, '#6a4a2a');
    weaponArt(ctx, ox, oy, dir, u.gear?.weapon ?? 'club', working);
    return;
  }
  if (role === 'thief' || role === 'bandit') {
    rc(ctx, ox, oy, 4, 5, 8, 3, '#25252c');
    rc(ctx, ox, oy, 5, 8, 6, 1, '#101014');
    if (role === 'bandit') {
      rc(ctx, ox, oy, 4, 11, 8, 4, '#3a2a2a');
      weaponArt(ctx, ox, oy, dir, 'club', working);
    } else {
      rc(ctx, ox, oy, 4, 11, 8, 3, '#2c2c34');
      rc(ctx, ox, oy, dir === 3 ? 10 : 3, 12, 3, 3, '#7a6a3a');
    }
    return;
  }
  if (role === 'visitor') {
    const kind = g.life.visitors.find((v) => v.unit === u)?.kind;
    if (kind === 'knight') {
      rc(ctx, ox, oy, 5, 4, 6, 4, '#c0c6d6');
      rc(ctx, ox, oy, 5, 4, 6, 1, '#f0f4ff');
      rc(ctx, ox, oy, 7, 1, 2, 3, '#d83a3a');
      rc(ctx, ox, oy, 5, 11, 6, 4, '#aab0c0');
      rc(ctx, ox, oy, 4, 11, 1, 6, '#c03030');
      weaponArt(ctx, ox, oy, dir, 'steel_sword', false);
      if (dir !== 1) rc(ctx, ox, oy, dir === 3 ? 11 : 2, 10, 3, 5, '#b83030');
    } else if (kind === 'smith') {
      rc(ctx, ox, oy, 6, 11, 4, 5, '#6a4a2a');
      rc(ctx, ox, oy, 6, 11, 4, 1, '#8a6a44');
      const sx = dir === 3 ? 2 : 13;
      rc(ctx, ox, oy, sx, 9, 1, 6, '#6a4a2a');
      rc(ctx, ox, oy, sx - 1, 8, 3, 2, '#7a7a88');
    } else if (kind === 'witch') {
      rc(ctx, ox, oy, 7, 0, 2, 2, '#4a2a6a');
      rc(ctx, ox, oy, 6, 2, 4, 2, '#5a3a7a');
      rc(ctx, ox, oy, 4, 4, 8, 2, '#3a1a5a');
      rc(ctx, ox, oy, 5, 11, 6, 5, '#6a3a8a');
      const sx = dir === 3 ? 2 : 13;
      rc(ctx, ox, oy, sx, 4, 1, 14, '#6a4a2a');
      rc(ctx, ox, oy, sx - 1, 2, 3, 2, '#5ad06a');
    }
  }
}

export function drawTorch(ctx: Ctx, g: Game, u: Unit, ox: number, oy: number, dir: number) {
  const tx = dir === 3 ? 12 : 2;
  const f = (Math.floor(g.waterT * 9) + u.id) & 3;
  rc(ctx, ox, oy, tx, 10, 1, 5, '#5a3a1a');
  rc(ctx, ox, oy, tx - (f & 1), 7, 3, 3, '#e8541c');
  rc(ctx, ox, oy, tx, 6 + (f >> 1), 1, 3, '#ff9a2a');
  rc(ctx, ox, oy, tx, 8, 1, 1, '#ffe680');
}

export function drawUnitExtras(ctx: Ctx, g: Game, u: Unit, fx: number, fy: number) {
  const L = g.life;
  if (L.follow !== null && u.fam === L.follow && (u.role === 'none' || u.role === 'soldier' || u.role === 'hunter')) {
    const t = Math.floor(g.waterT * 4) & 1;
    ctx.fillStyle = '#ffd45a';
    ctx.fillRect(Math.round(fx) - 1, Math.round(fy) - 29 - t, 3, 3);
    ctx.fillStyle = '#fff4b0';
    ctx.fillRect(Math.round(fx), Math.round(fy) - 28 - t, 1, 1);
  }
  const vis = u.role === 'visitor' ? L.visitors.find((v) => v.unit === u) : undefined;
  if (vis || u.role === 'thief' || u.role === 'bandit') {
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1018';
    const txt = vis ? vis.name + (vis.quest && !vis.quest.accepted ? ' ❗' : '') : u.role === 'thief' ? 'Вор!' : 'Разбойник!';
    ctx.strokeText(txt, fx, fy - 24);
    ctx.fillStyle = vis ? '#ffe9a8' : '#ff7a7a';
    ctx.fillText(txt, fx, fy - 24);
  }
  if (u.hp < 10 && u.hp > 0 && u.role !== 'visitor') {
    const bw = 10;
    ctx.fillStyle = '#12121a';
    ctx.fillRect(Math.round(fx - bw / 2) - 1, Math.round(fy) - 24, bw + 2, 3);
    ctx.fillStyle = '#d83a3a';
    ctx.fillRect(Math.round(fx - bw / 2), Math.round(fy) - 23, Math.round(bw * Math.max(0, u.hp / 10)), 1);
  }
}

/* ───────────── Животные ───────────── */

export function drawAnimal(ctx: Ctx, g: Game, a: Animal) {
  const fx = Math.round(a.x * TW);
  const fy = Math.round(a.y * TH);
  const left = a.dir === 3;
  ctx.save();
  ctx.translate(fx, fy);
  if (left) ctx.scale(-1, 1);
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  R(-7, -1, 14, 2, 'rgba(10,10,28,0.32)');
  const step = a.moving ? Math.floor(a.anim * 2) & 1 : 0;
  if (a.kind === 'wolf') {
    R(-6, -7, 10, 4, '#7a7e88');
    R(-6, -4, 10, 1, '#9a9ea8');
    R(-9, -8, 3, 2, '#6a6e78');
    R(-10, -9, 2, 2, '#8a8e98');
    R(3, -9, 5, 4, '#7a7e88');
    R(7, -7, 3, 2, '#5a5e68');
    R(4, -11, 1, 2, '#5a5e68');
    R(6, -11, 1, 2, '#5a5e68');
    R(6, -8, 1, 1, a.state === 'chase' ? '#ff4040' : '#ffe27a');
    R(-5, -3, 1, 3 - step, '#5a5e68');
    R(-2, -3, 1, 2 + step, '#5a5e68');
    R(1, -3, 1, 3 - step, '#5a5e68');
    R(3, -3, 1, 2 + step, '#5a5e68');
  } else if (a.kind === 'bear') {
    R(-8, -12, 15, 8, '#5a3a22');
    R(-8, -12, 15, 2, '#744a2c');
    R(5, -14, 7, 6, '#5a3a22');
    R(11, -11, 3, 3, '#a47a52');
    R(6, -16, 2, 2, '#4a2e18');
    R(10, -16, 2, 2, '#4a2e18');
    R(9, -12, 1, 1, a.state === 'chase' ? '#ff4040' : '#101010');
    R(-7, -4, 3, 4 - step, '#4a2e18');
    R(-2, -4, 3, 3 + step, '#4a2e18');
    R(2, -4, 3, 4 - step, '#4a2e18');
    R(6, -4, 3, 3 + step, '#4a2e18');
  } else {
    R(-5, -8, 9, 4, '#b88a5a');
    R(-5, -5, 9, 1, '#d8b080');
    R(-7, -8, 2, 2, '#f0f0e0');
    R(3, -13, 2, 6, '#b88a5a');
    R(4, -14, 4, 3, '#b88a5a');
    R(7, -13, 1, 1, '#101010');
    R(5, -17, 1, 3, '#7a5a30');
    R(7, -17, 1, 3, '#7a5a30');
    R(-4, -4, 1, 4 - step, '#8a6a40');
    R(-1, -4, 1, 3 + step, '#8a6a40');
    R(1, -4, 1, 4 - step, '#8a6a40');
    R(3, -4, 1, 3 + step, '#8a6a40');
  }
  ctx.restore();
  if (a.hp < a.maxhp) {
    const bw = 12;
    ctx.fillStyle = '#12121a';
    ctx.fillRect(fx - bw / 2 - 1, fy - (a.kind === 'bear' ? 20 : 17), bw + 2, 3);
    ctx.fillStyle = '#d83a3a';
    ctx.fillRect(fx - bw / 2, fy - (a.kind === 'bear' ? 19 : 16), Math.round(bw * Math.max(0, a.hp / a.maxhp)), 1);
  }
}

/* ───────────── Кладбище ───────────── */

export function drawGraves(ctx: Ctx, g: Game, b: Building) {
  const gs = g.life.graves.filter((q) => q.cem === b.id);
  const bottom = (b.y + b.h) * TH;
  for (const gr of gs) {
    const col = gr.slot % 6;
    const row = Math.floor(gr.slot / 6);
    const x = Math.round(b.x * TW + 8 + col * 7);
    const y = Math.round(bottom - 12 + row * 6);
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(x - 2, y, 5, 1);
    ctx.fillStyle = gr.hero ? '#ffd860' : '#b8b0a0';
    ctx.fillRect(x, y - 5, 1, 5);
    ctx.fillRect(x - 1, y - 4, 3, 1);
    if (g.life.memory > 8 && (gr.id + Math.floor(g.waterT)) % 5 === 0) {
      ctx.fillStyle = '#ff8aa8';
      ctx.fillRect(x + 1, y - 1, 1, 1);
    }
  }
}

/* ───────────── Захваченные земли ───────────── */

export function drawClaims(ctx: Ctx, g: Game, left: number, top: number, vw: number, vh: number) {
  for (const c of g.life.claims) {
    const x = c.x * TW + 8;
    const y = (c.y + 1) * TH;
    if (x < left - 30 || x > left + vw + 30 || y < top - 30 || y > top + vh + 40) continue;
    let col = '#ffd45a';
    if (c.owner !== 0) {
      const t = g.towns.find((q) => q.id === c.owner);
      col = t ? SPECS[t.spec].color : '#ffffff';
    }
    const wave = Math.floor(g.waterT * 3 + c.id) & 1;
    ctx.fillStyle = '#2a1c10';
    ctx.fillRect(x - 1, y - 16, 3, 16);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(x, y - 16, 1, 16);
    ctx.fillStyle = col;
    ctx.fillRect(x + 1, y - 16, 7, 4 + wave);
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(x + 1, y - 12 + wave, 7, 1);
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(x - 3, y - 1, 7, 2);
  }
}

export function drawClaimGhost(ctx: Ctx, g: Game) {
  const tx = Math.floor(g.mouse.wx / TW);
  const ty = Math.floor(g.mouse.wy / TH);
  const why = claimWhy(g, tx, ty);
  const col = why ? '#ff6a6a' : '#7dff8c';
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = col;
  for (let y = -5; y <= 5; y++)
    for (let x = -5; x <= 5; x++) {
      if (Math.hypot(x + 0.5 - 0.5, (y + 0.5 - 0.5) * 1.15) > 5) continue;
      const xx = tx + x;
      const yy = ty + y;
      if (xx < 0 || yy < 0 || xx >= g.world.w || yy >= g.world.h) continue;
      if (g.world.biome[yy * g.world.w + xx] <= 1) continue;
      ctx.fillRect(xx * TW, yy * TH, TW, TH);
    }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.strokeRect(tx * TW + 0.5, ty * TH + 0.5, TW - 1, TH - 1);
}

/* ───────────── Ночь: факелы и окна ───────────── */

function lit(g: Game, b: Building): boolean {
  const h = g.dayT * 24;
  const p = h >= 20 && h < 23 ? 0.9 : h >= 23 || h < 1 ? 0.45 : h < 4 ? 0.12 : h < 6 ? 0.4 : h >= 18 ? 0.75 : 0;
  const slot = Math.floor(h / 1.5);
  const hv = Math.abs(Math.sin((b.id + 1) * 12.9898 + slot * 78.233) * 43758.5453) % 1;
  return hv < p;
}

export interface LightSrc {
  x: number;
  y: number;
  r: number;
}

export function nightLights(g: Game): LightSrc[] {
  const out: LightSrc[] = [];
  for (const b of g.buildings) {
    if (!b.done || BUILDINGS[b.type].housing <= 0 || b.type === 'camp') continue;
    const bottom = (b.y + b.h) * TH;
    out.push({ x: b.x * TW - 3, y: bottom - 5, r: 24 });
    if (lit(g, b)) out.push({ x: b.x * TW + (b.w * TW) / 2, y: bottom - 12, r: 15 });
  }
  return out;
}

export function drawNightWorld(ctx: Ctx, g: Game, left: number, top: number, vw: number, vh: number) {
  for (const b of g.buildings) {
    if (!b.done || BUILDINGS[b.type].housing <= 0 || b.type === 'camp') continue;
    const x0 = b.x * TW;
    const bottom = (b.y + b.h) * TH;
    if (x0 < left - 50 || x0 > left + vw + 50 || bottom < top - 20 || bottom > top + vh + 60) continue;
    const s = g.bspr.cv[b.type];
    // факел у двери
    const f = (Math.floor(g.waterT * 9) + b.id) & 3;
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x0 - 3, bottom - 6, 1, 6);
    ctx.fillStyle = '#e8541c';
    ctx.fillRect(x0 - 4 - (f & 1), bottom - 9, 3, 3);
    ctx.fillStyle = '#ff9a2a';
    ctx.fillRect(x0 - 3, bottom - 10 + (f >> 1), 1, 3);
    ctx.fillStyle = '#ffe680';
    ctx.fillRect(x0 - 3, bottom - 8, 1, 1);
    // освещённые окна
    if (!lit(g, b)) continue;
    const cx = x0 + (b.w * TW) / 2;
    const wy = bottom - Math.round(s.height * 0.34);
    const dx = b.w === 1 ? 0 : Math.round(b.w * TW * 0.2);
    for (const sx of b.w === 1 ? [0] : [-dx, dx]) {
      ctx.fillStyle = '#5a3a14';
      ctx.fillRect(Math.round(cx + sx) - 3, wy - 1, 6, 6);
      ctx.fillStyle = '#ffd36a';
      ctx.fillRect(Math.round(cx + sx) - 2, wy, 4, 4);
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(Math.round(cx + sx) - 2, wy, 2, 2);
    }
  }
}

/* ───────────── Отряд в походе: люди, а не «кучка» ───────────── */

void isRunning;
export function drawFormation(ctx: Ctx, g: Game, m: March, px: number, py: number, dir: number, col: string) {
  const shown = Math.min(10, Math.max(1, m.phase === 'back' ? m.survivors : m.n));
  const members = m.members ?? [];
  const back = dir === 3 ? 1 : -1;
  const list: { x: number; y: number; i: number }[] = [];
  for (let i = 0; i < shown; i++) {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    list.push({ i, x: back * row * 9 + (row % 2 ? 2 : -1) * 0, y: side * (4 + (row % 2)) + ((i * 7) % 3) - 1 });
  }
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    const mem = members[e.i];
    const look = mem?.look ?? { skin: e.i % 3, hair: (e.i * 2) % 6, cloth: m.incoming ? 2 : 3, female: false, style: 0, outfit: 0, beard: e.i % 3 === 0, acc: 0 };
    const frame = [1, 0, 2, 0][(Math.floor(g.waterT * 6) + e.i) & 3];
    const sx = Math.round(px + e.x - 8);
    const sy0 = Math.round(py + e.y - 19);
    const sy = sy0 + (frame === 0 ? -1 : 0);
    const spr = personSprite(look, dir, frame, 0, false);
    drawShadow(ctx, g, spr, sx + 8, sy0 + 20, 0.8);
    drawContact(ctx, sx + 8, sy0 + 19, 4, 0.3);
    ctx.save();
    ctx.translate(sx + 8, sy0 + 20);
    ctx.transform(1, 0, dir === 3 ? 0.1 : dir === 2 ? -0.1 : 0, 1, 0, 0);
    ctx.translate(-(sx + 8), -(sy0 + 20));
    ctx.drawImage(spr, sx, sy);
    const soldier = (mem ?? ({ role: 'soldier' } as Unit)) as Unit;
    const tmp = { ...soldier, role: m.incoming ? 'bandit' : 'soldier', gear: mem?.gear ?? { weapon: 'spear', armor: null, shield: e.i % 2 === 0, horse: false }, hero: mem?.hero, id: mem?.id ?? e.i } as Unit;
    drawRoleGear(ctx, g, tmp, sx, sy, dir, false);
    ctx.restore();
  }
  // знаменосец впереди — знамя колышется по ветру
  drawFlag(ctx, g, Math.round(px + back * -10), Math.round(py) - 11, col, 1.3);
  if (shown < (m.phase === 'back' ? m.survivors : m.n)) {
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1018';
    const t = `×${m.phase === 'back' ? m.survivors : m.n}`;
    ctx.strokeText(t, px, py - 38);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(t, px, py - 38);
  }
}
