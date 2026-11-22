import { BUILDINGS, STORED, TH, TW, type AllRes, type BuildingId } from './data';
import type { Game } from './game';
import { TECHS } from './techs';
import { ensureSpecSprites } from './bsprites2';
import { SPECS, type GovId, type SpecId } from './meta';
import { annexTown, changeGov, armyCap, type Town } from './towns';
import { DAY_LENGTH } from './data';

/** Меню разработчика: набор операций над игрой. */

export function devGive(g: Game, k: AllRes, n: number) {
  if (k === 'know') g.know += n;
  else g.res[k] = Math.max(0, g.res[k] + n);
  g.msg(`DEV: ${n >= 0 ? '+' : ''}${n} ${k}`, 'info');
  g.emit(true);
}

export function devGiveAll(g: Game, n: number) {
  for (const k of STORED) g.res[k] += n;
  g.res.gold += n;
  g.know += n;
  g.msg(`DEV: всего по +${n}`, 'info');
  g.emit(true);
}

export function devSetAll(g: Game, n: number) {
  for (const k of STORED) g.res[k] = n;
  g.res.gold = n;
  g.emit(true);
}

export function devSpawn(g: Game, n: number, kid = false) {
  const camp = g.buildings[0];
  if (!camp) return;
  const tiles = g.freeTilesNear(camp.x + 1, camp.y + 3, n + 4);
  for (let i = 0; i < n && i < tiles.length; i++) {
    const t = tiles[i];
    const u = g.newUnit(t.x + 0.5, t.y + 0.5, kid);
    u.spawn = 0.4 + i * 0.12;
    g.units.push(u);
  }
  g.msg(`DEV: появилось ${n} ${kid ? 'детей' : 'взрослых'}`, 'info');
  g.emit(true);
}

export function devGrowKids(g: Game) {
  let n = 0;
  for (const u of g.units) if (u.child) {
    u.child = false;
    n++;
  }
  g.msg(`DEV: повзрослело детей — ${n}`, 'info');
}

export function devKillIdle(g: Game) {
  const idle = g.units.filter((u) => u.task.type === 'idle' && !u.child);
  for (const u of idle.slice(0, 5)) g.units.splice(g.units.indexOf(u), 1);
  g.emit(true);
}

export function devHousing(g: Game, type: BuildingId = 'house', n = 5) {
  const camp = g.buildings[0];
  if (!camp) return;
  const def = BUILDINGS[type];
  let placed = 0;
  for (let r = 4; r < 22 && placed < n; r++) {
    for (let a = 0; a < 24 && placed < n; a++) {
      const ang = (a / 24) * Math.PI * 2 + r;
      const x = Math.round(camp.x + 1 + Math.cos(ang) * r * 1.3 - def.w / 2);
      const y = Math.round(camp.y + 1 + Math.sin(ang) * r * 0.9 - def.h / 2);
      if (!g.canPlace(type, x, y)) {
        continue;
      }
      // не вплотную — оставим проходы
      let tooClose = false;
      for (const b of g.buildings) if (Math.hypot(b.x - x, b.y - y) < 3.6) tooClose = true;
      if (tooClose) continue;
      g.addBuilding(type, x, y, true);
      placed++;
    }
  }
  g.msg(`DEV: построено зданий «${def.name}» — ${placed}`, 'info');
  g.emit(true);
}

export function devFinishBuildings(g: Game) {
  let n = 0;
  for (const b of g.buildings) if (!b.done) {
    b.done = true;
    b.progress = 1;
    n++;
    g.stats.built++;
  }
  g.msg(`DEV: достроено зданий — ${n}`, 'info');
  g.emit(true);
}

export function devClearBuildings(g: Game) {
  const keep = g.buildings.filter((b) => b.type === 'camp');
  for (const b of g.buildings) if (b.type !== 'camp') for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) g.world.blocked[y * g.world.w + x] = 0;
  g.buildings = keep;
  g.selBuilding = null;
  g.emit(true);
}

export function devUnlockAllTech(g: Game) {
  for (const t of TECHS) {
    g.done.add(t.id);
    g.progress[t.id] = g.costs[t.id];
  }
  g.research = null;
  g.refreshMods();
  g.msg('DEV: все технологии изучены', 'good');
  g.emit(true);
}

export function devResetTech(g: Game) {
  g.done.clear();
  g.progress = {};
  g.research = null;
  g.refreshMods();
  g.msg('DEV: технологии сброшены', 'warn');
  g.emit(true);
}

export function devFinishResearch(g: Game) {
  if (g.research) g.completeResearch(g.research);
  else g.msg('DEV: нет текущего изучения', 'warn');
}

export function devSetHour(g: Game, h: number) {
  g.dayT = (h / 24) % 1;
  g.emit(true);
}

export function devSkipDays(g: Game, d: number) {
  g.time += d * DAY_LENGTH;
  g.msg(`DEV: прошло дней — ${d}`, 'info');
  g.emit(true);
}

export function devSetSpec(g: Game, id: SpecId) {
  g.spec = id;
  ensureSpecSprites(g.bspr, id);
  g.refreshMods();
  g.costs = Object.fromEntries(TECHS.map((t) => [t.id, Math.max(5, Math.round(t.cost * (SPECS[id].discount[t.branch] ?? 1)))]));
  g.msg(`DEV: специализация — ${SPECS[id].name}`, 'info');
  g.emit(true);
}

export function devSetGov(g: Game, id: GovId) {
  changeGov(g, id);
}

export function devArmy(g: Game, n: number) {
  g.army = Math.max(0, g.army + n);
  g.msg(`DEV: армия ${n >= 0 ? '+' : ''}${n}`, 'info');
  g.emit(true);
}

export function devAnnexAll(g: Game) {
  let n = 0;
  for (const t of g.towns) if (t.owner === 'free') {
    annexTown(g, t as Town, 'peace');
    n++;
  }
  g.msg(`DEV: присоединено селений — ${n}`, 'good');
}

export function devAttitude(g: Game, v: number) {
  for (const t of g.towns) if (t.owner === 'free') t.attitude = v;
  g.emit(true);
}

export function devRaid(g: Game) {
  const camp = g.buildings[0];
  const t = g.towns.find((q) => q.owner === 'free');
  if (!camp || !t) return g.msg('DEV: нет свободных селений для набега', 'warn');
  const n = Math.max(5, Math.round(g.army * 1.2 + 4));
  g.marches.push({ id: g.nextId++, townId: t.id, mode: 'raze', n, t: 0, dur: 14, phase: 'go', sea: false, survivors: 0, incoming: true, sx: t.x, sy: t.y, tx: camp.x + 1, ty: camp.y + 1 });
  g.msg(`DEV: тревога! Отряд из «${t.name}» (${n}) идёт на вас`, 'warn');
  g.sfx('alarm');
}

export function devRegrow(g: Game) {
  for (const o of g.regrow) {
    o.regrow = 0.01;
  }
  g.msg('DEV: кусты ягод отрастут', 'info');
}

export function devCompleteQuests(g: Game) {
  // отметим цели, не выполняя (для теста интерфейса)
  g.questDone = new Set(Array.from({ length: 40 }, (_, i) => i));
  g.emit(true);
}

export function devCenterCamp(g: Game) {
  const c = g.buildings[0];
  if (c) g.centerOn((c.x + 1) * TW, (c.y + 1) * TH);
}

export function devPrices(g: Game, v: number) {
  for (const k of STORED) g.prices[k] = v;
  g.emit(true);
}

export function devCapInfo(g: Game) {
  return { cap: g.capVal, armyCap: armyCap(g) };
}
