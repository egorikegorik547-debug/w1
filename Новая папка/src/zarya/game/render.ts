import { BUILDINGS, TH, TW } from './data';
import type { Building, Game, Unit } from './game';
import { RANKS, SPECS } from './meta';
import type { March } from './towns';
import { TOOL_OF } from './game';
import { hash2, ValueNoise } from './rng';
import { mk, personSprite, type Cv } from './sprites';
import { drawCart, drawGear, hasBasketLoad, hasCart } from './gear';
import { corveeTool, isStateOwner } from './social';
import { estateSpot } from './social';
import { drawAnimal, drawClaimGhost, drawClaims, drawFormation, drawGraves, drawNightWorld, drawRoleGear, drawTorch, drawUnitExtras, nightLights } from './lifeRender';
import type { Animal } from './life';
import type { Obj } from './worldgen';
import { FLAG_BUILDINGS, bloom, colorGrade, drawAmbient, drawContact, drawEmote, drawFlag, drawGroundLife, drawPrints, drawShadow, drawSlash, drawSweat, godRays, isRunning, windAt } from './fx';
import { FIELD_PATCHES } from './social';

let markCv: Cv | null = null;
function getMark(): Cv {
  if (markCv) return markCv;
  const c = mk(11, 12);
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a4a1a';
  g.fillRect(0, 0, 11, 10);
  g.fillStyle = '#fff2c8';
  g.fillRect(1, 1, 9, 8);
  g.fillStyle = '#7a4a1a';
  g.fillRect(4, 10, 3, 1);
  g.fillRect(5, 11, 1, 1);
  g.fillStyle = '#7a5230';
  [
    [3, 7],
    [4, 6],
    [5, 5],
    [6, 4],
    [7, 3],
  ].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  g.fillStyle = '#a8aebc';
  g.fillRect(6, 2, 3, 2);
  g.fillStyle = '#e8ecf4';
  g.fillRect(8, 3, 1, 1);
  markCv = c;
  return c;
}

let clouds: Cv[] | null = null;
function getClouds(): Cv[] {
  if (clouds) return clouds;
  clouds = [];
  for (let k = 0; k < 4; k++) {
    const n = new ValueNoise(100 + k * 7);
    const c = mk(72, 36);
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(8,16,40,0.14)';
    for (let y = 0; y < 36; y++)
      for (let x = 0; x < 72; x++) {
        const dx = (x - 36) / 36;
        const dy = (y - 18) / 18;
        const v = n.fbm(x / 9, y / 7, 3) - (dx * dx + dy * dy) * 0.55;
        if (v > 0.32) g.fillRect(x, y, 1, 1);
      }
    clouds.push(c);
  }
  return clouds;
}

let nightCv: Cv | null = null;

function drawObj(ctx: CanvasRenderingContext2D, g: Game, o: Obj, dt: number) {
  const s = g.spr[o.spr];
  const cxo = (o.tx + 0.5) * TW;
  let dx = Math.round(cxo - s.width / 2);
  const dy = Math.round((o.ty + 0.9) * TH - s.height);
  const base = (o.ty + 0.9) * TH;
  drawShadow(ctx, g, s, cxo, base, o.kind === 'bush' ? 0.55 : o.kind === 'rock' ? 0.8 : 1, o.kind === 'bush' ? 0.7 : 1);
  if (o.kind === 'bush' && o.shake > 0) {
    // куст «подпрыгивает» и сжимается при сборе ягод
    const k = Math.max(0, o.shake) / 0.25;
    const wob = Math.sin(k * Math.PI * 3) * k;
    const sh = s.height + Math.round(wob * 2.4);
    const sw = s.width - Math.round(wob * 1.8);
    const hop = Math.round(Math.sin(k * Math.PI) * 2);
    ctx.drawImage(s, 0, 0, s.width, s.height, Math.round(cxo - sw / 2), Math.round(base - sh) - hop, sw, sh);
    o.shake -= dt;
    return;
  }
  if (o.shake > 0) {
    if ((o.kind === 'tree' || o.kind === 'palm') && o.shake > 0.25 - dt * 1.5) {
      for (let i = 0; i < 2; i++) g.particles.push({ x: cxo + (Math.random() - 0.5) * 10, y: dy + s.height * 0.35, vx: (Math.random() - 0.5) * 10, vy: -2, life: 1.1, max: 1.1, color: i ? '#8ac04a' : '#5a9a38', size: 1, grav: 12 });
    }
    dx += Math.round(Math.sin(o.shake * 70) * 1.2);
    o.shake -= dt;
  }
  if ((o.kind === 'tree' || o.kind === 'palm' || o.kind === 'bush') && o.shake <= 0) {
    const wnd = windAt(g, cxo);
    const amp = 0.45 + wnd * 1.15;
    const ph = g.waterT * 1.3 + o.tx * 0.9 + o.ty * 0.4;
    const sw1 = Math.round(Math.sin(ph) * amp);
    const sw2 = Math.round(Math.sin(ph - 0.5) * amp * 0.45);
    if (sw1 !== 0 || sw2 !== 0) {
      const h1 = Math.floor(s.height * (o.kind === 'bush' ? 0.4 : 0.38));
      const h2 = Math.floor(s.height * (o.kind === 'bush' ? 0.7 : 0.66));
      ctx.drawImage(s, 0, 0, s.width, h1, dx + sw1, dy, s.width, h1);
      ctx.drawImage(s, 0, h1, s.width, h2 - h1, dx + sw2, dy + h1, s.width, h2 - h1);
      ctx.drawImage(s, 0, h2, s.width, s.height - h2, dx, dy + h2, s.width, s.height - h2);
    } else ctx.drawImage(s, dx, dy);
  } else ctx.drawImage(s, dx, dy);
  if (o.marked) {
    const m = getMark();
    ctx.drawImage(m, Math.round((o.tx + 0.5) * TW - 5), dy - 10 + Math.round(Math.sin(g.waterT * 4 + o.tx) * 1));
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, g: Game, u: Unit) {
  if (u.sleeping) return;
  const dt = g.fdt;
  const t = g.waterT;
  const fx = u.x * TW;
  const fy = u.y * TH;
  let alpha = 1;
  if (u.spawn > 0) {
    if (u.spawn > 0.9) return;
    const k = u.spawn / 0.9;
    const inten = Math.sin((1 - k) * Math.PI);
    ctx.globalAlpha = inten * 0.55;
    ctx.fillStyle = '#fff6c0';
    ctx.fillRect(Math.round(fx - 5), Math.round(fy - 70), 10, 70);
    ctx.globalAlpha = inten * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(fx - 2), Math.round(fy - 70), 4, 70);
    ctx.globalAlpha = inten * 0.7;
    ctx.fillStyle = '#ffe27a';
    const rr = 5 + (1 - k) * 8;
    ctx.fillRect(Math.round(fx - rr), Math.round(fy - 1), Math.round(rr * 2), 2);
    ctx.globalAlpha = 1;
    if (k > 0.55) return;
    alpha = (0.55 - k) / 0.55;
  }
  const isSold = u.role === 'soldier';
  if (u.sel) {
    ctx.fillStyle = isSold ? '#6ab8ff' : '#7dff8c';
    const rx = u.child ? 6 : 8;
    for (let a = 0; a < 28; a++) {
      const tt = (a / 28) * Math.PI * 2;
      const fade = 0.55 + 0.45 * Math.sin(tt * 2 - t * 5);
      ctx.globalAlpha = fade;
      ctx.fillRect(Math.round(fx + Math.cos(tt) * rx), Math.round(fy + Math.sin(tt) * rx * 0.42), 1, 1);
    }
    ctx.globalAlpha = 1;
    if (isSold && u.order) {
      // цель приказа
      const ox = u.order.x * TW;
      const oy = u.order.y * TH;
      const col = u.order.kind === 'attack' ? '#ff5a4a' : u.order.kind === 'hold' ? '#ffe27a' : '#6ab8ff';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = col;
      if (u.order.kind !== 'hold') {
        const len = Math.hypot(ox - fx, oy - fy);
        for (let d = 4; d < len; d += 6) ctx.fillRect(Math.round(fx + ((ox - fx) * d) / len), Math.round(fy + ((oy - fy) * d) / len), 1, 1);
      }
      const bob = Math.round(Math.sin(t * 5) * 1);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(Math.round(ox) - 2, Math.round(oy) - 1 + bob, 5, 1);
      ctx.fillRect(Math.round(ox), Math.round(oy) - 3 + bob, 1, 5);
      ctx.globalAlpha = 1;
    }
  }
  let frame = 0;
  let dir = u.dir;
  let tool = 0;
  const working = (u.task.type === 'chop' || u.task.type === 'gather' || u.task.type === 'mine' || u.task.type === 'build' || u.task.type === 'corvee' || u.task.type === 'craft') && u.phase === 'work';
  const fighting = u.phase === 'work' && (u.role === 'soldier' || u.role === 'hunter');
  const ph = u.id * 1.37;
  const sp = ((u.swing % 1) + 1) % 1;
  let ox = 0;
  let oy = 0;
  let breathe = 0;
  let strike = false;
  const run = u.moving && isRunning(u);
  if (u.moving) {
    frame = [1, 0, 2, 0][Math.floor(u.anim) & 3];
    // пружинящий шаг: в контактных кадрах тело ниже, в проходных — приподнято
    oy = frame === 0 ? -1 : 0;
    if (run) oy = frame === 0 ? -2 : 0;
  } else if (fighting || working) {
    dir = u.fx;
    tool = fighting ? 3 : u.task.type === 'corvee' ? corveeTool(g.spec) : TOOL_OF[u.task.type] ?? 0;
    const fwd = dir === 3 ? -1 : dir === 2 ? 1 : 0;
    // замах долгий (0..0.8), удар быстрый (0.8..0.93), затем «замирание» на ударе
    strike = sp >= 0.8 && sp < 0.93;
    const hold = sp >= 0.93 || sp < 0.08;
    frame = sp >= 0.8 || sp < 0.08 ? 4 : 3;
    if (sp >= 0.3 && sp < 0.8) oy = -1;
    if (strike) ox = fwd;
    if (hold) {
      ox = fwd;
      oy = 1;
    }
  } else if (!u.child || true) {
    breathe = Math.sin(t * 3.6 + ph) > 0.25 ? 1 : 0;
  }
  // наклон при беге
  const ds = dir === 3 ? -1 : dir === 2 ? 1 : 0;
  const leanTarget = run ? ds * 0.15 : 0;
  u.lean = (u.lean ?? 0) + (leanTarget - (u.lean ?? 0)) * Math.min(1, dt * 14);
  const spr = personSprite(u.look, dir, frame, tool, u.child);
  // тени: длинная от солнца + контактная
  ctx.globalAlpha = alpha;
  drawShadow(ctx, g, spr, fx, fy + 1, 0.85 * alpha, 0.9);
  drawContact(ctx, fx, fy, u.child ? 4 : 5, 0.36 * alpha);
  ctx.globalAlpha = alpha;
  const px0 = Math.round(fx - 8);
  const py0 = Math.round(fy - 19);
  const rfx = Math.round(fx);
  const rfy = Math.round(fy);
  ctx.save();
  ctx.translate(ox, oy);
  if (Math.abs(u.lean) > 0.01) {
    ctx.translate(rfx, rfy);
    ctx.transform(1, 0, -u.lean, 1, 0, 0);
    ctx.translate(-rfx, -rfy);
  }
  if (breathe) {
    ctx.drawImage(spr, 0, 12, 16, 8, px0, py0 + 12, 16, 8);
    ctx.drawImage(spr, 0, 0, 16, 13, px0, py0 + 1, 16, 13);
  } else ctx.drawImage(spr, px0, py0);
  if (u.role === 'soldier' || u.role === 'hunter' || u.role === 'thief' || u.role === 'bandit' || u.role === 'visitor') drawRoleGear(ctx, g, u, px0, py0 + breathe, dir, fighting);
  else drawGear(ctx, g, u, px0, py0 + breathe, dir, working);
  if (g.nightK > 0.3 && u.role !== 'thief' && u.role !== 'bandit' && !u.child) drawTorch(ctx, g, u, px0, py0, dir);
  ctx.globalAlpha = 1;
  drawUnitExtras(ctx, g, u, fx, fy);
  const cart = hasCart(g, u);
  const basket = hasBasketLoad(g, u);
  if (cart) drawCart(ctx, g, u, fx, fy);
  if (basket) {
    ctx.fillStyle = '#d83a4a';
    const bx = dir === 2 ? px0 + 3 : dir === 3 ? px0 + 11 : px0 + 6;
    ctx.fillRect(bx, py0 + 5, 1, 1);
    ctx.fillRect(bx + 2, py0 + 5, 1, 1);
    ctx.fillRect(bx + 1, py0 + 4, 1, 1);
    ctx.fillStyle = '#ff8696';
    ctx.fillRect(bx + 1, py0 + 5, 1, 1);
  }
  if (u.carry.n > 0 && !cart && !basket) {
    const top = Math.round(fy - (u.child ? 15 : 22));
    const cx = Math.round(fx);
    if (u.carry.type === 'wood') {
      ctx.fillStyle = '#241408';
      ctx.fillRect(cx - 4, top - 1, 8, 4);
      ctx.fillStyle = '#8a5e36';
      ctx.fillRect(cx - 3, top, 6, 1);
      ctx.fillStyle = '#6a4524';
      ctx.fillRect(cx - 3, top + 1, 6, 1);
      ctx.fillStyle = '#d8aa72';
      ctx.fillRect(cx + 3, top, 1, 2);
    } else if (u.carry.type === 'stone') {
      ctx.fillStyle = '#252830';
      ctx.fillRect(cx - 3, top - 1, 6, 4);
      ctx.fillStyle = '#959cae';
      ctx.fillRect(cx - 2, top, 4, 2);
      ctx.fillStyle = '#c0c6d4';
      ctx.fillRect(cx - 2, top, 2, 1);
    } else {
      ctx.fillStyle = '#4a2e18';
      ctx.fillRect(cx - 3, top, 6, 3);
      ctx.fillStyle = '#c81e34';
      ctx.fillRect(cx - 2, top - 1, 1, 1);
      ctx.fillRect(cx, top - 1, 2, 1);
      ctx.fillStyle = '#ff8696';
      ctx.fillRect(cx - 2, top - 1, 1, 1);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (strike && (tool < 3 || fighting)) drawSlash(ctx, fx + ox, fy + oy, dir, (sp - 0.8) / 0.13, tool);
  if ((u.flee ?? 0) > 0) drawSweat(ctx, g, u, fx, fy);
  drawEmote(ctx, g, u, fx, fy);
}

function outlineRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
}

function drawBuilding(ctx: CanvasRenderingContext2D, g: Game, b: Building) {
  const s = g.bspr.cv[b.type];
  const dx = Math.round(b.x * TW + (b.w * TW) / 2 - s.width / 2);
  const dy = Math.round((b.y + b.h) * TH - s.height);
  const baseX = Math.round(b.x * TW + (b.w * TW) / 2);
  const baseY = (b.y + b.h) * TH;
  drawShadow(ctx, g, s, baseX, baseY - 1, b.done ? 0.9 : 0.4, 0.9);
  // отдача: здание «приседает» от ударов молотка
  let squashed = false;
  if ((b.hit ?? 0) > 0) {
    const k = Math.sin(((b.hit ?? 0) / 0.28) * Math.PI);
    b.hit = (b.hit ?? 0) - g.fdt;
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(1 + 0.018 * k, 1 - 0.035 * k);
    ctx.translate(-baseX, -baseY);
    squashed = true;
  }
  if (b.done) {
    ctx.drawImage(s, dx, dy);
    if (b.type === 'cemetery') drawGraves(ctx, g, b);
    const fire = g.bspr.fire[b.type];
    if (fire) {
      const f = g.flames;
      const t = Math.floor(g.waterT * 9);
      const fxx = dx + fire.x;
      const fyy = dy + fire.y;
      if (b.type === 'camp') {
        ctx.drawImage(f[(t + 1) & 3], fxx - 9, fyy - 8);
        ctx.drawImage(f[(t + 2) & 3], fxx + 0, fyy - 7);
        ctx.drawImage(f[t & 3], fxx - 5, fyy - 14);
      } else {
        ctx.drawImage(f[(t + b.id) & 3], fxx - 5, fyy - 12);
      }
    }
  } else {
    const p = Math.max(0.04, b.progress);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(s, dx, dy);
    ctx.globalAlpha = 1;
    const sh = s.height;
    const part = Math.max(1, Math.round(sh * p));
    ctx.drawImage(s, 0, sh - part, s.width, part, dx, dy + sh - part, s.width, part);
    // строительные леса с косыми балками
    const x0 = b.x * TW;
    const y1 = (b.y + b.h) * TH;
    const shk = Math.round(Math.sin(g.waterT * 30) * (b.hit ?? 0) * 3);
    ctx.fillStyle = '#8a6238';
    for (const px of [x0 + 1, x0 + b.w * TW - 2]) ctx.fillRect(px + shk, y1 - 14, 1, 14);
    ctx.fillStyle = '#c89a64';
    ctx.fillRect(x0 + 1 + shk, y1 - 14, b.w * TW - 2, 1);
    ctx.fillRect(x0 + 1, y1 - 7, b.w * TW - 2, 1);
    ctx.fillStyle = '#6a4524';
    for (let d = 0; d < b.w * TW - 4; d += 2) ctx.fillRect(x0 + 2 + d, y1 - 13 + Math.round((d / (b.w * TW - 4)) * 6), 1, 1);
    // кучки стройматериалов у фундамента
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(x0 - 3, y1 - 3, 4, 2);
    ctx.fillStyle = '#c8a070';
    ctx.fillRect(x0 - 3, y1 - 3, 4, 1);
    ctx.fillStyle = '#9aa0b0';
    ctx.fillRect(x0 + b.w * TW - 1, y1 - 3, 3, 2);
    ctx.fillStyle = '#c8ceda';
    ctx.fillRect(x0 + b.w * TW - 1, y1 - 3, 2, 1);
    // полоса прогресса
    const bw = Math.max(16, b.w * TW - 4);
    const bx = Math.round(b.x * TW + (b.w * TW) / 2 - bw / 2);
    const by = dy - 5;
    ctx.fillStyle = '#12121a';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = '#7dff8c';
    ctx.fillRect(bx, by, Math.round(bw * b.progress), 3);
    ctx.fillStyle = '#c8ffd0';
    ctx.fillRect(bx, by, Math.round(bw * b.progress), 1);
  }
  if (squashed) ctx.restore();
  if (b.done) {
    const fl = FLAG_BUILDINGS[b.type];
    if (fl) drawFlag(ctx, g, dx + s.width / 2 + fl.dx, dy + fl.dy, fl.col, fl.size);
  }
  if (g.selBuilding === b.id) outlineRect(ctx, b.x * TW - 1, b.y * TH - 1, b.w * TW + 2, b.h * TH + 2, '#7dff8c');
}

function drawMarch(ctx: CanvasRenderingContext2D, g: Game, m: March) {
  const k = Math.min(1, m.t / m.dur);
  const x0 = (m.sx + 0.5) * TW;
  const y0 = (m.sy + 0.7) * TH;
  const x1 = (m.tx + 0.5) * TW;
  const y1 = (m.ty + 0.7) * TH;
  const px = x0 + (x1 - x0) * k;
  const py = y0 + (y1 - y0) * k;
  const col = m.incoming ? '#ff6a5a' : '#ffe27a';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = col;
  const len = Math.hypot(x1 - x0, y1 - y0);
  for (let d = 0; d < len; d += 9) {
    const f = d / len;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f), 2, 1);
  }
  ctx.globalAlpha = 1;
  const dir = x1 >= x0 ? 2 : 3;
  const frame = [1, 0, 2, 0][Math.floor(g.waterT * 6) & 3];
  if (m.sea) {
    const bx = Math.round(px - 8);
    const by = Math.round(py - 10 + Math.sin(g.waterT * 3) * 0.8);
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(bx, by + 6, 16, 3);
    ctx.fillRect(bx + 2, by + 9, 12, 1);
    ctx.fillStyle = '#8a5e36';
    ctx.fillRect(bx, by + 6, 16, 1);
    ctx.fillStyle = '#6a4524';
    ctx.fillRect(bx + 7, by - 6, 1, 12);
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(bx + 8, by - 5, 6, 8);
    ctx.fillStyle = col;
    ctx.fillRect(bx + 8, by - 7, 4, 2);
    return;
  }
  drawFormation(ctx, g, m, px, py, dir, col);
  void frame;
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, title: string, sub: string, col: string, fs: number) {
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.font = `600 ${fs}px "Pixelify Sans", ui-monospace, monospace`;
  ctx.lineWidth = Math.max(3, fs * 0.28);
  ctx.strokeStyle = 'rgba(12,8,6,0.92)';
  ctx.strokeText(title, x, y);
  ctx.fillStyle = col;
  ctx.fillText(title, x, y);
  ctx.font = `500 ${Math.round(fs * 0.78)}px "Pixelify Sans", ui-monospace, monospace`;
  ctx.lineWidth = Math.max(3, fs * 0.24);
  ctx.strokeText(sub, x, y + fs * 0.95);
  ctx.fillStyle = '#f3e3c0';
  ctx.fillText(sub, x, y + fs * 0.95);
}

function drawLabels(ctx: CanvasRenderingContext2D, g: Game, left: number, top: number, s: number) {
  if (g.mode !== 'play') return;
  const fs = Math.max(11 * g.dpr, Math.round(4.3 * s));
  const camp = g.buildings[0];
  if (camp) {
    const x = ((camp.x + camp.w / 2) * TW - left) * s;
    const y = (camp.y * TH - 22 - top) * s;
    if (x > -200 && x < g.cw + 200 && y > -60 && y < g.ch + 60) {
      const n = g.totalPop();
      label(ctx, x, y, `${g.soc && g.soc.capital === null && g.stateFormed ? '👑 ' : '★ '}${g.name}`, `${RANKS[g.tierIdx].name} · ${n} чел.${g.stateFormed ? ' · Государство' : ''}`, '#ffe27a', fs + 2);
    }
  }
  for (const t of g.towns) {
    const x = ((t.x + 0.5) * TW - left) * s;
    const y = ((t.y - 4.2) * TH - top) * s;
    if (x < -200 || x > g.cw + 200 || y < -60 || y > g.ch + 60) continue;
    const mine = t.owner === 'player';
    const col = mine ? '#7dff8c' : t.attitude < 35 ? '#ff9a8a' : t.attitude < 60 ? '#ffe9a8' : '#b8f0a0';
    const isCap = g.soc && g.soc.capital === t.id;
    const gv = g.soc?.heroes.find((h) => h.id === t.governor);
    label(ctx, x, y, `${isCap ? '★ ' : ''}${SPECS[t.spec].icon} ${t.name}${mine ? ' ✔' : ''}`, `${RANKS[t.tier].name} · ${Math.floor(t.pop)}${mine ? (gv ? ` · 🎩 ${gv.name.split(' ')[0]}` : ' · без наместника') : ` · ⚔${Math.floor(t.soldiers)}`}`, isCap ? '#ffe27a' : col, fs);
  }
}

export function renderFrame(g: Game, dt: number) {
  const ctx = g.ctx;
  const s = g.scale;
  const cw = g.cw;
  const ch = g.ch;
  const w = g.world;
  const W = w.w * TW;
  const H = w.h * TH;
  const left = Math.round(g.cam.x - cw / (2 * s));
  const top = Math.round(g.cam.y - ch / (2 * s));
  g.viewLeft = left;
  g.viewTop = top;
  const vw = Math.ceil(cw / s) + 1;
  const vh = Math.ceil(ch / s) + 1;
  {
    const lt = Math.max(0, Math.min(1, 0.5 + 0.55 * Math.sin((g.dayT - 0.25) * Math.PI * 2)));
    g.nightK = Math.max(0, Math.min(1, (0.62 - lt) / 0.62));
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1a548c';
  ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(s, 0, 0, s, -left * s, -top * s);
  ctx.imageSmoothingEnabled = false;

  const sx = Math.max(0, left);
  const sy = Math.max(0, top);
  const ex = Math.min(W, left + vw);
  const ey = Math.min(H, top + vh);
  if (ex > sx && ey > sy) ctx.drawImage(g.terrain, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);

  const c0 = Math.max(0, Math.floor(left / TW) - 2);
  const c1 = Math.min(w.w - 1, Math.floor((left + vw) / TW) + 2);
  const r0 = Math.max(0, Math.floor(top / TH) - 1);
  const r1 = Math.min(w.h - 1, Math.floor((top + vh) / TH) + 6);

  // блики на воде
  const wt = Math.floor(g.waterT * 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let ty = r0; ty <= Math.min(w.h - 1, r1 - 5); ty++)
    for (let tx = c0; tx <= c1; tx++) {
      if (w.biome[ty * w.w + tx] > 1) continue;
      const hh = hash2(tx, ty, wt * 13 + 5);
      if (hh < 0.07) ctx.fillRect(tx * TW + Math.floor(hash2(tx, ty, wt) * 12), ty * TH + Math.floor(hash2(ty, tx, wt) * 9), 3, 1);
    }

  drawFoam(ctx, g, c0, c1, r0, Math.min(w.h - 1, r1 - 5));
  drawPrints(ctx, g, left, top, vw, vh);
  if (g.mode === 'play') drawEstates(ctx, g, left, top, vw, vh);
  drawGroundLife(ctx, g, c0, c1, r0, Math.min(w.h - 1, r1 - 5));
  if (g.mode === 'play') drawBorders(ctx, g, c0, c1, r0, r1);

  // подготовка рядов
  for (let r = r0; r <= r1; r++) {
    g.pre[r].length = 0;
    g.post[r].length = 0;
  }
  for (const u of g.units) {
    const row = Math.floor(u.y);
    if (row < r0 || row > r1) continue;
    const px = u.x * TW;
    if (px < left - 20 || px > left + vw + 20) continue;
    (u.y - row < 0.8 ? g.pre : g.post)[row].push(u);
  }
  for (const b of g.buildings) {
    const row = b.y + b.h - 1;
    if (row < r0 || row > r1 + 0) continue;
    if ((b.x + b.w) * TW < left - 40 || b.x * TW > left + vw + 40) continue;
    g.post[row].push(b);
  }
  for (const t of g.towns) {
    for (const b of t.bld) {
      const row = b.y + b.h - 1;
      if (row < r0 || row > r1) continue;
      if ((b.x + b.w) * TW < left - 40 || b.x * TW > left + vw + 40) continue;
      g.post[row].push(b);
    }
  }
  for (const t of g.towns) {
    for (const u of t.folk) {
      const row = Math.floor(u.y);
      if (row < r0 || row > r1) continue;
      const px = u.x * TW;
      if (px < left - 20 || px > left + vw + 20) continue;
      (u.y - row < 0.8 ? g.pre : g.post)[row].push(u);
    }
  }
  // стража, охотники-воры, странники и звери
  const L = g.life;
  const lifeUnits: Unit[] = [...g.guards, ...L.raiders.map((r) => r.unit), ...L.visitors.map((v) => v.unit)];
  for (const u of lifeUnits) {
    if (u.sleeping) continue;
    const row = Math.floor(u.y);
    if (row < r0 || row > r1) continue;
    const px = u.x * TW;
    if (px < left - 20 || px > left + vw + 20) continue;
    (u.y - row < 0.8 ? g.pre : g.post)[row].push(u);
  }
  for (const a of L.animals) {
    const row = Math.floor(a.y);
    if (row < r0 || row > r1) continue;
    const px = a.x * TW;
    if (px < left - 24 || px > left + vw + 24) continue;
    g.post[row].push(a);
  }
  const key = (e: Unit | Building | Animal) => ('look' in e ? e.y : 'kind' in e ? e.y : e.y + e.h);
  const drawEntity = (e: Unit | Building | Animal) => {
    if ('look' in e) drawUnit(ctx, g, e);
    else if ('kind' in e) drawAnimal(ctx, g, e);
    else drawBuilding(ctx, g, e);
  };
  for (let r = r0; r <= r1; r++) {
    const pre = g.pre[r];
    if (pre.length) {
      pre.sort((a, b) => key(a) - key(b));
      for (const e of pre) drawEntity(e);
    }
    const row = r * w.w;
    for (let tx = c0; tx <= c1; tx++) {
      const o = w.objs[row + tx];
      if (o) drawObj(ctx, g, o, dt);
    }
    const post = g.post[r];
    if (post.length) {
      post.sort((a, b) => key(a) - key(b));
      for (const e of post) drawEntity(e);
    }
  }

  drawAmbient(ctx, g, left, top, vw, vh);
  drawClaims(ctx, g, left, top, vw, vh);
  if (g.nightK > 0.12) drawNightWorld(ctx, g, left, top, vw, vh);

  // «пинги» приказов
  for (const p of g.pings) {
    const k = p.t / 0.7;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 3 + k * 12, (3 + k * 12) * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // походы армий
  for (const m of g.marches) drawMarch(ctx, g, m);

  // подсветка наведения
  if (g.mode === 'play' && g.mouse.inside) {
    if (g.tool === 'chop' || g.tool === 'gather' || g.tool === 'mine') {
      const o = g.hoverObj;
      if (o) outlineRect(ctx, o.tx * TW, o.ty * TH, TW, TH, '#ffe27a');
    }
    if (g.tool === 'claim') drawClaimGhost(ctx, g);
    if (g.tool === 'estate') {
      const ex = Math.round(g.mouse.wx / TW - 1.5);
      const ey = Math.round(g.mouse.wy / TH - 1.5);
      const why = estateSpot(g, ex, ey);
      const okc = !why && g.res.gold >= 30 && g.res.wood >= 40;
      ctx.fillStyle = okc ? 'rgba(255,226,122,0.28)' : 'rgba(255,70,70,0.34)';
      ctx.fillRect(ex * TW, ey * TH, 3 * TW, 3 * TH);
      outlineRect(ctx, ex * TW, ey * TH, 3 * TW, 3 * TH, okc ? '#ffe27a' : '#ff6a6a');
      const sp = g.bspr.cv.manor;
      if (sp) {
        ctx.globalAlpha = 0.65;
        ctx.drawImage(sp, Math.round(ex * TW + (3 * TW) / 2 - sp.width / 2), Math.round((ey + 3) * TH - sp.height));
        ctx.globalAlpha = 1;
      }
    }
    if (g.tool === 'build' && g.buildType) {
      const def = BUILDINGS[g.buildType];
      const gp = g.ghostPos();
      const why = g.canPlace(g.buildType, gp.x, gp.y);
      const okc = !why && g.canAfford(g.buildType);
      ctx.fillStyle = okc ? 'rgba(90,255,120,0.32)' : 'rgba(255,70,70,0.36)';
      ctx.fillRect(gp.x * TW, gp.y * TH, def.w * TW, def.h * TH);
      outlineRect(ctx, gp.x * TW, gp.y * TH, def.w * TW, def.h * TH, okc ? '#7dff8c' : '#ff6a6a');
      const sp = g.bspr.cv[g.buildType];
      ctx.globalAlpha = 0.62;
      ctx.drawImage(sp, Math.round(gp.x * TW + (def.w * TW) / 2 - sp.width / 2), Math.round((gp.y + def.h) * TH - sp.height));
      ctx.globalAlpha = 1;
    }
  }

  // облачные тени
  if (g.mode) {
    const cl = getClouds();
    for (let i = 0; i < 5; i++) {
      const sp = cl[i % cl.length];
      const cwid = sp.width * 3;
      const px = ((i * 523 + g.waterT * 3.2) % (W + cwid * 2)) - cwid;
      const py = (i * 397) % (H - 60);
      if (px + cwid < left || px > left + vw || py + sp.height * 3 < top || py > top + vh) continue;
      ctx.drawImage(sp, Math.round(px), Math.round(py), cwid, sp.height * 3);
    }
  }

  // частицы
  for (const p of g.particles) {
    const a = Math.max(0, Math.min(1, p.life / p.max));
    ctx.globalAlpha = a;
    if (p.text) {
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1a1018';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      const sz = p.size + (p.grow ? (1 - a) * p.grow : 0);
      ctx.fillRect(Math.round(p.x - (sz - p.size) / 2), Math.round(p.y - (sz - p.size) / 2), Math.round(sz), Math.round(sz));
    }
  }
  ctx.globalAlpha = 1;

  // ---- экранные эффекты ----
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  const light = Math.max(0, Math.min(1, 0.5 + 0.55 * Math.sin((g.dayT - 0.25) * Math.PI * 2)));
  const nightness = Math.max(0, Math.min(1, (0.62 - light) / 0.62));
  if (nightness > 0.01) {
    const q = 5;
    const nw = Math.ceil(cw / q);
    const nh = Math.ceil(ch / q);
    if (!nightCv) nightCv = mk(nw, nh);
    if (nightCv.width !== nw || nightCv.height !== nh) {
      nightCv.width = nw;
      nightCv.height = nh;
    }
    const n = nightCv.getContext('2d')!;
    n.globalCompositeOperation = 'source-over';
    const dusk = Math.max(0, 1 - Math.abs(light - 0.4) / 0.28);
    const rr = Math.round(12 + dusk * 60);
    const gg = Math.round(18 + dusk * 14);
    const bb = Math.round(52 - dusk * 6);
    n.clearRect(0, 0, nw, nh);
    n.fillStyle = `rgba(${rr},${gg},${bb},${0.64 * nightness})`;
    n.fillRect(0, 0, nw, nh);
    n.globalCompositeOperation = 'destination-out';
    const glow: { x: number; y: number; r: number }[] = [];
    for (const b of g.buildings) {
      const d = BUILDINGS[b.type];
      if (!b.done || !d.light) continue;
      const rad = b.type === 'camp' ? 110 : b.type === 'hall' ? 100 : b.type === 'shrine' ? 80 : 64;
      glow.push({ x: ((b.x + b.w / 2) * TW - left) * s, y: ((b.y + b.h - 0.6) * TH - top) * s, r: rad * s });
    }
    for (const b of g.buildings) {
      if (!b.done || BUILDINGS[b.type].housing <= 0 || b.type === 'camp') continue;
      glow.push({ x: ((b.x + b.w / 2) * TW - left) * s, y: ((b.y + b.h - 0.6) * TH - top) * s, r: 30 * s });
    }
    const torch = g.done.has('fire');
    for (const u of g.units) if (!u.sleeping) glow.push({ x: (u.x * TW - left) * s, y: (u.y * TH - 8 - top) * s, r: (torch ? 26 : 14) * s });
    for (const u of g.guards) if (!u.sleeping) glow.push({ x: (u.x * TW - left) * s, y: (u.y * TH - 8 - top) * s, r: 30 * s });
    for (const v of g.life.visitors) glow.push({ x: (v.unit.x * TW - left) * s, y: (v.unit.y * TH - 8 - top) * s, r: 24 * s });
    for (const l of nightLights(g)) glow.push({ x: (l.x - left) * s, y: (l.y - top) * s, r: l.r * s });
    for (const t of g.towns) for (const u of t.folk) if (u.role === 'guard') glow.push({ x: (u.x * TW - left) * s, y: (u.y * TH - 8 - top) * s, r: 18 * s });
    for (const gl of glow) {
      const x = gl.x / q;
      const y = gl.y / q;
      const r = gl.r / q;
      if (x < -r || y < -r || x > nw + r || y > nh + r) continue;
      const gr = n.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,0.95)');
      gr.addColorStop(0.5, 'rgba(0,0,0,0.5)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      n.fillStyle = gr;
      n.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.drawImage(nightCv, 0, 0, cw, ch);
    // тёплое свечение огней
    ctx.globalCompositeOperation = 'lighter';
    for (const b of g.buildings) {
      const d = BUILDINGS[b.type];
      if (!b.done || !d.light) continue;
      const x = ((b.x + b.w / 2) * TW - left) * s;
      const y = ((b.y + b.h - 0.6) * TH - top) * s;
      const r = (b.type === 'camp' ? 70 : 42) * s;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(255,150,60,${0.28 * nightness})`);
      gr.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  } else if (light < 0.85 && light > 0.62) {
    // лёгкая тёплая дымка на закате/рассвете
    ctx.fillStyle = `rgba(255,170,90,${(0.85 - light) * 0.08})`;
    ctx.fillRect(0, 0, cw, ch);
  }

  if (g.mode === 'play') postFx(ctx, g, cw, ch, light, nightness);
  else vignette(ctx, cw, ch, 0.3);

  drawLabels(ctx, g, left, top, s);

  // рамка выделения
  if (g.drag && g.mode === 'play') {
    const d = g.drag;
    const x = Math.min(d.sx, g.mouse.sx);
    const y = Math.min(d.sy, g.mouse.sy);
    const bw = Math.abs(g.mouse.sx - d.sx);
    const bh = Math.abs(g.mouse.sy - d.sy);
    if (bw > 4 || bh > 4) {
      const col = g.tool === 'chop' ? '255,160,70' : g.tool === 'gather' ? '255,110,140' : g.tool === 'mine' ? '190,200,220' : '125,255,140';
      ctx.fillStyle = `rgba(${col},0.16)`;
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = `rgb(${col})`;
      ctx.lineWidth = Math.max(1, Math.round(g.dpr));
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, bw, bh);
    }
  }
  ctx.imageSmoothingEnabled = false;

  // курсор
  let cur = 'default';
  if (g.mode === 'play') {
    if (g.tool === 'chop' || g.tool === 'gather' || g.tool === 'mine' || g.tool === 'claim') cur = 'crosshair';
    else if (g.tool === 'build') cur = 'cell';
    else if (g.hoverUnit || g.hoverBuilding || g.hoverTown) cur = 'pointer';
    else if (g.hoverObj && g.selUnits().length) cur = 'pointer';
  }
  if (g.canvas.style.cursor !== cur) g.canvas.style.cursor = cur;
}


/* ───────────── Новая графика и слои карты ───────────── */

function drawFoam(ctx: CanvasRenderingContext2D, g: Game, c0: number, c1: number, r0: number, r1: number) {
  const w = g.world;
  const t = g.waterT;
  for (let ty = Math.max(1, r0); ty <= Math.min(w.h - 2, r1); ty++)
    for (let tx = Math.max(1, c0); tx <= Math.min(w.w - 2, c1); tx++) {
      const i = ty * w.w + tx;
      if (w.biome[i] > 1) continue;
      const up = w.biome[i - w.w] > 1;
      const dn = w.biome[i + w.w] > 1;
      const lf = w.biome[i - 1] > 1;
      const rt = w.biome[i + 1] > 1;
      if (!up && !dn && !lf && !rt) continue;
      const a = 0.28 + 0.22 * Math.sin(t * 2.2 + tx * 0.9 + ty * 0.6);
      ctx.fillStyle = `rgba(235,250,255,${a})`;
      const x = tx * TW;
      const y = ty * TH;
      const off = Math.round(Math.sin(t * 1.6 + tx + ty) * 1);
      if (up) ctx.fillRect(x + 1, y + 1 + off, TW - 2, 1);
      if (dn) ctx.fillRect(x + 1, y + TH - 2 - off, TW - 2, 1);
      if (lf) ctx.fillRect(x + 1 + off, y + 1, 1, TH - 2);
      if (rt) ctx.fillRect(x + TW - 2 - off, y + 1, 1, TH - 2);
    }
}

function drawEstates(ctx: CanvasRenderingContext2D, g: Game, left: number, top: number, vw: number, vh: number) {
  if (!g.soc) return;
  const w = g.world;
  const spec = g.spec;
  const t = g.waterT;
  const kind: 'grain' | 'wood' | 'ore' = spec === 'miner' ? 'ore' : spec === 'lumber' ? 'wood' : 'grain';
  const soil = kind === 'ore' ? '#6a6a72' : kind === 'wood' ? '#3f6e32' : '#6a4626';
  const soilL = kind === 'ore' ? '#7e7e88' : kind === 'wood' ? '#4a7e3a' : '#7a5230';
  const furrow = kind === 'ore' ? '#4a4a54' : kind === 'wood' ? '#2a4a22' : '#3a2410';
  for (const e of g.soc.estates) {
    if ((e.bx + 12) * TW < left || (e.bx - 8) * TW > left + vw || (e.by + 9) * TH < top || (e.by - 1) * TH > top + vh) continue;
    for (const [dx, dy, pw, ph] of FIELD_PATCHES) {
      for (let y = 0; y < ph; y++)
        for (let x = 0; x < pw; x++) {
          const tx = e.bx + dx + x;
          const ty = e.by + dy + y;
          if (tx < 1 || ty < 1 || tx >= w.w - 1 || ty >= w.h - 1) continue;
          const i = ty * w.w + tx;
          if (w.biome[i] <= 2 || w.blocked[i] || w.objs[i]) continue;
          const X = tx * TW;
          const Y = ty * TH;
          const hh = hash2(tx, ty, 311);
          const pulse = g.fieldPulse.get(i) ?? 0;
          ctx.globalAlpha = e.riot > 0 ? 0.5 : 0.95;
          ctx.fillStyle = hh < 0.5 ? soil : soilL;
          ctx.fillRect(X, Y, TW, TH);
          // борозды
          ctx.fillStyle = furrow;
          for (let r = 2; r < TH; r += 3) ctx.fillRect(X, Y + r, TW, 1);
          ctx.globalAlpha *= 0.5;
          ctx.fillStyle = '#ffffff';
          for (let r = 1; r < TH; r += 3) ctx.fillRect(X + 1, Y + r, TW - 2, 1);
          ctx.globalAlpha = e.riot > 0 ? 0.5 : 1;
          // края грядки
          if (x === 0) {
            ctx.fillStyle = furrow;
            ctx.fillRect(X, Y, 1, TH);
          }
          if (y === 0) ctx.fillRect(X, Y, TW, 1);
          const wind = windAt(g, X);
          if (kind === 'grain') {
            const ripe = hh > 0.35;
            for (let r = 0; r < 3; r++) {
              const ry = Y + 2 + r * 3;
              for (let k = 0; k < 4; k++) {
                const px = X + 2 + k * 4 + (r % 2);
                const bend = Math.round(Math.sin(t * 2.4 + tx * 0.9 + k * 0.7 + r) * (0.45 + wind * 1.0) + Math.sin(t * 20 + k) * pulse * 1.2);
                const hgt = ripe ? 4 : 2;
                const cut = pulse > 0.5 ? 1 : 0;
                ctx.fillStyle = ripe ? '#7aa84a' : '#6ec040';
                ctx.fillRect(px, ry - hgt + 1 + cut, 1, hgt - cut);
                if (ripe) {
                  ctx.fillStyle = pulse > 0.3 ? '#fff0a0' : '#e8c448';
                  ctx.fillRect(px + bend, ry - hgt - 1 + cut, 1, 2);
                  ctx.fillStyle = '#b88a24';
                  ctx.fillRect(px + bend + (bend ? 0 : 1), ry - hgt + cut, 1, 1);
                } else {
                  ctx.fillStyle = '#a4ec5a';
                  ctx.fillRect(px + bend, ry - hgt + cut, 1, 1);
                }
              }
            }
          } else if (kind === 'wood') {
            for (let k = 0; k < 2; k++) {
              const px = X + 4 + k * 8;
              const py = Y + 9 - (hh > 0.5 ? 0 : 1);
              const bend = Math.round(Math.sin(t * 2.2 + tx + k) * (0.4 + wind * 1.0) + Math.sin(t * 22 + k) * pulse * 1.3);
              ctx.fillStyle = '#4a2e18';
              ctx.fillRect(px, py - 1, 1, 2);
              ctx.fillStyle = '#2f7a34';
              ctx.fillRect(px - 1, py - 2, 3, 1);
              ctx.fillRect(px - 1 + Math.min(bend, 0), py - 3, 2 + Math.abs(bend) * 0, 1);
              ctx.fillStyle = '#4aa44a';
              ctx.fillRect(px + bend, py - 4, 1, 1);
              ctx.fillRect(px, py - 3, 1, 1);
              ctx.fillStyle = '#7ad07a';
              ctx.fillRect(px + bend, py - 4, 1, 1);
            }
          } else {
            for (let k = 0; k < 3; k++) {
              const px = X + 2 + k * 5 + Math.floor(hash2(tx, ty, 320 + k) * 2);
              const py = Y + 4 + ((k * 3 + tx) % 5);
              ctx.fillStyle = '#3a3a44';
              ctx.fillRect(px, py, 3, 2);
              ctx.fillStyle = '#9a9aa8';
              ctx.fillRect(px, py, 2, 1);
              if (hh + k * 0.13 > 0.7) {
                const tw = Math.floor(t * 4 + tx + k) & 3;
                ctx.fillStyle = tw === 0 ? '#fff6a0' : '#e8b840';
                ctx.fillRect(px + 2, py - 1, 1, 1);
              }
            }
          }
          if (pulse > 0.45) {
            ctx.globalAlpha = Math.min(0.5, pulse * 0.45);
            ctx.fillStyle = '#fff4c0';
            ctx.fillRect(X + 2, Y + 3, TW - 4, TH - 6);
          }
          ctx.globalAlpha = 1;
        }
    }
  }
  ctx.globalAlpha = 1;
}

function drawBorders(ctx: CanvasRenderingContext2D, g: Game, c0: number, c1: number, r0: number, r1: number) {
  const T = g.terr;
  if (!T || g.borderMode === 'off') return;
  const mode = g.borderMode;
  const pulse = 0.72 + 0.2 * Math.sin(g.waterT * 2.4);
  const grp = (o: number) => (mode === 'state' ? (isStateOwner(g, o) ? 1 : 0) : o);
  const colOf = (o: number) => {
    if (mode === 'state') return '#ffd45a';
    if (o === 1) return '#7dff8c';
    const t = g.towns[o - 2];
    if (!t) return '#ffffff';
    return t.owner === 'player' ? '#b8ffd0' : SPECS[t.spec].color;
  };
  const th = mode === 'state' ? 2 : 1;
  for (let ty = Math.max(0, r0); ty <= Math.min(T.h - 1, r1); ty++)
    for (let tx = Math.max(0, c0); tx <= Math.min(T.w - 1, c1); tx++) {
      const o = T.owner[ty * T.w + tx];
      if (!o) continue;
      if (mode === 'state' && !isStateOwner(g, o)) continue;
      const col = colOf(o);
      const x = tx * TW;
      const y = ty * TH;
      ctx.globalAlpha = mode === 'state' ? 0.1 : 0.08;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, TW, TH);
      ctx.globalAlpha = pulse;
      const nb = (dx: number, dy: number) => {
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= T.w || ny >= T.h) return 0;
        return T.owner[ny * T.w + nx];
      };
      const me = grp(o);
      if (grp(nb(0, -1)) !== me) ctx.fillRect(x, y, TW, th);
      if (grp(nb(0, 1)) !== me) ctx.fillRect(x, y + TH - th, TW, th);
      if (grp(nb(-1, 0)) !== me) ctx.fillRect(x, y, th, TH);
      if (grp(nb(1, 0)) !== me) ctx.fillRect(x + TW - th, y, th, TH);
    }
  ctx.globalAlpha = 1;
}

function vignette(ctx: CanvasRenderingContext2D, cw: number, ch: number, k: number) {
  const gr = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.42, cw / 2, ch / 2, Math.max(cw, ch) * 0.78);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, `rgba(6,8,20,${k})`);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, cw, ch);
}

function postFx(ctx: CanvasRenderingContext2D, g: Game, cw: number, ch: number, light: number, night: number) {
  const t = g.waterT;
  const dusk = Math.max(0, 1 - Math.abs(light - 0.45) / 0.3);
  // цветокоррекция: тёплый день, оранжевые закаты
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = `rgba(255,${Math.round(214 - dusk * 60)},${Math.round(150 - dusk * 50)},${(0.16 + dusk * 0.3) * (1 - night * 0.8)})`;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = 'source-over';
  colorGrade(ctx, cw, ch, night);
  godRays(ctx, g, cw, ch, light, Math.min(1, Math.max(0, Math.sin(t * 0.017 + 2.1) - 0.64) * 2.7));
  // дождь
  const rain = Math.max(0, Math.sin(t * 0.017 + 2.1) - 0.64) * 2.7;
  if (rain > 0.03) {
    ctx.fillStyle = `rgba(24,36,70,${0.2 * Math.min(1, rain)})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = `rgba(190,215,255,${0.32 * Math.min(1, rain)})`;
    ctx.lineWidth = Math.max(1, g.dpr);
    ctx.beginPath();
    const n = Math.floor(150 * Math.min(1, rain));
    for (let i = 0; i < n; i++) {
      const x = ((i * 97.13) % cw + t * 70 * g.dpr) % cw;
      const y = ((i * 53.71) % ch + t * 640 * g.dpr + (i % 7) * 40) % ch;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3 * g.dpr, y + 11 * g.dpr);
    }
    ctx.stroke();
  }
  // светлячки ночью
  if (night > 0.4) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const x = ((i * 131.7) % cw) + Math.sin(t * 0.7 + i * 1.3) * 34 * g.dpr;
      const y = ((i * 71.3) % ch) + Math.cos(t * 0.5 + i) * 22 * g.dpr;
      const a = (0.35 + 0.5 * Math.sin(t * 3 + i * 2)) * night;
      if (a <= 0) continue;
      const r = 5 * g.dpr;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(220,255,120,${a})`);
      gr.addColorStop(1, 'rgba(220,255,120,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  bloom(ctx, cw, ch, 0.16 + night * 0.22);
  vignette(ctx, cw, ch, 0.34 + night * 0.12);
}
