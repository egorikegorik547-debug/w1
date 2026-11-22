import { B, BUILDINGS, TH, TW, type ResKey } from './data';
import type { Game, Unit } from './game';
import { MALE_NAMES, FEMALE_NAMES } from './data';
import type { SpecId } from './meta';
import { randomLook, type Look } from './sprites';
import { type Fx } from './techs';
import { townDef, type Town } from './towns';
import { claimStamps } from './life';

/* ───────────── Сложность ───────────── */

export type Difficulty = 'easy' | 'normal' | 'hard' | 'brutal';
export interface DiffDef {
  id: Difficulty;
  name: string;
  icon: string;
  desc: string;
  lines: string[];
  res: number;
  hunger: number;
  raid: number;
  enemy: number;
  tech: number;
  loyal: number;
  birth: number;
}
export const DIFFS: Record<Difficulty, DiffDef> = {
  easy: { id: 'easy', name: 'Лёгкая', icon: '🌱', desc: 'Спокойное развитие: щедрый старт, редкие набеги, дешёвые знания.', lines: ['Старт ресурсов ×1.6', 'Еда расходуется на 20% медленнее', 'Набеги реже, враги слабее на 25%', 'Знания −20%, лояльность +8'], res: 1.6, hunger: 0.8, raid: 1.7, enemy: 0.75, tech: 0.8, loyal: 8, birth: 0.85 },
  normal: { id: 'normal', name: 'Обычная', icon: '⚖️', desc: 'Как задумано: баланс роста, торговли и войны.', lines: ['Стандартный старт', 'Стандартный голод и набеги', 'Стандартная цена знаний'], res: 1, hunger: 1, raid: 1, enemy: 1, tech: 1, loyal: 0, birth: 1 },
  hard: { id: 'hard', name: 'Тяжёлая', icon: '🔥', desc: 'Скудный старт, голод и сильные соседи. Ошибки наказываются.', lines: ['Старт ресурсов ×0.7', 'Еды нужно на 20% больше', 'Набеги чаще, враги сильнее на 30%', 'Знания +20%, лояльность −6'], res: 0.7, hunger: 1.2, raid: 0.7, enemy: 1.3, tech: 1.2, loyal: -6, birth: 1.15 },
  brutal: { id: 'brutal', name: 'Жестокая', icon: '💀', desc: 'Выживание на грани: бунты, налёты и вечный голод.', lines: ['Старт ресурсов ×0.5', 'Еды нужно на 40% больше', 'Набеги вдвое чаще, враги ×1.7', 'Знания +40%, лояльность −12'], res: 0.5, hunger: 1.4, raid: 0.5, enemy: 1.7, tech: 1.4, loyal: -12, birth: 1.3 },
};
export const DIFF_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'brutal'];

/* ───────────── Сословия, зависящие от специализации ───────────── */

export interface SocialRule {
  slaves: boolean;
  serfs: boolean;
  lords: boolean;
  lordTitle: string;
  serfName: string;
  slaveName: string;
  out: ResKey | 'gold' | 'know' | null;
  outName: string;
  corvee: number;
  obrok: number;
  unrestK: number;
  note: string;
}

export const SOCIAL: Record<SpecId, SocialRule> = {
  smith: { slaves: false, serfs: true, lords: true, lordTitle: 'Мастер-владелец', serfName: 'Мастеровые', slaveName: '', out: 'goods', outName: 'товары', corvee: 1.2, obrok: 1, unrestK: 0.9, note: 'Кузнецы держат мастеровых-крепостных при мастерских. Рабство им чуждо.' },
  miner: { slaves: true, serfs: false, lords: true, lordTitle: 'Рудовладелец', serfName: '', slaveName: 'Каторжане', out: 'stone', outName: 'камень', corvee: 1.5, obrok: 0.8, unrestK: 1.1, note: 'Горняки гонят пленных и каторжан в шахты. Крепостных у них нет.' },
  lumber: { slaves: false, serfs: true, lords: true, lordTitle: 'Лесной боярин', serfName: 'Лесные крепостные', slaveName: '', out: 'wood', outName: 'дерево', corvee: 1.3, obrok: 1.1, unrestK: 1, note: 'Лесные бояре владеют угодьями вместе с приписными крепостными.' },
  warrior: { slaves: true, serfs: true, lords: true, lordTitle: 'Феодал', serfName: 'Крепостные', slaveName: 'Пленники', out: 'food', outName: 'еду', corvee: 1.1, obrok: 1.2, unrestK: 1.2, note: 'Воины раздают земли феодалам, а пленников превращают в рабов.' },
  trader: { slaves: true, serfs: false, lords: true, lordTitle: 'Купец-землевладелец', serfName: '', slaveName: 'Невольники', out: 'gold', outName: 'золото', corvee: 1, obrok: 1, unrestK: 1, note: 'Купцы торгуют людьми и владеют факториями. Крепостного права нет.' },
  farmer: { slaves: false, serfs: true, lords: true, lordTitle: 'Помещик', serfName: 'Крепостные крестьяне', slaveName: '', out: 'food', outName: 'еду', corvee: 1.3, obrok: 1, unrestK: 0.95, note: 'Классическая схема: помещик, барщина и оброк крепостных крестьян.' },
  sage: { slaves: false, serfs: false, lords: false, lordTitle: '', serfName: '', slaveName: '', out: null, outName: '', corvee: 1, obrok: 1, unrestK: 1, note: 'Философы отвергают рабство и крепостничество — зато налоги и указы остаются.' },
  factory: { slaves: true, serfs: false, lords: true, lordTitle: 'Фабрикант', serfName: '', slaveName: 'Каторжные рабочие', out: 'goods', outName: 'товары', corvee: 1.4, obrok: 0.9, unrestK: 1.15, note: 'Фабриканты владеют землёй и гонят каторжных рабочих к станкам.' },
};

/* ───────────── Указы ───────────── */

export interface DecreeDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  pros: string[];
  cons: string[];
  dur: number;
  cd: number;
  cost: number;
  fx: Fx;
  happy: number;
}
export const DECREES: DecreeDef[] = [
  { id: 'dry', name: 'Сухой закон', icon: '🚱', desc: 'Трезвый народ работает лучше, но ропщет.', pros: ['Работа и стройка +12%'], cons: ['Счастье −15', 'Золото −6%'], dur: 180, cd: 120, cost: 10, fx: { chop: 1.12, mine: 1.12, build: 1.12, farm: 1.12, gold: 0.94 }, happy: -15 },
  { id: 'martial', name: 'Военное положение', icon: '🪖', desc: 'Все — в ополчение, поля пустуют.', pros: ['Атака +25%', 'Оборона +30%', 'Воины дешевле на 30%'], cons: ['Урожай −40%', 'Лояльность −8', 'Счастье −8'], dur: 150, cd: 200, cost: 25, fx: { atk: 1.25, def: 1.3, armyCost: 0.7, farm: 0.6, loyalty: -8 }, happy: -8 },
  { id: 'feast', name: 'Великий праздник', icon: '🎉', desc: 'Народные гулянья на всю округу.', pros: ['Счастье +25', 'Лояльность +6', 'Рождаемость выше'], cons: ['Работа −18%', 'Еды уходит больше'], dur: 120, cd: 180, cost: 40, fx: { chop: 0.82, mine: 0.82, build: 0.82, farm: 0.9, hunger: 1.12, loyalty: 6, birth: 0.85 }, happy: 25 },
  { id: 'mobil', name: 'Трудовая мобилизация', icon: '📣', desc: 'Все силы — на стройки и добычу.', pros: ['Стройка +35%', 'Добыча +15%'], cons: ['Счастье −10', 'Лояльность −5', 'Рождаемость ниже'], dur: 160, cd: 160, cost: 20, fx: { build: 1.35, chop: 1.15, mine: 1.15, loyalty: -5, birth: 1.2 }, happy: -10 },
  { id: 'freetrade', name: 'Свобода торговли', icon: '⛵', desc: 'Пошлины отменены — купцы довольны.', pros: ['Золото +25%', 'Цена присоединения −10%'], cons: ['Лояльность −3', 'Оборона −5%'], dur: 200, cd: 150, cost: 30, fx: { gold: 1.25, annex: 0.9, loyalty: -3, def: 0.95 }, happy: 3 },
  { id: 'police', name: 'Полицейский режим', icon: '👮', desc: 'Строгий порядок и тотальный надзор.', pros: ['Лояльность +16', 'Бунты подавлены'], cons: ['Знания −15%', 'Счастье −12'], dur: 200, cd: 150, cost: 25, fx: { loyalty: 16, know: 0.85 }, happy: -12 },
  { id: 'enlight', name: 'Просвещение', icon: '🕯️', desc: 'Школы и диспуты, казна тоньше.', pros: ['Знания +30%', 'Счастье +6'], cons: ['Золото −15%'], dur: 220, cd: 160, cost: 35, fx: { know: 1.3, gold: 0.85 }, happy: 6 },
  { id: 'crusade', name: 'Великий поход', icon: '🚩', desc: 'Армия движется быстрее и бьёт сильнее.', pros: ['Скорость походов +40%', 'Атака +12%'], cons: ['Еды нужно на 15% больше', 'Счастье −5'], dur: 170, cd: 200, cost: 30, fx: { march: 1.4, atk: 1.12, hunger: 1.15 }, happy: -5 },
  { id: 'harvest', name: 'Страда', icon: '🌾', desc: 'Все на уборку урожая.', pros: ['Урожай +35%', 'Охота +20%'], cons: ['Стройка −20%', 'Знания −10%'], dur: 160, cd: 140, cost: 15, fx: { farm: 1.35, lodge: 1.2, build: 0.8, know: 0.9 }, happy: 0 },
  { id: 'amnesty', name: 'Амнистия', icon: '🕊️', desc: 'Милость государя: недовольство спадает.', pros: ['Лояльность +10', 'Счастье +10', 'Недовольство зависимых −'], cons: ['Оборона −8%'], dur: 120, cd: 240, cost: 20, fx: { loyalty: 10, def: 0.92 }, happy: 10 },
];
export const DECREE_BY_ID = Object.fromEntries(DECREES.map((d) => [d.id, d])) as Record<string, DecreeDef>;

/* ───────────── Герои-управленцы ───────────── */

export interface TraitDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  gold: number;
  prod: number;
  loy: number;
  theft: number;
  pop: number;
  def: number;
}
const T = (id: string, name: string, icon: string, desc: string, o: Partial<TraitDef>): TraitDef => ({ id, name, icon, desc, gold: 1, prod: 1, loy: 0, theft: 0, pop: 1, def: 0, ...o });
export const TRAITS: TraitDef[] = [
  T('thief', 'Казнокрад', '🐀', 'Ворует до трети доходов, но железной рукой держит порядок.', { loy: 16, theft: 0.3 }),
  T('soft', 'Честный, но мягкотелый', '😇', 'Не берёт ни монеты, но народ не боится его.', { loy: -9, gold: 1.08 }),
  T('tyrant', 'Тиран', '👹', 'Страх вместо любви: порядок, но народ редеет.', { loy: 22, pop: 0.8, gold: 1.1, theft: 0.05 }),
  T('merchant', 'Купец-хитрец', '💰', 'Выжимает золото из всего, но подворовывает.', { gold: 1.35, theft: 0.12, loy: -2 }),
  T('steward', 'Рачительный хозяин', '🌾', 'Скромный, но всё растёт под его рукой.', { prod: 1.3, gold: 1.05, loy: 2 }),
  T('general', 'Полководец', '⚔️', 'Крепит стены и гарнизон, но хозяйство забывает.', { def: 0.35, loy: 6, prod: 0.9 }),
  T('scholar', 'Книжник', '📚', 'Умён и честен, но народ его не понимает.', { prod: 1.15, gold: 1.1, loy: -3 }),
  T('drunk', 'Пьяница', '🍺', 'Народ его любит за пирушки, дела идут плохо.', { prod: 0.8, loy: 6, gold: 0.9 }),
  T('charming', 'Обаятельный', '😊', 'Его обожают — и в городе спокойно.', { loy: 12, gold: 1.05 }),
  T('pious', 'Набожный', '🙏', 'Храмы полны, казна пуста.', { loy: 14, gold: 0.85 }),
  T('schemer', 'Интриган', '🐍', 'Умно зарабатывает, плетёт заговоры, ворует.', { gold: 1.15, loy: -10, theft: 0.15 }),
  T('builder', 'Градостроитель', '🏗️', 'Город при нём растёт быстро.', { pop: 1.35, prod: 1.1, gold: 0.95 }),
  T('coward', 'Осторожный трус', '🐔', 'Стремится к миру, оборону запускает.', { def: -0.3, loy: 4, gold: 1.05 }),
  T('miser', 'Скупой', '🪙', 'Складывает в казну каждую монету, народ ворчит.', { gold: 1.25, loy: -8 }),
  T('healer', 'Целитель', '🌿', 'Лечит людей: город растёт и спокоен.', { pop: 1.25, loy: 6 }),
];
export const TRAIT_BY_ID = Object.fromEntries(TRAITS.map((t) => [t.id, t])) as Record<string, TraitDef>;

export interface Hero {
  id: number;
  name: string;
  trait: string;
  look: Look;
  stash: number;
  town: number | null;
  served: number;
}

export interface Estate {
  id: number;
  lordId: number;
  lordName: string;
  bx: number;
  by: number;
  bld: number;
  name: string;
  wealth: number;
  made: number;
  rate: number;
  dep: number;
  riot: number;
}

export interface SocState {
  estates: Estate[];
  captives: number;
  corvee: number;
  quitrent: number;
  taxLand: number;
  taxTrade: number;
  unrest: number;
  happy: number;
  happyTarget: number;
  goldFlow: number;
  decrees: { id: string; left: number }[];
  cd: Record<string, number>;
  heroes: Hero[];
  heroT: number;
  capital: number | null;
  capCd: number;
  shock: number;
  eventT: number;
  bucket: number;
  borderT: number;
  pendingLord: number | null;
  stolen: number;
}

export function createSoc(g: Game): SocState {
  const s: SocState = { estates: [], captives: 0, corvee: 1, quitrent: 1, taxLand: 1, taxTrade: 1, unrest: 0, happy: 62, happyTarget: 62, goldFlow: 0, decrees: [], cd: {}, heroes: [], heroT: 120, capital: null, capCd: 0, shock: 0, eventT: 30, bucket: 6, borderT: 0, pendingLord: null, stolen: 0 };
  for (let i = 0; i < 3; i++) s.heroes.push(newHero(g));
  return s;
}

function newHero(g: Game): Hero {
  const look = randomLook(Math.random);
  const names = look.female ? FEMALE_NAMES : MALE_NAMES;
  const last = ['Ветров', 'Громов', 'Белов', 'Серый', 'Мудрый', 'Лютый', 'Светлый', 'Рыжий', 'Хмурый', 'Добрый', 'Смелый', 'Крепкий'];
  const trait = TRAITS[Math.floor(Math.random() * TRAITS.length)];
  look.outfit = look.female ? 2 : 0;
  look.cloth = Math.floor(Math.random() * 5);
  return { id: g.nextId++, name: `${names[Math.floor(Math.random() * names.length)]} ${last[Math.floor(Math.random() * last.length)]}${look.female ? 'а' : ''}`, trait: trait.id, look, stash: 0, town: null, served: 0 };
}

export function heroOf(g: Game, t: Town): Hero | null {
  if (t.governor == null) return null;
  return g.soc.heroes.find((h) => h.id === t.governor) ?? null;
}

export interface GovFx {
  gold: number;
  prod: number;
  loy: number;
  theft: number;
  pop: number;
  def: number;
  hero: Hero | null;
}
export function govFx(g: Game, t: Town): GovFx {
  const h = heroOf(g, t);
  if (!h) return { gold: 0.7, prod: 0.7, loy: -12, theft: 0, pop: 0.9, def: 0, hero: null };
  const tr = TRAIT_BY_ID[h.trait];
  return { gold: tr.gold, prod: tr.prod, loy: tr.loy, theft: tr.theft, pop: tr.pop, def: tr.def, hero: h };
}

/* ───────────── Состав и расчёты ───────────── */

export const isLord = (u: Unit) => u.role === 'lord';

export function ruleOf(g: Game): SocialRule {
  return SOCIAL[g.spec];
}

export function dependents(g: Game, estateId?: number): Unit[] {
  return g.units.filter((u) => u.status !== 'free' && (estateId === undefined || u.estate === estateId));
}

/** Модификаторы от указов, счастья, столицы и сословий */
export function socMods(g: Game): Fx {
  const s = g.soc;
  const fx: Fx = {};
  const mul = (k: keyof Fx, v: number) => {
    fx[k] = (fx[k] ?? 1) * v;
  };
  const add = (k: 'loyalty' | 'carry', v: number) => {
    fx[k] = (fx[k] ?? 0) + v;
  };
  for (const d of s.decrees) {
    const def = DECREE_BY_ID[d.id];
    for (const k of Object.keys(def.fx) as (keyof Fx)[]) {
      if (k === 'loyalty' || k === 'carry') add(k, def.fx[k]!);
      else mul(k, def.fx[k]!);
    }
  }
  const hp = s.happy;
  if (hp < 35) for (const k of ['chop', 'mine', 'build', 'farm', 'gather'] as const) mul(k, 0.88);
  else if (hp > 75) for (const k of ['chop', 'mine', 'build', 'farm', 'gather'] as const) mul(k, 1.06);
  add('loyalty', (hp - 55) * 0.1);
  if (s.shock > 0) add('loyalty', -8);
  // столица
  if (s.capital != null) {
    const t = g.towns.find((q) => q.id === s.capital);
    if (t && t.owner === 'player') {
      const wealth = t.pop + t.stock.gold * 0.5;
      mul('gold', 1 + Math.min(0.3, wealth / 220));
      mul('def', 1 + Math.min(0.4, townDef(t) / 70));
      add('loyalty', 4);
    }
  } else {
    mul('gold', 1.04);
    mul('def', 1.04);
  }
  if (s.estates.length) add('loyalty', Math.min(6, s.estates.length * 1.5));
  return fx;
}

export function applySoc(g: Game, m: import('./techs').Mods) {
  const fx = socMods(g);
  for (const k of Object.keys(fx) as (keyof Fx)[]) {
    const v = fx[k]!;
    if (k === 'loyalty' || k === 'carry') m[k] += v;
    else m[k] *= v;
  }
}

/* ───────────── Действия игрока ───────────── */

function ok(g: Game, text: string) {
  g.msg(text, 'good');
  return null;
}

export function issueDecree(g: Game, id: string): string | null {
  const d = DECREE_BY_ID[id];
  const s = g.soc;
  if (!d) return 'Нет такого указа';
  if (s.decrees.some((x) => x.id === id)) return 'Указ уже действует';
  if ((s.cd[id] ?? 0) > 0) return `Перезарядка: ${Math.ceil(s.cd[id])} с`;
  if (s.decrees.length >= 3) return 'Одновременно можно держать не более 3 указов';
  if (g.res.gold < d.cost) return `Нужно ${d.cost} золота`;
  g.spend('gold', d.cost);
  s.decrees.push({ id, left: d.dur });
  g.refreshMods();
  g.sfx('fanfare');
  return ok(g, `Издан указ: «${d.name}»`);
}

export function cancelDecree(g: Game, id: string) {
  const s = g.soc;
  const i = s.decrees.findIndex((x) => x.id === id);
  if (i < 0) return;
  s.decrees.splice(i, 1);
  s.cd[id] = DECREE_BY_ID[id].cd;
  g.refreshMods();
  g.msg(`Указ «${DECREE_BY_ID[id].name}» отменён`, 'info');
}

export function appointGovernor(g: Game, townId: number, heroId: number): string | null {
  const t = g.towns.find((q) => q.id === townId);
  const h = g.soc.heroes.find((q) => q.id === heroId);
  if (!t || t.owner !== 'player') return 'Селение не ваше';
  if (!h) return 'Нет героя';
  if (h.town != null) return 'Герой уже управляет селением';
  if (t.governor != null) dismissGovernor(g, townId, true);
  t.governor = h.id;
  h.town = t.id;
  h.served = 0;
  return ok(g, `${h.name} назначен наместником «${t.name}» (${TRAIT_BY_ID[h.trait].name})`);
}

export function dismissGovernor(g: Game, townId: number, quiet = false) {
  const t = g.towns.find((q) => q.id === townId);
  if (!t || t.governor == null) return;
  const h = g.soc.heroes.find((q) => q.id === t.governor);
  if (h) h.town = null;
  t.governor = null;
  if (!quiet) g.msg(`Наместник «${t.name}» отстранён`, 'info');
}

export function auditGovernor(g: Game, townId: number): string | null {
  const t = g.towns.find((q) => q.id === townId);
  const h = t ? heroOf(g, t) : null;
  if (!t || !h) return 'Нет наместника';
  if (h.stash < 1) return 'Ревизия ничего не нашла — наместник чист (или хитёр)';
  const back = Math.floor(h.stash * 0.85);
  g.gain('gold', back);
  h.stash = 0;
  g.sfx('coin');
  return ok(g, `Ревизия: изъято ${back} золота у ${h.name}`);
}

export function executeGovernor(g: Game, heroId: number) {
  const s = g.soc;
  const h = s.heroes.find((q) => q.id === heroId);
  if (!h) return;
  if (h.town != null) dismissGovernor(g, h.town, true);
  s.heroes = s.heroes.filter((q) => q.id !== heroId);
  if (h.stash > 0) g.gain('gold', Math.floor(h.stash * 0.9));
  g.msg(`${h.name} казнён. Народ шепчется...`, 'warn');
}

export function moveCapital(g: Game, townId: number | null): string | null {
  const s = g.soc;
  if (s.capCd > 0) return `Новый перенос возможен через ${Math.ceil(s.capCd)} с`;
  if (townId === s.capital) return 'Уже столица';
  const cost = 120;
  if (g.res.gold < cost) return `Нужно ${cost} золота`;
  if (townId != null) {
    const t = g.towns.find((q) => q.id === townId);
    if (!t || t.owner !== 'player') return 'Столицей может стать только ваше селение';
  }
  g.spend('gold', cost);
  s.capital = townId;
  s.capCd = 300;
  s.shock = 90;
  g.refreshMods();
  g.sfx('fanfare');
  const name = townId == null ? g.name : g.towns.find((q) => q.id === townId)!.name;
  return ok(g, `Столица перенесена в «${name}»! Двор в смятении: лояльность временно ниже`);
}

/** Начать пожалование земли: человека → помещик */
export function startGrant(g: Game, unitId: number): string | null {
  const r = ruleOf(g);
  if (!r.lords) return 'Ваша специализация не знает помещиков';
  const u = g.units.find((q) => q.id === unitId);
  if (!u || u.child) return 'Нужен взрослый житель';
  if (u.status !== 'free') return 'Зависимый человек не может владеть землёй';
  if (u.role === 'lord') return 'Он уже землевладелец';
  if (g.res.gold < 30 || g.res.wood < 40) return 'Для усадьбы нужно 30 золота и 40 дерева';
  g.soc.pendingLord = unitId;
  g.setTool('estate');
  g.msg(`Выберите место для усадьбы — ${u.name} станет: ${r.lordTitle.toLowerCase()}`, 'info');
  return null;
}

export function estateSpot(g: Game, x: number, y: number): string | null {
  const w = g.world;
  if (x < 2 || y < 2 || x + 3 > w.w - 2 || y + 3 > w.h - 2) return 'Слишком близко к краю';
  let near = false;
  for (const b of g.buildings) if (Math.hypot(b.x - x, b.y - y) < 18) near = true;
  if (!near) return 'Усадьба должна быть рядом с селением';
  for (let yy = y; yy < y + 3; yy++)
    for (let xx = x; xx < x + 3; xx++) {
      const i = yy * w.w + xx;
      if (w.biome[i] <= B.WATER) return 'Нельзя строить на воде';
      const o = w.objs[i];
      if ((o && o.kind !== 'stump' && o.kind !== 'bush') || (w.blocked[i] && !(o && (o.kind === 'stump' || o.kind === 'bush')))) return 'Место занято';
    }
  return null;
}

export function placeEstate(g: Game, x: number, y: number): boolean {
  const s = g.soc;
  const u = g.units.find((q) => q.id === s.pendingLord);
  if (!u) {
    g.setTool('select');
    return false;
  }
  const why = estateSpot(g, x, y);
  if (why) {
    g.msg(why, 'warn');
    return false;
  }
  if (g.res.gold < 30 || g.res.wood < 40) {
    g.msg('Не хватает золота или дерева', 'warn');
    return false;
  }
  g.spend('gold', 30);
  g.spend('wood', 40);
  const b = g.addBuilding('manor', x, y, true);
  const r = ruleOf(g);
  const e: Estate = { id: g.nextId++, lordId: u.id, lordName: u.name, bx: x, by: y, bld: b.id, name: `Угодья: ${u.name}`, wealth: 0, made: 0, rate: 0, dep: 0, riot: 0 };
  s.estates.push(e);
  u.role = 'lord';
  u.estate = e.id;
  u.sel = false;
  g.setIdle(u);
  g.sfx('built', x * TW, y * TH);
  for (let i = 0; i < 16; i++) g.spark((x + Math.random() * 3) * TW, (y + 3) * TH - 4, '#ffe27a');
  g.msg(`${u.name} получает землю и становится: ${r.lordTitle.toLowerCase()}`, 'good');
  s.pendingLord = null;
  g.setTool('select');
  g.refreshMods();
  return true;
}

export function revokeEstate(g: Game, id: number) {
  const s = g.soc;
  const e = s.estates.find((q) => q.id === id);
  if (!e) return;
  for (const u of g.units) {
    if (u.estate === id) {
      if (u.role === 'lord') u.role = 'none';
      if (u.status === 'slave') {
        // рабы остаются рабами государства без угодий
        u.estate = 0;
      } else {
        u.status = 'free';
        u.estate = 0;
      }
      if (u.estate === 0 && u.task.type === 'corvee') g.setIdle(u);
    }
  }
  const b = g.buildings.find((q) => q.id === e.bld);
  if (b) {
    for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) g.world.blocked[yy * g.world.w + xx] = 0;
    g.buildings = g.buildings.filter((q) => q.id !== b.id);
  }
  s.estates = s.estates.filter((q) => q.id !== id);
  g.msg('Угодья изъяты в казну, зависимые освобождены', 'info');
  g.refreshMods();
}

export function bindDependent(g: Game, estateId: number, kind: 'serf' | 'slave'): string | null {
  const r = ruleOf(g);
  const e = g.soc.estates.find((q) => q.id === estateId);
  if (!e) return 'Нет такой усадьбы';
  if (kind === 'serf') {
    if (!r.serfs) return 'Ваша специализация не знает крепостного права';
    const cand = g.units.filter((u) => !u.child && u.spawn <= 0 && u.status === 'free' && u.role === 'none' && u.task.type === 'idle');
    const free = g.units.filter((u) => !u.child && u.spawn <= 0 && u.status === 'free' && u.role === 'none');
    if (free.length <= 3) return 'Нельзя закрепостить последних свободных жителей';
    const u = (cand.length ? cand : free).sort((a, b) => Math.hypot(a.x - e.bx, a.y - e.by) - Math.hypot(b.x - e.bx, b.y - e.by))[0];
    u.status = 'serf';
    u.estate = e.id;
    g.setIdle(u);
    g.msg(`${u.name} закреплён${u.look.female ? 'а' : ''} за «${e.name}» — теперь ${r.serfName.toLowerCase()}`, 'info');
    g.soc.unrest = Math.min(100, g.soc.unrest + 3);
    return null;
  }
  if (!r.slaves) return 'Ваша специализация не признаёт рабства';
  if (g.soc.captives < 1) return 'Нет пленников. Берите их в походах или покупайте на рынке рабов';
  g.soc.captives--;
  const t = g.freeTilesNear(e.bx + 1, e.by + 3, 3)[0] ?? { x: e.bx + 1, y: e.by + 3 };
  const u = g.newUnit(t.x + 0.5, t.y + 0.5, false);
  u.status = 'slave';
  u.estate = e.id;
  g.units.push(u);
  g.sfx('drop');
  g.msg(`Пленник обращён в раба и отправлен на «${e.name}»`, 'info');
  g.soc.unrest = Math.min(100, g.soc.unrest + 4);
  return null;
}

export function bindUnit(g: Game, unitId: number, estateId: number): string | null {
  const r = ruleOf(g);
  const e = g.soc.estates.find((q) => q.id === estateId);
  const u = g.units.find((q) => q.id === unitId);
  if (!e || !u) return 'Нет цели';
  if (!r.serfs) return 'Ваша специализация не знает крепостного права';
  if (u.status !== 'free' || u.role !== 'none' || u.child) return 'Этого человека нельзя закрепостить';
  const free = g.units.filter((q) => !q.child && q.spawn <= 0 && q.status === 'free' && q.role === 'none');
  if (free.length <= 3) return 'Нельзя закрепостить последних свободных жителей';
  u.status = 'serf';
  u.estate = e.id;
  u.sel = false;
  g.setIdle(u);
  g.soc.unrest = Math.min(100, g.soc.unrest + 3);
  g.msg(`${u.name} закреплён${u.look.female ? 'а' : ''} за «${e.name}»`, 'info');
  return null;
}

export function freeUnit(g: Game, unitId: number) {
  const u = g.units.find((q) => q.id === unitId);
  if (!u || u.status === 'free') return;
  u.status = 'free';
  u.estate = 0;
  g.setIdle(u);
  g.soc.unrest = Math.max(0, g.soc.unrest - 5);
  g.msg(`${u.name} получил${u.look.female ? 'а' : ''} волю`, 'good');
}

export function releaseDependent(g: Game, estateId: number): string | null {
  const dep = dependents(g, estateId);
  if (!dep.length) return 'Некого освобождать';
  const u = dep.sort((a, b) => (a.status === 'slave' ? 0 : 1) - (b.status === 'slave' ? 0 : 1))[0];
  u.status = 'free';
  u.estate = 0;
  g.setIdle(u);
  g.msg(`${u.name} получил${u.look.female ? 'а' : ''} волю`, 'good');
  g.soc.unrest = Math.max(0, g.soc.unrest - 6);
  g.soc.happy = Math.min(100, g.soc.happy + 1.5);
  return null;
}

export function buySlave(g: Game): string | null {
  const r = ruleOf(g);
  if (!r.slaves) return 'Ваша специализация не торгует людьми';
  if (g.marketCount() < 1) return 'Рабов покупают на рынке — постройте рынок';
  if (g.res.gold < 28) return 'Нужно 28 золота';
  g.spend('gold', 28);
  g.soc.captives++;
  g.soc.happy = Math.max(0, g.soc.happy - 1);
  g.sfx('coin');
  g.msg('Куплен невольник — поместите его на угодья', 'info');
  return null;
}

export function ransomCaptives(g: Game): string | null {
  const n = g.soc.captives;
  if (n < 1) return 'Нет пленников';
  g.soc.captives = 0;
  g.gain('gold', n * 6);
  g.sfx('coin');
  return ok(g, `Пленники отпущены за выкуп: +${n * 6} золота`);
}

/** Пленные после битвы */
export function addCaptives(g: Game, n: number) {
  n = Math.max(0, Math.round(n));
  if (!n) return;
  const r = ruleOf(g);
  if (r.slaves) {
    g.soc.captives += n;
    g.msg(`Взято пленных: ${n}. Их можно обратить в рабов (окно «Двор» — K)`, 'info');
  } else {
    g.gain('gold', n * 5);
    g.msg(`Пленные отпущены за выкуп: +${n * 5} золота`, 'info');
  }
}

/* ───────────── Зависимые на работах ───────────── */

const SPAN = 6;
export const FIELD_PATCHES: [number, number, number, number][] = [[-6, 0, 5, 3], [4, 0, 5, 3], [-2, 4, 6, 3]];
export function corveeTool(spec: SpecId): number {
  return spec === 'lumber' ? 0 : spec === 'miner' ? 1 : 3;
}

/** удар работы на поле: частицы, звук, колыхание колосьев */
function corveeBeat(g: Game, u: Unit, e: Estate, tx: number, ty: number) {
  const wx = (tx + 0.5) * TW + (u.fx === 2 ? 6 : -6);
  const wy = (ty + 0.6) * TH;
  g.fieldPulse.set(ty * g.world.w + tx, 1.1);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fieldPulse.set((ty + dy) * g.world.w + tx + dx, 0.7);
  if (g.spec === 'miner') {
    for (let i = 0; i < 5; i++) g.spark(wx, wy - 2, i % 2 ? '#dfe3ee' : '#ffd88a');
    g.sfx('mine', wx, wy);
    if (Math.random() < 0.4) g.floatText(u.x * TW, u.y * TH - 24, '+🪨', '#ffffff');
  } else if (g.spec === 'lumber') {
    for (let i = 0; i < 4; i++) g.spark(wx, wy - 2, i % 2 ? '#d8aa72' : '#8ac04a');
    g.sfx('chop', wx, wy);
    if (Math.random() < 0.4) g.floatText(u.x * TW, u.y * TH - 24, '+🪵', '#ffffff');
  } else {
    for (let i = 0; i < 3; i++) g.spark(wx, wy - 1, '#7a4e26');
    for (let i = 0; i < 3; i++) g.spark(wx, wy - 3, i % 2 ? '#f0d050' : '#8ad04a');
    g.particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 8, vy: -3, life: 0.6, max: 0.6, color: 'rgba(190,160,110,0.6)', size: 2, grav: 1, grow: 3 });
    g.sfx('gather', wx, wy);
    if (Math.random() < 0.4) g.floatText(u.x * TW, u.y * TH - 24, '+🌾', '#ffffff');
  }
  // капля пота
  g.particles.push({ x: u.x * TW + (u.fx === 2 ? -3 : 3), y: u.y * TH - 18, vx: (u.fx === 2 ? -1 : 1) * 6, vy: -6, life: 0.6, max: 0.6, color: '#bfe8ff', size: 1, grav: 40 });
  void e;
}

export function corveeLoop(g: Game, u: Unit, dt: number) {
  const e = g.soc.estates.find((q) => q.id === u.estate);
  if (!e || u.status === 'free' || g.soc.corvee === 0) {
    g.setIdle(u);
    return;
  }
  const t = u.task;
  const arrived = Math.abs(Math.floor(u.x) - t.tx) <= 0 && Math.abs(Math.floor(u.y) - t.ty) <= 0;
  if (!t.tx || (arrived && u.timer > 7 + Math.random() * 4)) {
    // новая рабочая точка — на грядке поля усадьбы
    for (let k = 0; k < 16; k++) {
      const pa = FIELD_PATCHES[Math.floor(Math.random() * FIELD_PATCHES.length)];
      const tx = e.bx + pa[0] + Math.floor(Math.random() * pa[2]);
      const ty = e.by + pa[1] + Math.floor(Math.random() * pa[3]);
      if (tx < 1 || ty < 1 || tx >= g.world.w - 1 || ty >= g.world.h - 1) continue;
      const ii = ty * g.world.w + tx;
      if (g.world.blocked[ii] || g.world.biome[ii] <= B.BEACH || g.world.objs[ii]) continue;
      t.tx = tx;
      t.ty = ty;
      u.timer = 0;
      u.phase = 'goto';
      break;
    }
    if (!t.tx) {
      g.setIdle(u);
      return;
    }
  }
  if (arrived) {
    u.phase = 'work';
    const before = u.timer;
    u.timer += dt;
    u.swing = (u.timer % 0.9) / 0.9;
    // лицом к грядке: чередуем стороны
    u.fx = (t.tx + t.ty) % 2 === 0 ? 2 : 3;
    u.dir = u.fx;
    if (Math.floor(u.timer / 0.9) !== Math.floor(before / 0.9)) corveeBeat(g, u, e, t.tx, t.ty);
    return;
  }
  u.phase = 'goto';
  const bl = g.world.blocked;
  const p = g.pf.find(bl, Math.floor(u.x), Math.floor(u.y), (x, y) => x === t.tx && y === t.ty, t.tx, t.ty, true, 4000);
  if (p && p.length) u.path = p;
  else {
    t.tx = 0;
    u.timer = 99;
  }
}

/* ───────────── Основное обновление ───────────── */

const SHARE = [0, 0.45, 0.8];

export function socialUpdate(g: Game, dt: number) {
  const s = g.soc;
  const r = ruleOf(g);
  // таймеры
  for (let i = s.decrees.length - 1; i >= 0; i--) {
    s.decrees[i].left -= dt;
    if (s.decrees[i].left <= 0) {
      const d = DECREE_BY_ID[s.decrees[i].id];
      s.cd[d.id] = d.cd;
      s.decrees.splice(i, 1);
      g.refreshMods();
      g.msg(`Указ «${d.name}» завершён`, 'info');
    }
  }
  for (const k of Object.keys(s.cd)) if (s.cd[k] > 0) s.cd[k] -= dt;
  if (s.capCd > 0) s.capCd -= dt;
  if (s.shock > 0) {
    s.shock -= dt;
    if (s.shock <= 0) g.refreshMods();
  }
  // новые герои при дворе
  s.heroT -= dt;
  if (s.heroT <= 0) {
    s.heroT = 140 + Math.random() * 120;
    if (s.heroes.filter((h) => h.town == null).length < 6) {
      const h = newHero(g);
      s.heroes.push(h);
      g.msg(`К вашему двору прибыл ${TRAIT_BY_ID[h.trait].name.toLowerCase()}: ${h.name}`, 'info');
    }
  }

  // здания: счастье, лояльность, пассивная добыча
  let happyB = 0;
  let loyB = 0;
  for (const b of g.buildings) {
    if (!b.done) continue;
    const d = BUILDINGS[b.type];
    if (d.happy) happyB += d.happy;
    if (d.loyalty) loyB += d.loyalty;
    if (d.yield) {
      for (const k of Object.keys(d.yield) as ResKey[]) {
        const mk = k === 'wood' ? g.mods.chop : k === 'stone' ? g.mods.mine : k === 'goods' ? g.mods.prod : 1;
        const v = (d.yield[k] ?? 0) * mk * dt;
        g.gain(k, v);
        if (k !== 'goods') g.stats[k] += v;
      }
    }
  }

  // угодья
  let goldFlow = 0;
  let allDep = 0;
  let slaves = 0;
  for (const e of s.estates) {
    const deps = g.units.filter((u) => u.estate === e.id && u.status !== 'free');
    e.dep = deps.length;
    allDep += deps.length;
    slaves += deps.filter((u) => u.status === 'slave').length;
    const lord = g.units.find((u) => u.id === e.lordId);
    if (!lord) {
      // помещик умер — угодья переходят государству
      g.msg(`У угодий «${e.name}» нет владельца — земля вернулась казне`, 'warn');
      revokeEstate(g, e.id);
      return;
    }
    e.lordName = lord.name;
    if (e.riot > 0) e.riot -= dt;
    let rate = 0;
    if (r.out && e.riot <= 0 && s.corvee > 0) {
      const working = deps.filter((u) => u.task.type === 'corvee' && u.phase === 'work').length;
      const k = 0.06 * r.corvee * SHARE[s.corvee] * (1 + Math.min(0.3, g.soc.happy / 400));
      for (const u of deps) {
        const w = u.task.type === 'corvee' && u.phase === 'work' ? 1 : 0.35;
        rate += k * w * (u.status === 'slave' ? 1.35 : 1);
      }
      void working;
      const out = rate * dt;
      const state = out * 0.65;
      e.wealth += out * 0.35 * (r.out === 'gold' ? 1 : 1.2);
      e.made += out;
      if (r.out === 'know') g.gain('know', state * g.mods.know);
      else if (r.out === 'gold') g.gain('gold', state * g.mods.gold);
      else {
        const mult = r.out === 'food' ? g.mods.farm : r.out === 'wood' ? g.mods.chop : r.out === 'stone' ? g.mods.mine : g.mods.prod;
        g.gain(r.out, state * mult);
        if (r.out !== 'goods') g.stats[r.out] += state * mult;
      }
    }
    e.rate = rate;
    // оброк (только крепостные), поземельный налог
    const serfs = deps.filter((u) => u.status === 'serf').length;
    goldFlow += serfs * 0.026 * [0, 1, 2][s.quitrent] * r.obrok * g.mods.gold;
    goldFlow += [0, 0.012, 0.03][s.taxLand] * (1 + e.wealth / 60) * 0.4 * g.mods.gold;
    e.wealth = Math.max(0, e.wealth - [0, 0.005, 0.012][s.taxLand] * dt);
  }
  // торговый налог
  goldFlow += g.marketCount() * 0.22 * [0, 1, 1.8][s.taxTrade] * g.mods.gold;
  s.goldFlow = goldFlow;
  g.gain('gold', goldFlow * dt);

  // недовольство зависимых
  let uTarget = 0;
  if (allDep > 0) {
    uTarget = ([0, 14, 30][s.corvee] + [0, 8, 22][s.quitrent] * 0.8) * r.unrestK + (slaves / allDep) * 26 + (slaves > 0 ? [0, 8, 18][s.corvee] : 0) - loyB * 1.1 - (s.decrees.some((d) => d.id === 'police') ? 20 : 0) - (s.decrees.some((d) => d.id === 'amnesty') ? 15 : 0);
    if (g.starving) uTarget += 15;
  }
  uTarget = Math.max(0, Math.min(100, uTarget));
  s.unrest += (uTarget - s.unrest) * Math.min(1, dt * 0.05);
  // жизнь рабов тяжела
  if (slaves > 0 && s.corvee === 2) {
    for (const u of g.units) {
      if (u.status === 'slave' && Math.random() < dt / 900) {
        g.msg(`${u.name} умер${u.look.female ? 'ла' : ''} на каторжной барщине`, 'warn');
        g.units.splice(g.units.indexOf(u), 1);
        s.happy = Math.max(0, s.happy - 1);
        break;
      }
    }
  }
  // события бунтов
  s.eventT -= dt;
  if (s.eventT <= 0) {
    s.eventT = 40 + Math.random() * 30;
    if (s.unrest > 68 && s.estates.length && Math.random() < 0.45) {
      const e = s.estates[Math.floor(Math.random() * s.estates.length)];
      e.riot = 70;
      g.msg(`Бунт на угодьях «${e.name}»! Работы встали`, 'warn');
      g.sfx('alarm');
      if (s.unrest > 86) {
        const deps = g.units.filter((u) => u.estate === e.id && u.status !== 'free');
        const run = deps[Math.floor(Math.random() * deps.length)];
        if (run) {
          g.units.splice(g.units.indexOf(run), 1);
          g.msg(`${run.name} бежал${run.look.female ? 'а' : ''} с угодий`, 'warn');
        }
      }
    }
  }

  // счастье
  let tgt = 62 + happyB + g.soc.decrees.reduce((a, d) => a + DECREE_BY_ID[d.id].happy, 0);
  tgt += [6, 0, -12][g.tax] + [4, 0, -8][s.taxLand] * (s.estates.length ? 1 : 0) + [3, 0, -6][s.taxTrade];
  tgt -= Math.max(0, s.unrest - 45) * 0.3;
  if (g.starving) tgt -= 25;
  else if (g.res.food > 80) tgt += 4;
  if (g.unpaid) tgt -= 8;
  const bu = Math.round(Math.max(0, Math.min(100, tgt)) / 10);
  void bu;
  s.happyTarget = Math.max(0, Math.min(100, tgt));
  s.happy += (s.happyTarget - s.happy) * Math.min(1, dt * 0.08);
  const bucket = Math.round(s.happy / 12);
  if (bucket !== s.bucket) {
    s.bucket = bucket;
    g.refreshMods();
  }
  // территория
  s.borderT -= dt;
  if (s.borderT <= 0) {
    s.borderT = 1.2;
    computeTerritory(g);
  }
}

/* ───────────── Границы ───────────── */

export interface Terr {
  w: number;
  h: number;
  owner: Uint16Array;
}

export function isStateOwner(g: Game, o: number): boolean {
  if (o === 1) return true;
  if (o >= 2) return g.towns[o - 2]?.owner === 'player';
  return false;
}

export function computeTerritory(g: Game) {
  const w = g.world.w;
  const h = g.world.h;
  const owner = new Uint16Array(w * h);
  const best = new Float32Array(w * h).fill(1e9);
  const stamp = (cx: number, cy: number, r: number, code: number) => {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15);
        if (d > r) continue;
        const i = y * w + x;
        if (g.world.biome[i] <= 1) continue;
        const score = d / r;
        if (score < best[i]) {
          best[i] = score;
          owner[i] = code;
        }
      }
  };
  const camp = g.buildings[0];
  if (camp) {
    stamp(camp.x + 1, camp.y + 1, 9 + g.tierIdx * 1.2, 1);
    for (const b of g.buildings) stamp(b.x + b.w / 2, b.y + b.h / 2, 5 + Math.min(3, g.tierIdx * 0.5), 1);
  }
  g.towns.forEach((t, i) => stamp(t.x + 0.5, t.y + 0.5, 7 + t.tier * 1.1 + (t.owner === 'player' ? 2 : 0), 2 + i));
  for (const c of claimStamps(g)) stamp(c.x, c.y, c.r, c.code);
  g.terr = { w, h, owner };
}

/* ───────────── Снимок для интерфейса ───────────── */

export function socSnapshot(g: Game) {
  const s = g.soc;
  const r = ruleOf(g);
  return {
    rule: r,
    happy: Math.round(s.happy),
    happyTarget: Math.round(s.happyTarget),
    unrest: Math.round(s.unrest),
    captives: s.captives,
    corvee: s.corvee,
    quitrent: s.quitrent,
    taxLand: s.taxLand,
    taxTrade: s.taxTrade,
    goldFlow: s.goldFlow,
    capital: s.capital,
    capCd: Math.ceil(Math.max(0, s.capCd)),
    decrees: s.decrees.map((d) => ({ id: d.id, left: Math.ceil(d.left) })),
    cd: Object.fromEntries(Object.entries(s.cd).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.ceil(v)])),
    heroes: s.heroes.map((h) => ({ id: h.id, name: h.name, trait: h.trait, town: h.town, stash: Math.floor(h.stash), look: h.look })),
    estates: s.estates.map((e) => ({ id: e.id, name: e.name, lord: e.lordName, dep: e.dep, rate: e.rate, wealth: Math.floor(e.wealth), made: Math.floor(e.made), riot: e.riot > 0, x: e.bx, y: e.by })),
    serfs: g.units.filter((u) => u.status === 'serf').length,
    slaves: g.units.filter((u) => u.status === 'slave').length,
    lords: g.units.filter((u) => u.role === 'lord').length,
    stolen: Math.floor(s.stolen),
  };
}
export type SocSnap = ReturnType<typeof socSnapshot>;
export { TH };
