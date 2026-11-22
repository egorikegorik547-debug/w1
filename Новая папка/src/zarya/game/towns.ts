import { B, BUILDINGS, TH, TW, type BuildingId } from './data';
import { MAP_SIZES, RANKS, SPECS, SPEC_ORDER, TOWN_NAMES, rankIdx, type SpecId } from './meta';
import type { Building, Game, Unit } from './game';
import { DIFFS, addCaptives, govFx, heroOf } from './social';
import { battleLosses, bestWeaponInStock, enlist, lifeArmyPower, restoreGuards, takeGuards } from './life';

export interface Town {
  id: number;
  name: string;
  x: number;
  y: number;
  spec: SpecId;
  pop: number;
  soldiers: number;
  stock: { food: number; wood: number; stone: number; gold: number };
  attitude: number;
  aggr: number;
  loyalty: number;
  loyBase: number;
  owner: 'free' | 'player';
  land: number;
  raidT: number;
  razedT: number;
  bld: Building[];
  tier: number;
  recruitT: number;
  smokeT: number;
  governor: number | null;
  folk: Unit[];
}

export interface March {
  id: number;
  townId: number;
  mode: 'conquer' | 'raze';
  n: number;
  t: number;
  dur: number;
  phase: 'go' | 'back';
  sea: boolean;
  survivors: number;
  incoming: boolean;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  members?: Unit[];
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ---------- Создание ---------- */

export function createTowns(g: Game) {
  const w = g.world;
  g.towns = [];
  const size = MAP_SIZES.find((s) => s.n === w.w);
  const want = size ? size.towns : 6;
  const cx0 = w.startX + 1;
  const cy0 = w.startY + 1;
  const pLand = w.landId[cy0 * w.w + cx0];
  const cands: { x: number; y: number }[] = [];
  for (let y = 7; y < w.h - 7; y += 2)
    for (let x = 7; x < w.w - 7; x += 2) {
      let ok = true;
      for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) if (w.biome[(y + dy) * w.w + x + dx] <= B.BEACH) { ok = false; break; }
      if (ok) cands.push({ x, y });
    }
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  const minFromCamp = w.w < 90 ? 13 : 17;
  const names = [...TOWN_NAMES].sort(() => Math.random() - 0.5);
  const place = (c: { x: number; y: number }) => {
    const t = mkTown(g, c.x, c.y, names.pop() ?? `Селение ${g.towns.length + 1}`);
    g.towns.push(t);
  };
  const free = (c: { x: number; y: number }) => Math.hypot(c.x - cx0, c.y - cy0) >= minFromCamp && g.towns.every((t) => Math.hypot(t.x - c.x, t.y - c.y) >= 13);
  // хотя бы один сосед на своей земле
  const near = cands.filter((c) => w.landId[c.y * w.w + c.x] === pLand && free(c));
  if (near.length) place(near[0]);
  for (const c of cands) {
    if (g.towns.length >= want) break;
    if (free(c)) place(c);
  }
}

function mkTown(g: Game, x: number, y: number, name: string): Town {
  const w = g.world;
  const spec = SPEC_ORDER[Math.floor(Math.random() * SPEC_ORDER.length)];
  const pop = Math.round(rnd(6, 16));
  const t: Town = {
    id: g.nextId++,
    name,
    x,
    y,
    spec,
    pop,
    soldiers: 0,
    stock: { food: pop * rnd(4, 8), wood: pop * rnd(3, 7), stone: pop * rnd(2, 5), gold: pop * rnd(1, 4) },
    attitude: Math.round(rnd(20, 62)),
    aggr: clamp(rnd(0.15, 0.75) + (spec === 'warrior' ? 0.15 : 0), 0, 1),
    loyalty: 60,
    loyBase: 55,
    owner: 'free',
    land: w.landId[y * w.w + x],
    raidT: rnd(420, 760) * DIFFS[g.diff].raid,
    razedT: 0,
    bld: [],
    tier: 0,
    recruitT: 60,
    smokeT: 0,
    governor: null,
    folk: [],
  };
  t.tier = rankIdx(t.pop);
  for (let dy = -5; dy <= 5; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 1 || yy < 1 || xx >= w.w - 1 || yy >= w.h - 1) continue;
      const i = yy * w.w + xx;
      if (w.biome[i] <= B.WATER) continue;
      w.objs[i] = null;
      w.blocked[i] = 0;
      if (w.biome[i] === B.DESERT || w.biome[i] === B.BEACH) w.biome[i] = B.FIELD;
    }
  rebuildTown(g, t);
  return t;
}

type L = [BuildingId, number, number];
function layout(tier: number): L[] {
  if (tier <= 1) return [['campfire', 0, 0], ['shelter', -3, -1], ['shelter', 2, -1], ['shelter', -1, 2], ['shelter', 3, 2]];
  if (tier <= 3) return [['campfire', 0, 0], ['house', -4, -3], ['house', 2, -3], ['house', -1, 2], ['shelter', 4, 1], ['shelter', -4, 1], ['farm', -2, 5]];
  if (tier <= 5) return [['campfire', 0, 0], ['stonehouse', -4, -3], ['stonehouse', 2, -3], ['stonehouse', -4, 1], ['stonehouse', 2, 2], ['storage', -1, 3], ['house', 5, -1], ['farm', -5, 4]];
  return [['hall', -1, -3], ['campfire', 0, 1], ['stonehouse', -5, -3], ['stonehouse', 3, -3], ['stonehouse', -5, 1], ['stonehouse', 3, 1], ['house', -2, 3], ['barracks', 5, -1], ['storage', -4, 4], ['shrine', 4, 4]];
}

export function rebuildTown(g: Game, t: Town) {
  const w = g.world;
  for (const b of t.bld) for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) w.blocked[yy * w.w + xx] = 0;
  t.bld = [];
  for (const [type, dx, dy] of layout(t.tier)) {
    const def = BUILDINGS[type];
    const x = t.x + dx;
    const y = t.y + dy;
    let ok = x >= 1 && y >= 1 && x + def.w < w.w - 1 && y + def.h < w.h - 1;
    for (let yy = y; yy < y + def.h && ok; yy++) for (let xx = x; xx < x + def.w; xx++) if (w.biome[yy * w.w + xx] <= B.WATER) { ok = false; break; }
    if (!ok) continue;
    for (let yy = y; yy < y + def.h; yy++)
      for (let xx = x; xx < x + def.w; xx++) {
        w.blocked[yy * w.w + xx] = 1;
        w.objs[yy * w.w + xx] = null;
      }
    t.bld.push({ id: g.nextId++, type, x, y, w: def.w, h: def.h, done: true, progress: 1, smokeT: Math.random() * 2 });
  }
}

/* ---------- Мощь сторон ---------- */

export function townDef(t: Town, mult = 1): number {
  return mult * (t.soldiers + t.pop * 0.15) * (1 + 0.1 * t.tier) * (t.spec === 'warrior' ? 1.25 : 1) * (t.spec === 'smith' ? 1.1 : 1);
}

export function armyPower(g: Game, n: number): number {
  let bonus = 1;
  for (const b of g.buildings) if (b.done) bonus += BUILDINGS[b.type].atk ?? 0;
  return lifeArmyPower(g, n) * g.mods.atk * bonus * (g.dev.godArmy ? 20 : 1);
}

export function homeDefense(g: Game): number {
  let towers = 1;
  for (const b of g.buildings) if (b.done) towers += BUILDINGS[b.type].def ?? 0;
  const adults = g.units.filter((u) => !u.child && u.spawn <= 0).length;
  return (lifeArmyPower(g, g.army) + adults * 0.12) * g.mods.def * towers * (g.dev.godArmy ? 20 : 1);
}

export const ARMY_GRACE = 360;

export function armyCap(g: Game): number {
  let c = SPECS[g.spec].id === 'warrior' ? 10 : 4;
  for (const b of g.buildings) if (b.done) c += BUILDINGS[b.type].army ?? 0;
  return c;
}

export function trainCost(g: Game) {
  const k = g.mods.armyCost;
  return { food: Math.ceil(10 * k), wood: Math.ceil(6 * k), gold: Math.ceil(4 * k), goods: Math.ceil(3 * k) };
}

export function annexCost(g: Game, t: Town): number {
  return Math.max(220, Math.round((t.pop * 12 + t.soldiers * 6 + 160) * g.mods.annex));
}

export function playerLand(g: Game): number {
  return g.world.landId[(g.world.startY + 1) * g.world.w + g.world.startX + 1];
}

export function townReach(g: Game, t: Town): 'land' | 'sea' | 'no' {
  if (t.land === playerLand(g)) return 'land';
  return g.done.has('sailing') ? 'sea' : 'no';
}

/* ---------- Действия игрока ---------- */

export function trainSoldiers(g: Game, n: number): string | null {
  const barr = armyCap(g);
  if (g.army + g.awayCount() >= barr) return 'Лимит армии исчерпан — стройте казармы';
  const c = trainCost(g);
  let done = 0;
  for (let i = 0; i < n; i++) {
    if (g.army + g.awayCount() >= barr) break;
    if (g.res.food < c.food || g.res.wood < c.wood || g.res.gold < c.gold || g.res.goods < c.goods) break;
    if (!bestWeaponInStock(g)) {
      if (!done) return 'Нет оружия! Изготовьте его в мастерской, кузнице или лучной мастерской (панель «Жизнь» [N])';
      break;
    }
    const cand = g.units.filter((u) => !u.child && u.spawn <= 0 && u.role === 'none' && u.status === 'free').sort((a, b) => (a.task.type === 'idle' ? 0 : 1) - (b.task.type === 'idle' ? 0 : 1));
    if (cand.length <= 2) {
      if (!done) return 'Нужно оставить хотя бы двух работников';
      break;
    }
    const u = cand[0];
    g.spend('food', c.food);
    g.spend('wood', c.wood);
    g.spend('gold', c.gold);
    g.spend('goods', c.goods);
    if (!enlist(g, u)) break;
    g.army++;
    done++;
    for (let k = 0; k < 6; k++) g.spark(u.x * TW, u.y * TH - 8, '#c8d0e0');
  }
  if (!done) return 'Не хватает ресурсов (еда, дерево, золото, товары)';
  g.sfx('train');
  g.msg(`Обучено воинов: ${done}`, 'good');
  return null;
}

export function sendArmy(g: Game, townId: number, mode: 'conquer' | 'raze', n: number): string | null {
  const t = g.towns.find((q) => q.id === townId);
  if (!t || t.owner !== 'free') return 'Цель недоступна';
  if (mode === 'raze' && !SPECS[g.spec].canRaze) return 'Разорять селения умеют только воины';
  n = Math.floor(n);
  if (n < 1 || n > g.army) return 'Нет столько воинов в гарнизоне';
  const reach = townReach(g, t);
  if (reach === 'no') return 'Селение на другом острове — изучите «Парусный флот»';
  const camp = g.buildings[0];
  const sx = camp.x + 1;
  const sy = camp.y + 1;
  const dist = Math.hypot(t.x - sx, t.y - sy);
  const dur = Math.max(8, (dist * 0.9 * (reach === 'sea' ? 1.4 : 1)) / g.mods.march);
  g.army -= n;
  const members = takeGuards(g, n);
  g.marches.push({ members, id: g.nextId++, townId, mode, n, t: 0, dur, phase: 'go', sea: reach === 'sea', survivors: 0, incoming: false, sx, sy, tx: t.x, ty: t.y });
  g.sfx('horn');
  g.msg(`Армия (${n}) выступила ${mode === 'raze' ? 'разорять' : 'захватывать'} «${t.name}»`, 'info');
  return null;
}

export function giftTown(g: Game, townId: number): string | null {
  const t = g.towns.find((q) => q.id === townId);
  if (!t || t.owner !== 'free') return 'Нельзя';
  if (g.res.gold < 20) return 'Нужно 20 золота';
  g.res.gold -= 20;
  t.attitude = clamp(t.attitude + 12, 0, 100);
  t.aggr = clamp(t.aggr - 0.08, 0, 1);
  g.sfx('coin');
  g.msg(`Дар для «${t.name}»: отношение улучшилось`, 'good');
  return null;
}

export function annexPeace(g: Game, townId: number): string | null {
  const t = g.towns.find((q) => q.id === townId);
  if (!t || t.owner !== 'free') return 'Цель недоступна';
  const cost = annexCost(g, t);
  if (g.res.gold < cost) return `Нужно ${cost} золота`;
  const strong = armyPower(g, g.army) >= townDef(t) * 1.3;
  if (t.attitude < 55 && !strong) {
    t.attitude = clamp(t.attitude - 8, 0, 100);
    g.msg(`«${t.name}» отвергло предложение. Улучшите отношение дарами или усильте армию`, 'warn');
    g.sfx('warn');
    return 'Отказ';
  }
  g.res.gold -= cost;
  annexTown(g, t, 'peace');
  return null;
}

export function annexTown(g: Game, t: Town, how: 'peace' | 'conquer') {
  t.owner = 'player';
  t.loyBase = how === 'conquer' ? 28 : 55;
  t.loyalty = how === 'conquer' ? 30 : 62;
  t.attitude = 100;
  t.soldiers = how === 'conquer' ? 0 : Math.round(t.soldiers * 0.5);
  g.msg(`«${t.name}» ${how === 'conquer' ? 'захвачено и присоединено' : 'мирно присоединено'} к вашему селению!`, 'good');
  g.sfx('fanfare');
  g.onTownsChanged();
}

export function changeGov(g: Game, id: 'abs' | 'con' | 'par' | 'pres'): string | null {
  if (g.gov === id) return null;
  g.gov = id;
  g.refreshMods();
  if (g.stateFormed) {
    g.msg('Форма правления изменена', 'info');
  }
  g.stateFormed = true;
  g.needGov = false;
  g.sfx('fanfare');
  g.emit(true);
  return null;
}

/* ---------- Симуляция ---------- */

function battle(A: number, D: number) {
  const r = A / Math.max(0.1, D);
  const win = r > 1;
  const lossFrac = win ? clamp(0.5 / r, 0.08, 0.6) : clamp(0.6 + 0.2 * (1 / r - 1), 0.6, 1);
  return { win, r, lossFrac };
}

function updateTownEco(g: Game, t: Town, dt: number) {
  const prov = t.owner === 'player';
  const popMax = (prov ? 18 + g.time / 25 : 22 + g.time / 18) + (t.spec === 'farmer' ? 8 : 0);
  if (t.razedT > 0) t.razedT -= dt;
  if (t.pop < popMax) t.pop += dt * (0.03 + t.pop * 0.0004) * (t.razedT > 0 ? 0.3 : 1) * (prov ? govFx(g, t).pop : 1);
  const target = t.pop * (t.spec === 'warrior' ? 0.4 : 0.14) * (1 + t.aggr * 0.5);
  if (!prov && t.soldiers < target && g.time > ARMY_GRACE) t.soldiers += dt * 0.02;
  const ti = rankIdx(Math.floor(t.pop));
  if (ti !== t.tier) {
    t.tier = ti;
    rebuildTown(g, t);
    if (prov) g.msg(`«${t.name}» стало: ${RANKS[ti].name}`, 'good');
  }
  if (!prov) {
    const s = t.pop * dt * 0.02;
    if (t.spec === 'farmer') t.stock.food += s;
    else if (t.spec === 'lumber') t.stock.wood += s;
    else if (t.spec === 'miner' || t.spec === 'smith') t.stock.stone += s;
    else t.stock.gold += s * 0.6;
    t.stock.gold += t.pop * dt * 0.004;
    t.attitude = clamp(t.attitude + (50 - t.attitude) * dt * 0.0006, 0, 100);
  }
}

export function updateTowns(g: Game, dt: number) {
  const camp = g.buildings[0];
  let prodFood = 0;
  for (const t of g.towns) {
    updateTownEco(g, t, dt);
    // дым из труб
    t.smokeT -= dt;
    if (t.smokeT <= 0) {
      t.smokeT = 0.8 + Math.random();
      const hs = t.bld.filter((b) => b.type !== 'campfire' && b.type !== 'farm' && b.type !== 'storage');
      const b = hs[Math.floor(Math.random() * hs.length)];
      if (b) g.particles.push({ x: (b.x + b.w * 0.7) * TW, y: (b.y + 0.3) * TH, vx: 2 + Math.random() * 2, vy: -7 - Math.random() * 3, life: 2, max: 2, color: 'rgba(210,210,220,0.65)', size: 2, grav: 0 });
    }
    if (t.owner === 'player') {
      const gf = govFx(g, t);
      const k = clamp(t.loyalty / 60, 0.2, 1);
      const p = t.pop * dt * k * gf.prod;
      const goldTown = p * 0.004 * g.mods.gold * [0, 1, 2.1][g.tax] * gf.gold;
      g.gain('gold', goldTown * (1 - gf.theft));
      if (gf.hero && gf.theft > 0) {
        const stolen = goldTown * gf.theft + p * 0.012 * gf.theft;
        gf.hero.stash += stolen;
        g.soc.stolen += stolen;
      }
      if (gf.hero) gf.hero.served += dt;
      switch (t.spec) {
        case 'miner': g.gain('stone', p * 0.014); break;
        case 'lumber': g.gain('wood', p * 0.018); break;
        case 'farmer': g.gain('food', p * 0.02); prodFood += t.pop * 0.02 * k; break;
        case 'trader': g.gain('gold', p * 0.012 * g.mods.gold * gf.gold); break;
        case 'sage': g.gain('know', p * 0.012 * g.mods.know); break;
        case 'smith': g.gain('stone', p * 0.006); g.gain('gold', p * 0.006 * g.mods.gold); break;
        case 'factory': g.gain('goods', p * 0.012 * g.mods.prod); g.gain('gold', p * 0.004 * g.mods.gold); break;
        case 'warrior':
          t.recruitT -= dt * (t.pop / 20) * k;
          if (t.recruitT <= 0) {
            t.recruitT = 70;
            if (g.army + g.awayCount() < armyCap(g) + 6) g.army++;
          }
          break;
      }
      const capBonus = g.soc.capital === t.id ? 8 : 0;
      t.loyalty = clamp(t.loyalty + (t.loyBase + g.mods.loyalty + gf.loy + capBonus + [6, 0, -10][g.tax] - t.loyalty) * dt * 0.01, 0, 100);
      if (t.loyalty < 10 && Math.random() < dt * 0.02) {
        t.owner = 'free';
        t.soldiers = Math.round(t.pop * 0.25);
        t.attitude = 10;
        t.aggr = 0.7;
        t.raidT = 300;
        dismissIfRebel(g, t);
        g.msg(`Восстание! «${t.name}» вышло из-под вашей власти`, 'warn');
        g.sfx('alarm');
        g.onTownsChanged();
      }
    } else if (camp && !g.gameOver) {
      // набеги на игрока
      t.raidT -= dt;
      if (t.raidT <= 0) {
        t.raidT = rnd(260, 520) * DIFFS[g.diff].raid;
        if (g.dev.noRaids) continue;
        const sameLand = t.land === playerLand(g);
        if (g.time > 420 && sameLand && t.aggr > 0.35 && t.attitude < 60 && t.soldiers >= 4) {
          const n = Math.floor(t.soldiers * rnd(0.5, 0.8));
          t.soldiers -= n;
          const dist = Math.hypot(t.x - camp.x, t.y - camp.y);
          g.marches.push({ id: g.nextId++, townId: t.id, mode: 'raze', n, t: 0, dur: Math.max(14, dist * 1.0), phase: 'go', sea: false, survivors: 0, incoming: true, sx: t.x, sy: t.y, tx: camp.x + 1, ty: camp.y + 1 });
          g.msg(`Тревога! Отряд из «${t.name}» (${n}) идёт на ваше селение!`, 'warn');
          g.sfx('alarm');
        }
      }
    }
  }
  void prodFood;
  // походы
  for (let i = g.marches.length - 1; i >= 0; i--) {
    const m = g.marches[i];
    m.t += dt;
    if (m.t < m.dur) continue;
    const t = g.towns.find((q) => q.id === m.townId);
    if (m.incoming) {
      g.life.battleT = 5;
      resolveRaidOnPlayer(g, m, t);
      g.marches.splice(i, 1);
      continue;
    }
    if (m.phase === 'back') {
      g.army += m.survivors;
      restoreGuards(g, m, m.survivors);
      g.msg(`Армия вернулась домой (${m.survivors})`, 'info');
      g.marches.splice(i, 1);
      continue;
    }
    if (!t || t.owner !== 'free') {
      g.army += m.n;
      restoreGuards(g, m, m.n);
      g.marches.splice(i, 1);
      continue;
    }
    resolveAttack(g, m, t);
    battleLosses(g, m);
    if (m.survivors > 0) {
      m.phase = 'back';
      m.t = 0;
      m.dur = Math.max(6, m.dur * 0.8);
      [m.sx, m.sy, m.tx, m.ty] = [m.tx, m.ty, m.sx, m.sy];
    } else g.marches.splice(i, 1);
  }
}

function resolveAttack(g: Game, m: March, t: Town) {
  const A = armyPower(g, m.n) * rnd(0.85, 1.15);
  const D = townDef(t, DIFFS[g.diff].enemy * (1 + govFx(g, t).def * 0)) * rnd(0.85, 1.15);
  const res = battle(A, D);
  m.survivors = Math.max(res.win ? 1 : 0, Math.round(m.n * (1 - res.lossFrac)));
  if (!res.win) m.survivors = Math.round(m.n * (1 - res.lossFrac));
  g.sfx('battle');
  const lost = m.n - m.survivors;
  if (res.win) {
    if (m.mode === 'conquer') {
      t.pop = Math.max(4, t.pop * 0.85);
      annexTown(g, t, 'conquer');
      g.msg(`Победа! Потери: ${lost}. Селение «${t.name}» захвачено`, 'good');
    } else {
      const k = 0.6;
      const loot = { food: Math.floor(t.stock.food * k), wood: Math.floor(t.stock.wood * k), stone: Math.floor(t.stock.stone * k), gold: Math.floor(t.stock.gold * k + 10 + t.pop) };
      g.res.food += loot.food;
      g.res.wood += loot.wood;
      g.res.stone += loot.stone;
      g.res.gold += loot.gold;
      t.stock = { food: t.stock.food * (1 - k), wood: t.stock.wood * (1 - k), stone: t.stock.stone * (1 - k), gold: t.stock.gold * (1 - k) };
      t.pop = Math.max(3, t.pop * 0.6);
      t.soldiers = 0;
      t.razedT = 240;
      t.attitude = clamp(t.attitude - 30, 0, 100);
      t.aggr = clamp(t.aggr + 0.15, 0, 1);
      const nt = rankIdx(Math.floor(t.pop));
      if (nt !== t.tier) {
        t.tier = nt;
        rebuildTown(g, t);
      }
      for (let i = 0; i < 24; i++) g.particles.push({ x: (t.x + (Math.random() - 0.5) * 6) * TW, y: (t.y + (Math.random() - 0.5) * 3) * TH, vx: (Math.random() - 0.5) * 6, vy: -12 - Math.random() * 10, life: 1.6, max: 1.6, color: Math.random() < 0.5 ? '#ff7a2a' : '#4a4a52', size: 2, grav: 0 });
      g.msg(`«${t.name}» разорено! Добыча: 🍖${loot.food} 🪵${loot.wood} 🪨${loot.stone} 🪙${loot.gold}. Потери: ${lost}`, 'good');
    }
    addCaptives(g, t.soldiers * 0.6 + t.pop * 0.12 + 1);
    g.sfx('victory');
  } else {
    t.soldiers = Math.max(0, t.soldiers * rnd(0.6, 0.8));
    t.attitude = clamp(t.attitude - 15, 0, 100);
    g.msg(`Поражение у «${t.name}». Выжило воинов: ${m.survivors}`, 'warn');
    g.sfx('defeat');
  }
}

function resolveRaidOnPlayer(g: Game, m: March, t: Town | undefined) {
  const A = m.n * rnd(0.85, 1.15) * (t ? 1 + 0.1 * t.tier : 1) * DIFFS[g.diff].enemy;
  const D = homeDefense(g) * rnd(0.85, 1.15);
  const res = battle(A, D);
  g.sfx('battle');
  if (res.win) {
    const k = 0.25;
    const lostRes = { food: Math.floor(g.res.food * k), wood: Math.floor(g.res.wood * k), stone: Math.floor(g.res.stone * k), gold: Math.floor(g.res.gold * k) };
    g.res.food -= lostRes.food;
    g.res.wood -= lostRes.wood;
    g.res.stone -= lostRes.stone;
    g.res.gold -= lostRes.gold;
    const adults = g.units.filter((u) => !u.child && u.spawn <= 0);
    const kill = Math.min(Math.max(0, adults.length - 2), Math.round(m.n * 0.3));
    for (let i = 0; i < kill; i++) {
      const u = adults[Math.floor(Math.random() * adults.length)];
      const idx = g.units.indexOf(u);
      if (idx >= 0) g.units.splice(idx, 1);
    }
    const aLoss = Math.ceil(g.army * 0.6);
    g.army -= aLoss;
    g.msg(`Селение разграблено! Потеряно ресурсов 25%, погибло людей: ${kill}, воинов: ${aLoss}`, 'warn');
    g.sfx('defeat');
    if (t) t.stock.gold += lostRes.gold * 0.5;
  } else {
    const aLoss = Math.floor(g.army * clamp(0.25 * res.r + 0.1, 0.1, 0.45));
    g.army -= aLoss;
    if (t) {
      t.attitude = clamp(t.attitude - 10, 0, 100);
      t.soldiers += Math.round(m.n * 0.15);
    }
    g.res.gold += Math.round(m.n * 3);
    g.msg(`Набег отбит! Потеряно воинов: ${aLoss}. Трофеи: ${Math.round(m.n * 3)} золота`, 'good');
    g.sfx('victory');
  }
}

function dismissIfRebel(g: Game, t: Town) {
  const h = heroOf(g, t);
  if (h) h.town = null;
  t.governor = null;
  if (g.soc.capital === t.id) g.soc.capital = null;
}
