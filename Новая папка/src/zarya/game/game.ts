import { B, BIOME_NAME, BUILDINGS, DAY_LENGTH, FEMALE_NAMES, MALE_NAMES, RES_INFO, STORED, TH, TW, type AllRes, type BuildingId, type ResKey } from './data';
import { TECHS, TECH_BY_ID, computeMods, techCost, type Mods } from './techs';
import { RANKS, SPECS, rankIdx, type GovId, type MapType, type SpecId } from './meta';
import { audio, type Sfx } from './audio';
import { armyCap, armyPower, annexCost, createTowns, homeDefense, townDef, townReach, trainCost, updateTowns, type March, type Town } from './towns';
import { Pathfinder, type Pt } from './pathfinding';
import { buildBuildingSprites, buildFlames, buildObjectSprites, randomLook, type BuildingSprites, type Cv, type Look, type ObjSprites } from './sprites';
import { renderMinimap, renderTerrain } from './terrain';
import { generateWorld, makeObj, type Obj, type World } from './worldgen';
import { renderFrame } from './render';
import { footFx, marchFx, updatePrints, windAt, type Print } from './fx';
import { DIFFS, applySoc, corveeLoop, createSoc, placeEstate, socSnapshot, socialUpdate, type Difficulty, type SocSnap, type SocState, type Terr } from './social';
import { ensureSpecSprites } from './bsprites2';
import './specbuild';
import { updateFolk } from './folk';
import { findFoeById, foeNear, targetAt, claimLand, createLife, lifeAfterStart, lifeApplyMods, lifeBirth, lifeBrief, lifeInit, lifeUnit, lifeUpdate, lifeCraft, killPerson, traitWork, type Gear, type LifeBrief, type LifeState } from './life';
import { randomTrait, type Trait } from './lifeData';
import type { Animal } from './life';

export type Tool = 'select' | 'chop' | 'gather' | 'mine' | 'build' | 'estate' | 'claim';
export type BorderMode = 'off' | 'settle' | 'state';
export type TaskType = 'idle' | 'move' | 'chop' | 'gather' | 'mine' | 'build' | 'corvee' | 'craft';

export interface Task {
  type: TaskType;
  tx: number;
  ty: number;
  site: number;
  auto: boolean;
}

export interface Unit {
  id: number;
  name: string;
  x: number;
  y: number;
  path: Pt[];
  dir: number;
  fx: number;
  anim: number;
  moving: boolean;
  task: Task;
  phase: 'goto' | 'work' | 'deliver';
  timer: number;
  swing: number;
  carry: { type: ResKey | null; n: number };
  look: Look;
  child: boolean;
  age: number;
  spawn: number;
  wander: number;
  sel: boolean;
  status: 'free' | 'serf' | 'slave';
  estate: number;
  role: 'none' | 'lord' | 'folk' | 'guard' | 'soldier' | 'hunter' | 'thief' | 'bandit' | 'visitor';
  accent?: string;
  fam: number;
  trait: Trait;
  hp: number;
  sleeping?: boolean;
  goHome?: boolean;
  home?: number;
  flee?: number;
  visit?: { bid: number; t: number };
  gear?: Gear;
  hero?: boolean;
  gTarget?: { x: number; y: number };
  lean?: number;
  lx?: number;
  ly?: number;
  fxT?: number;
  order?: { kind: 'move' | 'hold' | 'attack'; x: number; y: number; tk?: 'raider' | 'animal'; tid?: number };
}

export interface Building {
  id: number;
  type: BuildingId;
  x: number;
  y: number;
  w: number;
  h: number;
  done: boolean;
  progress: number;
  smokeT: number;
  hit?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  grav: number;
  text?: string;
  grow?: number;
}

export interface Ping {
  x: number;
  y: number;
  t: number;
  color: string;
}

export interface Msg {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'warn';
  t: number;
}

export interface TownView {
  id: number;
  name: string;
  spec: SpecId;
  pop: number;
  soldiers: number;
  tier: number;
  attitude: number;
  aggr: number;
  owner: 'free' | 'player';
  loyalty: number;
  reach: 'land' | 'sea' | 'no';
  dist: number;
  annexCost: number;
  def: number;
  razed: boolean;
  x: number;
  y: number;
  governor: number | null;
  govName: string;
  govTrait: string;
  capital: boolean;
}

export interface Snapshot {
  mode: 'menu' | 'play';
  res: { wood: number; stone: number; food: number; gold: number; goods: number };
  cap: number;
  flow: Record<string, { in: number; out: number }>;
  tax: number;
  jobs: { total: number; staffed: number; labor: number };
  workers: { chop: number; gather: number; mine: number; build: number; idle: number; other: number };
  toolsOn: boolean;
  unpaid: boolean;
  upkeep: number;
  trade: { markets: number; fee: number; prices: Record<string, { sell: number; buy: number; mult: number }> };
  dev: DevFlags;
  name: string;
  specId: SpecId;
  tierIdx: number;
  gov: GovId | null;
  stateFormed: boolean;
  goldRate: number;
  army: number;
  armyCap: number;
  armyAway: number;
  armyPow: number;
  homeDef: number;
  trainCost: { food: number; wood: number; gold: number; goods: number };
  costs: Record<string, number>;
  towns: TownView[];
  marches: { id: number; townName: string; mode: string; n: number; progress: number; phase: string; incoming: boolean }[];
  provinces: number;
  statePop: number;
  selTown: number | null;
  canSail: boolean;
  know: number;
  knowRate: number;
  foodRate: number;
  pop: number;
  kids: number;
  housing: number;
  research: { id: string; progress: number; cost: number } | null;
  progress: Record<string, number>;
  done: string[];
  day: number;
  hour: number;
  speed: number;
  paused: boolean;
  tool: Tool;
  buildType: BuildingId | null;
  units: { id: number; name: string; task: string; carry: string; kid: boolean; female: boolean; sel: boolean; look: Look; status: string; role: string; estate: number }[];
  selCount: number;
  selGuards: number;
  guardsTotal: number;
  building: { id: number; type: BuildingId; done: boolean; progress: number } | null;
  idleCount: number;
  msgs: Msg[];
  epoch: string;
  objectives: { text: string; done: boolean }[];
  questsDone: number;
  questsTotal: number;
  hover: string;
  gameOver: boolean;
  starving: boolean;
  zoom: number;
  diff: Difficulty;
  soc: SocSnap;
  borderMode: BorderMode;
  pendingLord: boolean;
  life: LifeBrief;
}

export interface DevFlags {
  infinite: boolean;
  freeBuild: boolean;
  instaBuild: boolean;
  instaResearch: boolean;
  researchMult: number;
  noHunger: boolean;
  noRaids: boolean;
  noCap: boolean;
  superWork: boolean;
  alwaysDay: boolean;
  godArmy: boolean;
  speedMult: number;
}
export const DEV_DEFAULT: DevFlags = { infinite: false, freeBuild: false, instaBuild: false, instaResearch: false, researchMult: 1, noHunger: false, noRaids: false, noCap: false, superWork: false, alwaysDay: false, godArmy: false, speedMult: 1 };

const EPOCHS: [string, (d: Set<string>) => boolean][] = [
  ['Индустриальная эра', (d) => d.has('steam')],
  ['Эпоха пороха', (d) => d.has('gunpowder')],
  ['Эпоха Просвещения', (d) => d.has('university')],
  ['Средневековье', (d) => d.has('masonry') || d.has('iron_weapons')],
  ['Железный век', (d) => d.has('iron')],
  ['Бронзовый век', (d) => d.has('bronze')],
  ['Эра поселений', (d) => d.has('town') || d.has('stonework')],
  ['Эра земледельцев', (d) => d.has('agri') || d.has('hunting')],
  ['Каменный век', (d) => d.has('stone_tools')],
];

const RES_OF: Record<string, ResKey> = { chop: 'wood', gather: 'food', mine: 'stone' };
const TOOL_OF: Record<string, number> = { chop: 0, mine: 1, build: 2, gather: 3, craft: 2 };
export { TOOL_OF };

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cw = 800;
  ch = 600;
  dpr = 1;
  scale = 3;
  zoom = 3;
  cam = { x: 0, y: 0 };
  viewLeft = 0;
  viewTop = 0;

  world!: World;
  terrain!: Cv;
  minimap!: Cv;
  pf!: Pathfinder;
  spr: ObjSprites;
  bspr: BuildingSprites;
  flames: Cv[];
  pre: (Unit | Building | Animal)[][] = [];
  post: (Unit | Building | Animal)[][] = [];
  life: LifeState = createLife();
  guards: Unit[] = [];
  prints: Print[] = [];
  fieldPulse = new Map<number, number>();
  fdt = 0.016;

  mode: 'menu' | 'play' = 'menu';
  units: Unit[] = [];
  buildings: Building[] = [];
  particles: Particle[] = [];
  pings: Ping[] = [];
  regrow: Obj[] = [];
  marked = new Set<number>();
  bad = new Set<number>();
  badT = 0;
  res: Record<ResKey | 'gold', number> = { wood: 15, stone: 0, food: 30, gold: 0, goods: 0 };
  tax = 1;
  prices: Record<ResKey, number> = { wood: 1, stone: 1, food: 1, goods: 1 };
  accIn: Record<string, number> = {};
  accOut: Record<string, number> = {};
  rateIn: Record<string, number> = {};
  rateOut: Record<string, number> = {};
  accT = 0;
  capVal = 150;
  capMsgT = 0;
  jobsInfo = { total: 0, staffed: 0, labor: 0 };
  workers = { chop: 0, gather: 0, mine: 0, build: 0, idle: 0, other: 0 };
  toolsOn = false;
  unpaid = false;
  unpaidT = 0;
  upkeepNow = 0;
  dev: DevFlags = { ...DEV_DEFAULT };
  know = 0;
  research: string | null = null;
  progress: Record<string, number> = {};
  done = new Set<string>();
  mods: Mods = computeMods(new Set(), 'farmer', null, 0);
  stats = { wood: 0, stone: 0, food: 0, goods: 0, traded: 0, built: 0 };
  tool: Tool = 'select';
  buildType: BuildingId | null = null;
  selBuilding: number | null = null;
  time = 0;
  dayT = 0.32;
  speed = 1;
  paused = false;
  nextId = 1;
  birthTimer = 0;
  starveTimer = 0;
  starving = false;
  lowFoodWarned = false;
  gameOver = false;
  msgs: Msg[] = [];
  msgId = 1;
  questDone = new Set<number>();
  menuT = 0;
  introT = 0;
  foodRate = 0;
  knowRate = 0;
  name = 'Заря';
  spec: SpecId = 'farmer';
  mapType: MapType = 'continents';
  gov: GovId | null = null;
  stateFormed = false;
  needGov = false;
  army = 0;
  marches: March[] = [];
  towns: Town[] = [];
  selTown: number | null = null;
  tierIdx = 0;
  goldRate = 0;
  costs: Record<string, number> = {};
  hoverTown: Town | null = null;
  uiLock = false;
  diff: Difficulty = 'normal';
  soc!: SocState;
  terr: Terr | null = null;
  borderMode: BorderMode = 'state';
  nightK = 0;
  onNeedGov: (() => void) | null = null;
  onOpenTown: ((id: number) => void) | null = null;

  mouse = { sx: 0, sy: 0, wx: 0, wy: 0, inside: false };
  drag: { sx: number; sy: number; wx: number; wy: number; shift: boolean } | null = null;
  panDrag: { sx: number; sy: number } | null = null;
  keys = new Set<string>();
  lastClick = { t: 0, id: -1 };
  alphaCache = new Map<Cv, Uint8ClampedArray>();
  hoverObj: Obj | null = null;
  hoverBuilding: Building | null = null;
  hoverUnit: Unit | null = null;

  onUpdate: ((s: Snapshot) => void) | null = null;
  onHotkey: ((k: string) => void) | null = null;
  emitT = 0;
  last = 0;
  raf = 0;
  running = false;
  waterT = 0;
  smokeAcc = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.spr = buildObjectSprites();
    this.bspr = buildBuildingSprites();
    this.flames = buildFlames();
  }

  /* ---------- Мир ---------- */

  loadWorld(seed: number, size = 100, type: MapType = 'continents') {
    this.mapType = type;
    this.towns = [];
    this.marches = [];
    this.world = generateWorld(seed, size, size, type);
    this.terrain = renderTerrain(this.world);
    this.minimap = renderMinimap(this.world);
    this.pf = new Pathfinder(this.world.w, this.world.h);
    this.pre = Array.from({ length: this.world.h }, () => []);
    this.post = Array.from({ length: this.world.h }, () => []);
    this.units = [];
    lifeInit(this);
    this.buildings = [];
    this.particles = [];
    this.pings = [];
    this.regrow = [];
    this.marked.clear();
    this.terr = null;
    // FIX: soc создавался только в startGame(), а snapshot() (вызываемый из emit() ниже)
    // читает this.soc — при первой загрузке это бросало TypeError и «загрузка» висела вечно.
    if (!this.soc) this.soc = createSoc(this);
    this.mode = 'menu';
    this.menuT = Math.random() * 100;
    this.dayT = 0.42;
    this.tool = 'select';
    this.buildType = null;
    this.cam.x = this.world.startX * TW;
    this.cam.y = this.world.startY * TH;
    this.zoom = this.cw / this.dpr < 900 ? 2 : 3;
    this.emit();
  }

  startGame(opts: { name: string; spec: SpecId; diff?: Difficulty }) {
    this.diff = opts.diff ?? 'normal';
    const D = DIFFS[this.diff];
    ensureSpecSprites(this.bspr, opts.spec);
    const w = this.world;
    this.name = opts.name.trim() || 'Заря';
    this.spec = opts.spec;
    const st = SPECS[opts.spec].start;
    // сбросить объекты, которые могли изменить
    this.units = [];
    lifeInit(this);
    this.buildings = [];
    this.particles = [];
    this.pings = [];
    this.msgs = [];
    this.marked.clear();
    this.bad.clear();
    this.res = { wood: Math.round((15 + (st.wood ?? 0)) * D.res), stone: Math.round((st.stone ?? 0) * D.res), food: Math.round((40 + (st.food ?? 0)) * D.res), gold: Math.round((st.gold ?? 0) * D.res), goods: Math.round((st.goods ?? 0) * D.res) };
    this.tax = 1;
    this.prices = { wood: 1, stone: 1, food: 1, goods: 1 };
    this.accIn = {};
    this.accOut = {};
    this.rateIn = {};
    this.rateOut = {};
    this.accT = 0;
    this.unpaid = false;
    this.unpaidT = 0;
    this.dev = { ...DEV_DEFAULT, speedMult: 1 };
    this.know = st.know ?? 0;
    this.army = st.army ?? 0;
    this.marches = [];
    this.gov = null;
    this.stateFormed = false;
    this.needGov = false;
    this.selTown = null;
    this.tierIdx = 0;
    this.costs = Object.fromEntries(TECHS.map((t) => [t.id, Math.round(techCost(t, opts.spec) * D.tech)]));
    this.research = null;
    this.progress = {};
    this.done = new Set();
    this.mods = computeMods(this.done, this.spec, null, 0);
    this.soc = createSoc(this);
    this.terr = null;
    this.borderMode = 'state';
    this.stats = { wood: 0, stone: 0, food: 0, goods: 0, traded: 0, built: 0 };
    this.questDone = new Set();
    this.time = 0;
    this.dayT = 0.3;
    this.speed = 1;
    this.paused = false;
    this.birthTimer = 0;
    this.starveTimer = 0;
    this.starving = false;
    this.gameOver = false;
    this.tool = 'select';
    this.buildType = null;
    this.selBuilding = null;
    this.introT = 6;
    this.addBuilding('camp', w.startX, w.startY, true);
    const cx = w.startX + 1;
    const cy = w.startY + 3;
    const tiles = this.freeTilesNear(cx, cy, 5);
    tiles.forEach((t, i) => {
      const u = this.newUnit(t.x + 0.5, t.y + 0.5, false);
      u.spawn = 0.8 + i * 0.7 + 0.9;
      this.units.push(u);
    });
    createTowns(this);
    lifeAfterStart(this);
    this.refreshMods();
    this.mode = 'play';
    this.zoom = this.cw / this.dpr < 900 ? 2 : 3;
    this.cam.x = (w.startX + 1) * TW;
    this.cam.y = (w.startY + 2) * TH;
    this.msg(`Поселение «${this.name}» основано на новых землях. Рубите деревья и собирайте ягоды!`, 'info');
    this.emit();
  }

  newUnit(x: number, y: number, kid: boolean): Unit {
    const look = randomLook(Math.random);
    const names = look.female ? FEMALE_NAMES : MALE_NAMES;
    return {
      id: this.nextId++,
      name: names[Math.floor(Math.random() * names.length)],
      x,
      y,
      path: [],
      dir: 0,
      fx: 2,
      anim: 0,
      moving: false,
      task: { type: 'idle', tx: 0, ty: 0, site: 0, auto: false },
      phase: 'goto',
      timer: 0,
      swing: 0,
      carry: { type: null, n: 0 },
      look,
      child: kid,
      age: 0,
      spawn: 0,
      wander: 1 + Math.random() * 3,
      sel: false,
      status: 'free',
      estate: 0,
      role: 'none',
      fam: 0,
      trait: randomTrait(),
      hp: 10,
    };
  }

  freeTilesNear(cx: number, cy: number, n: number): Pt[] {
    const out: { x: number; y: number; d: number }[] = [];
    const w = this.world;
    for (let dy = -9; dy <= 9; dy++) {
      for (let dx = -9; dx <= 9; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 1 || y < 1 || x >= w.w - 1 || y >= w.h - 1) continue;
        if (w.blocked[y * w.w + x]) continue;
        out.push({ x, y, d: Math.hypot(dx, dy) + Math.random() * 1.2 });
      }
    }
    out.sort((a, b) => a.d - b.d);
    return out.slice(0, n);
  }

  /* ---------- Утилиты ---------- */

  objAt(x: number, y: number): Obj | null {
    if (x < 0 || y < 0 || x >= this.world.w || y >= this.world.h) return null;
    return this.world.objs[y * this.world.w + x];
  }

  buildingAt(x: number, y: number): Building | null {
    for (const b of this.buildings) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
    return null;
  }

  msg(text: string, kind: Msg['kind'] = 'info') {
    this.msgs.push({ id: this.msgId++, text, kind, t: performance.now() });
    if (kind === 'warn' && this.mode === 'play') audio.play('warn');
    if (this.msgs.length > 6) this.msgs.shift();
    this.emit(true);
  }

  housingCap() {
    let c = 0;
    for (const b of this.buildings) if (b.done) c += BUILDINGS[b.type].housing;
    return Math.floor(c * this.mods.housing);
  }

  addBuilding(type: BuildingId, x: number, y: number, done: boolean): Building {
    const def = BUILDINGS[type];
    const b: Building = { id: this.nextId++, type, x, y, w: def.w, h: def.h, done, progress: done ? 1 : 0, smokeT: Math.random() * 2 };
    this.buildings.push(b);
    for (let yy = y; yy < y + def.h; yy++)
      for (let xx = x; xx < x + def.w; xx++) {
        const i = yy * this.world.w + xx;
        this.world.blocked[i] = 1;
        const o = this.world.objs[i];
        if (o) {
          this.marked.delete(i);
          this.world.objs[i] = null;
        }
      }
    return b;
  }

  /* ---------- Размещение ---------- */

  canPlace(type: BuildingId, x: number, y: number): string | null {
    const def = BUILDINGS[type];
    const w = this.world;
    if (x < 1 || y < 1 || x + def.w > w.w - 1 || y + def.h > w.h - 1) return 'Слишком близко к краю';
    for (let yy = y; yy < y + def.h; yy++)
      for (let xx = x; xx < x + def.w; xx++) {
        const i = yy * w.w + xx;
        if (w.biome[i] <= B.WATER) return 'Нельзя строить на воде';
        const o = w.objs[i];
        if (o && o.kind !== 'stump' && o.kind !== 'bush') return 'Место занято';
        if (w.blocked[i] && !(o && (o.kind === 'stump' || o.kind === 'bush'))) return 'Место занято';
        if (o && o.kind === 'bush' && o.amount > 0) return 'Здесь растут ягоды';
        const ow = this.terr ? this.terr.owner[i] : 0;
        if (ow >= 2 && this.towns[ow - 2] && this.towns[ow - 2].owner === 'free') return 'Чужая земля — захватите или присоедините селение';
      }
    return null;
  }

  isUnlocked(type: BuildingId) {
    const d = BUILDINGS[type];
    if (d.reqAlt && d.reqAlt.spec === this.spec && this.done.has(d.reqAlt.req)) return true;
    return !d.req || this.done.has(d.req);
  }

  canAfford(type: BuildingId) {
    if (this.dev.freeBuild) return true;
    const c = BUILDINGS[type].cost;
    return STORED.every((k) => (c[k] ?? 0) <= this.res[k]);
  }

  /** ресурсы, которых не хватает для здания */
  missing(type: BuildingId): ResKey[] {
    const c = BUILDINGS[type].cost;
    return STORED.filter((k) => (c[k] ?? 0) > this.res[k]);
  }

  unlockName(type: BuildingId): string {
    const d = BUILDINGS[type];
    const main = d.req ? TECH_BY_ID[d.req]?.name ?? d.req : '';
    if (d.reqAlt && d.reqAlt.spec === this.spec) return TECH_BY_ID[d.reqAlt.req]?.name ?? main;
    return main;
  }

  gain(k: AllRes, n: number) {
    if (n <= 0) return;
    if (k === 'know') this.know += n;
    else this.res[k] += n;
    this.accIn[k] = (this.accIn[k] ?? 0) + n;
  }

  spend(k: ResKey | 'gold', n: number) {
    if (n <= 0) return;
    this.res[k] -= n;
    this.accOut[k] = (this.accOut[k] ?? 0) + n;
  }

  /** общий множитель скорости работ: инструменты и читы */
  workK() {
    return (this.toolsOn ? 1.2 : 1) * (this.dev.superWork ? 3 : 1);
  }

  placeBuilding(type: BuildingId, x: number, y: number): boolean {
    const def = BUILDINGS[type];
    if (!this.isUnlocked(type)) {
      this.msg('Сначала изучите нужную технологию', 'warn');
      return false;
    }
    const why = this.canPlace(type, x, y);
    if (why) {
      this.msg(why, 'warn');
      return false;
    }
    if (!this.canAfford(type)) {
      this.msg('Не хватает ресурсов', 'warn');
      return false;
    }
    if (!this.dev.freeBuild) for (const k of STORED) this.spend(k, def.cost[k] ?? 0);
    const b = this.addBuilding(type, x, y, false);
    if (this.dev.instaBuild) {
      b.progress = 1;
      b.done = true;
      this.stats.built++;
    }
    const cx = x + def.w / 2;
    const cy = y + def.h / 2;
    let workers = this.units.filter((u) => u.sel && !u.child && u.spawn <= 0);
    if (!workers.length) {
      workers = this.units
        .filter((u) => !u.child && u.spawn <= 0 && u.task.type === 'idle')
        .sort((a, c) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(c.x - cx, c.y - cy))
        .slice(0, 2);
    }
    for (const u of workers) this.setTask(u, { type: 'build', tx: Math.floor(cx), ty: Math.floor(cy), site: b.id, auto: false });
    this.sfx('place', cx * TW, cy * TH);
    for (let i = 0; i < 10; i++) this.spark(cx * TW, (y + def.h) * TH - 2, '#f0d890');
    if (!workers.length) this.msg('Стройка заложена — отправьте людей строить (ПКМ по стройке)', 'info');
    return true;
  }

  demolish(id: number) {
    const b = this.buildings.find((q) => q.id === id);
    if (!b || b.type === 'camp' || b.type === 'manor') return;
    const def = BUILDINGS[b.type];
    const k = b.done ? 0.5 : 1;
    for (const r of STORED) this.res[r] += Math.floor((def.cost[r] ?? 0) * k);
    for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) this.world.blocked[yy * this.world.w + xx] = 0;
    this.buildings = this.buildings.filter((q) => q.id !== id);
    this.selBuilding = null;
    this.msg(b.done ? 'Здание разобрано' : 'Стройка отменена', 'info');
  }

  /* ---------- Приказы ---------- */

  selUnits() {
    return this.units.filter((u) => u.sel && u.spawn <= 0 && !u.child);
  }

  selGuards() {
    return this.guards.filter((u) => u.sel);
  }

  /** приказ воинам: идти / атаковать / держать позицию */
  guardMove(list: Unit[], wx: number, wy: number) {
    const n = list.length;
    const cols = Math.ceil(Math.sqrt(n));
    const tx = wx / TW;
    const ty = wy / TH;
    list.forEach((u, i) => {
      const cx = (i % cols) - (cols - 1) / 2;
      const cy = Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2;
      let x = tx + cx * 1.05;
      let y = ty + cy * 0.9;
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      if (ix < 1 || iy < 1 || ix >= this.world.w - 1 || iy >= this.world.h - 1 || this.world.blocked[iy * this.world.w + ix] || this.world.biome[iy * this.world.w + ix] <= B.WATER) {
        x = tx;
        y = ty;
      }
      u.order = { kind: 'move', x, y };
      u.gTarget = undefined;
      u.visit = undefined;
      u.sleeping = false;
    });
    this.ping(Math.floor(tx), Math.floor(ty), '#7ab8ff');
    this.sfx('click');
  }

  guardAttack(list: Unit[], tk: 'raider' | 'animal', id: number, x: number, y: number) {
    for (const u of list) {
      u.order = { kind: 'attack', x, y, tk, tid: id };
      u.gTarget = undefined;
      u.visit = undefined;
      u.sleeping = false;
    }
    this.ping(Math.floor(x), Math.floor(y), '#ff5a4a');
    this.sfx('horn');
  }

  guardHold(list: Unit[]) {
    for (const u of list) u.order = { kind: 'hold', x: u.x, y: u.y };
  }

  guardPatrol(list: Unit[]) {
    for (const u of list) {
      u.order = undefined;
      u.wander = 0.5;
    }
  }

  holdSelected() {
    const gs = this.selGuards();
    if (!gs.length) return;
    this.guardHold(gs);
    this.msg(`Воины держат позицию (${gs.length})`, 'info');
    this.emit(true);
  }

  selectArmy() {
    this.clearSel();
    for (const u of this.guards) if (!u.sleeping) u.sel = true;
    if (!this.guards.length) this.msg('Армии пока нет — обучите воинов (панель «Война»)', 'warn');
    this.emit(true);
  }

  setTask(u: Unit, t: Task) {
    u.task = t;
    u.path = [];
    u.phase = 'goto';
    u.timer = 0;
    u.swing = 0;
  }

  setIdle(u: Unit) {
    this.setTask(u, { type: 'idle', tx: 0, ty: 0, site: 0, auto: false });
    u.wander = 1 + Math.random() * 3;
  }

  ping(tx: number, ty: number, color = '#ffe27a') {
    this.pings.push({ x: (tx + 0.5) * TW, y: (ty + 0.7) * TH, t: 0, color });
  }

  isChoppable(o: Obj | null) {
    return !!o && (o.kind === 'tree' || o.kind === 'palm' || o.kind === 'cactus') && o.amount > 0;
  }

  orderChop(units: Unit[], tx: number, ty: number, auto: boolean) {
    const o = this.objAt(tx, ty);
    if (!this.isChoppable(o)) return;
    o!.marked = true;
    this.marked.add(ty * this.world.w + tx);
    this.bad.delete(ty * this.world.w + tx);
    for (const u of units) this.setTask(u, { type: 'chop', tx, ty, site: 0, auto });
    this.ping(tx, ty, '#ff9a4a');
  }

  orderGather(units: Unit[], tx: number, ty: number) {
    for (const u of units) this.setTask(u, { type: 'gather', tx, ty, site: 0, auto: true });
    this.ping(tx, ty, '#ff6a8a');
  }

  orderMine(units: Unit[], tx: number, ty: number) {
    if (!this.done.has('stone_tools')) {
      this.msg('Для добычи камня изучите «Каменные орудия»', 'warn');
      return;
    }
    for (const u of units) this.setTask(u, { type: 'mine', tx, ty, site: 0, auto: true });
    this.ping(tx, ty, '#b4bccc');
  }

  orderBuild(units: Unit[], b: Building) {
    for (const u of units) this.setTask(u, { type: 'build', tx: b.x, ty: b.y, site: b.id, auto: false });
    this.ping(b.x + Math.floor(b.w / 2), b.y + b.h - 1, '#8aff9a');
  }

  orderMove(units: Unit[], tx: number, ty: number) {
    const spots = this.freeTilesNear(tx, ty, units.length);
    units.forEach((u, i) => {
      const s = spots[i] ?? { x: tx, y: ty };
      this.setTask(u, { type: 'move', tx: s.x, ty: s.y, site: 0, auto: false });
      const p = this.pf.find(this.world.blocked, Math.floor(u.x), Math.floor(u.y), (x, y) => x === s.x && y === s.y, s.x, s.y, true, 4000);
      u.path = p ?? [];
    });
    this.ping(tx, ty, '#ffffff');
  }

  contextCommand(wx: number, wy: number) {
    const sel = this.selUnits();
    const gsel = this.selGuards();
    if (gsel.length) {
      const tg = targetAt(this, wx / TW, wy / TH);
      if (tg) this.guardAttack(gsel, tg.tk, tg.id, wx / TW, wy / TH);
      else this.guardMove(gsel, wx, wy);
    }
    if (!sel.length) return;
    const tx = Math.floor(wx / TW);
    const ty = Math.floor(wy / TH);
    const o = this.pickObj(wx, wy);
    const bld = this.pickBuilding(wx, wy);
    if (o && this.isChoppable(o)) this.orderChop(sel, o.tx, o.ty, true);
    else if (o && o.kind === 'bush' && o.amount > 0) this.orderGather(sel, o.tx, o.ty);
    else if (o && o.kind === 'rock') this.orderMine(sel, o.tx, o.ty);
    else if (bld && !bld.done) this.orderBuild(sel, bld);
    else this.orderMove(sel, tx, ty);
  }

  applyArea(tool: 'chop' | 'gather' | 'mine', x0: number, y0: number, x1: number, y1: number) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const w = this.world;
    const found: Obj[] = [];
    const tx0 = Math.max(0, Math.floor(minX / TW) - 2);
    const tx1 = Math.min(w.w - 1, Math.floor(maxX / TW) + 2);
    const ty0 = Math.max(0, Math.floor(minY / TH) - 1);
    const ty1 = Math.min(w.h - 1, Math.floor(maxY / TH) + 5);
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const o = w.objs[ty * w.w + tx];
        if (!o) continue;
        const ok = tool === 'chop' ? this.isChoppable(o) && o.kind !== 'cactus' : tool === 'gather' ? o.kind === 'bush' && o.amount > 0 : o.kind === 'rock';
        if (!ok) continue;
        const s = this.spr[o.spr];
        const bx = (tx + 0.5) * TW;
        const by = (ty + 0.5) * TH;
        const cxm = bx;
        const cym = (ty + 0.9) * TH - s.height * 0.55;
        const inside = (px: number, py: number) => px >= minX && px <= maxX && py >= minY && py <= maxY;
        if (inside(bx, by) || inside(cxm, cym)) found.push(o);
      }
    if (!found.length) return;
    if (tool === 'mine' && !this.done.has('stone_tools')) {
      this.msg('Для добычи камня изучите «Каменные орудия»', 'warn');
      return;
    }
    if (tool === 'chop') {
      for (const o of found) {
        o.marked = true;
        this.marked.add(o.ty * w.w + o.tx);
        this.bad.delete(o.ty * w.w + o.tx);
      }
    }
    const workers = this.selUnits();
    if (!workers.length) {
      this.msg('Сначала выберите людей — потом отдайте приказ', 'warn');
      return;
    }
    const taken = new Set<number>();
    for (const u of workers) {
      let best: Obj | null = null;
      let bd = 1e9;
      for (const o of found) {
        if (taken.has(o.id)) continue;
        const d = Math.hypot(o.tx + 0.5 - u.x, o.ty + 0.5 - u.y);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      if (!best) {
        taken.clear();
        for (const o of found) {
          const d = Math.hypot(o.tx + 0.5 - u.x, o.ty + 0.5 - u.y);
          if (d < bd) {
            bd = d;
            best = o;
          }
        }
      }
      if (!best) continue;
      taken.add(best.id);
      this.setTask(u, { type: tool, tx: best.tx, ty: best.ty, site: 0, auto: tool !== 'chop' });
    }
    this.msg(tool === 'chop' ? `Рубить: деревьев отмечено — ${found.length}` : tool === 'gather' ? `Собирать: кустов — ${found.length}` : `Добывать: камней — ${found.length}`, 'info');
  }

  /* ---------- Выбор ---------- */

  clearSel() {
    for (const u of this.units) u.sel = false;
    for (const u of this.guards) u.sel = false;
    this.selBuilding = null;
    this.selTown = null;
  }

  selectUnit(id: number, add = false) {
    if (!add) this.clearSel();
    const u = this.units.find((q) => q.id === id) ?? this.guards.find((q) => q.id === id);
    if (u && u.spawn <= 0) {
      u.sel = true;
      this.selBuilding = null;
    }
    this.emit(true);
  }

  selectAll() {
    this.clearSel();
    for (const u of this.units) if (!u.child && u.spawn <= 0) u.sel = true;
    this.emit(true);
  }

  selectIdle() {
    this.clearSel();
    for (const u of this.units) if (!u.child && u.spawn <= 0 && u.task.type === 'idle') u.sel = true;
    this.emit(true);
  }

  stopSelected() {
    for (const u of this.selUnits()) this.setIdle(u);
    this.guardPatrol(this.selGuards());
    this.emit(true);
  }

  unitBox(u: Unit) {
    return { x: u.x * TW - 8, y: u.y * TH - 18, w: 16, h: 21 };
  }

  pickUnit(wx: number, wy: number): Unit | null {
    let best: Unit | null = null;
    for (const u of [...this.units, ...this.guards]) {
      if (u.spawn > 0 || u.sleeping) continue;
      const b = this.unitBox(u);
      if (wx >= b.x - 1 && wx <= b.x + b.w + 1 && wy >= b.y - 1 && wy <= b.y + b.h + 1) {
        if (!best || u.y > best.y) best = u;
      }
    }
    return best;
  }

  alphaAt(cv: Cv, x: number, y: number) {
    if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return 0;
    let d = this.alphaCache.get(cv);
    if (!d) {
      d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      this.alphaCache.set(cv, d);
    }
    return d[(y * cv.width + x) * 4 + 3];
  }

  pickObj(wx: number, wy: number): Obj | null {
    const w = this.world;
    const tx0 = Math.floor(wx / TW);
    const ty0 = Math.floor(wy / TH);
    for (let ty = Math.min(w.h - 1, ty0 + 5); ty >= Math.max(0, ty0 - 1); ty--) {
      for (let tx = Math.max(0, tx0 - 2); tx <= Math.min(w.w - 1, tx0 + 2); tx++) {
        const o = w.objs[ty * w.w + tx];
        if (!o || o.kind === 'stump') continue;
        const s = this.spr[o.spr];
        const dx = Math.round((tx + 0.5) * TW - s.width / 2);
        const dy = Math.round((ty + 0.9) * TH - s.height);
        const lx = Math.floor(wx - dx);
        const ly = Math.floor(wy - dy);
        if (this.alphaAt(s, lx, ly) > 40) return o;
      }
    }
    return null;
  }

  pickTown(wx: number, wy: number): Town | null {
    let best: Town | null = null;
    let bd = 1;
    for (const t of this.towns) {
      const dx = (wx - (t.x + 0.5) * TW) / (5 * TW);
      const dy = (wy - (t.y + 0.5) * TH) / (5 * TH);
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  pickBuilding(wx: number, wy: number): Building | null {
    let best: Building | null = null;
    for (const b of this.buildings) {
      const s = this.bspr.cv[b.type];
      const dx = b.x * TW + (b.w * TW) / 2 - s.width / 2;
      const dy = (b.y + b.h) * TH - s.height;
      if (wx >= dx && wx <= dx + s.width && wy >= dy && wy <= dy + s.height) {
        if (this.alphaAt(s, Math.floor(wx - dx), Math.floor(wy - dy)) > 40 || (wx >= b.x * TW && wx < (b.x + b.w) * TW && wy >= b.y * TH && wy < (b.y + b.h) * TH)) {
          if (!best || b.y > best.y) best = b;
        }
      }
    }
    return best;
  }

  /* ---------- Камера ---------- */

  clampCam() {
    const W = this.world.w * TW;
    const H = this.world.h * TH;
    const vw = this.cw / this.scale;
    const vh = this.ch / this.scale;
    this.cam.x = vw >= W ? W / 2 : Math.min(W - vw / 2, Math.max(vw / 2, this.cam.x));
    this.cam.y = vh >= H ? H / 2 : Math.min(H - vh / 2, Math.max(vh / 2, this.cam.y));
  }

  centerOn(wx: number, wy: number) {
    this.cam.x = wx;
    this.cam.y = wy;
    this.clampCam();
  }

  setZoom(z: number) {
    this.zoom = Math.max(2, Math.min(5, z));
    this.scale = Math.max(1, Math.round(this.zoom * this.dpr));
    this.clampCam();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.cw = Math.max(200, Math.floor(r.width * this.dpr));
    this.ch = Math.max(200, Math.floor(r.height * this.dpr));
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.scale = Math.max(1, Math.round(this.zoom * this.dpr));
  }

  screenToWorld(sx: number, sy: number) {
    return { x: this.viewLeft + sx / this.scale, y: this.viewTop + sy / this.scale };
  }

  /* ---------- Управление и ввод ---------- */

  setTool(t: Tool) {
    if ((t === 'chop' || t === 'gather' || t === 'mine') && this.selUnits().length === 0) {
      this.msg('Сначала выберите людей (клик или рамка), потом отдайте приказ', 'warn');
      return;
    }
    this.tool = t;
    if (t !== 'build') this.buildType = null;
    this.emit(true);
  }

  setBuildType(id: BuildingId | null) {
    if (id && !this.isUnlocked(id)) {
      this.msg('Это здание ещё не изучено', 'warn');
      return;
    }
    this.buildType = id;
    this.tool = id ? 'build' : 'select';
    this.emit(true);
  }

  setSpeed(s: number) {
    this.speed = s;
    this.paused = false;
    this.emit(true);
  }

  setPaused(p: boolean) {
    this.paused = p;
    this.emit(true);
  }

  ghostPos() {
    if (!this.buildType) return { x: 0, y: 0 };
    const d = BUILDINGS[this.buildType];
    return { x: Math.round(this.mouse.wx / TW - d.w / 2), y: Math.round(this.mouse.wy / TH - d.h / 2) };
  }

  private pointerPos(e: PointerEvent | WheelEvent | MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) * (this.cw / r.width);
    const sy = (e.clientY - r.top) * (this.ch / r.height);
    const w = this.screenToWorld(sx, sy);
    this.mouse.sx = sx;
    this.mouse.sy = sy;
    this.mouse.wx = w.x;
    this.mouse.wy = w.y;
  }

  private onDown = (e: PointerEvent) => {
    if (this.mode !== 'play') return;
    this.pointerPos(e);
    this.canvas.setPointerCapture(e.pointerId);
    if (e.button === 1) {
      this.panDrag = { sx: this.mouse.sx, sy: this.mouse.sy };
      e.preventDefault();
      return;
    }
    if (e.button === 2) {
      if (this.tool !== 'select') this.setTool('select');
      else this.contextCommand(this.mouse.wx, this.mouse.wy);
      return;
    }
    if (e.button !== 0) return;
    if (this.tool === 'claim') {
      claimLand(this, Math.floor(this.mouse.wx / TW), Math.floor(this.mouse.wy / TH));
      return;
    }
    if (this.tool === 'estate') {
      placeEstate(this, Math.round(this.mouse.wx / TW - 1.5), Math.round(this.mouse.wy / TH - 1.5));
      return;
    }
    if (this.tool === 'build' && this.buildType) {
      const g = this.ghostPos();
      const ok = this.placeBuilding(this.buildType, g.x, g.y);
      if (ok && !e.shiftKey) {
        // продолжаем строить такие же, пока хватает ресурсов
        if (!this.canAfford(this.buildType)) this.setTool('select');
      }
      return;
    }
    this.drag = { sx: this.mouse.sx, sy: this.mouse.sy, wx: this.mouse.wx, wy: this.mouse.wy, shift: e.shiftKey };
  };

  private onMove = (e: PointerEvent) => {
    this.pointerPos(e);
    this.mouse.inside = true;
    if (this.panDrag) {
      this.cam.x -= (this.mouse.sx - this.panDrag.sx) / this.scale;
      this.cam.y -= (this.mouse.sy - this.panDrag.sy) / this.scale;
      this.panDrag = { sx: this.mouse.sx, sy: this.mouse.sy };
      this.clampCam();
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointerPos(e);
    if (e.button === 1) {
      this.panDrag = null;
      return;
    }
    if (e.button !== 0 || !this.drag) return;
    const d = this.drag;
    this.drag = null;
    const moved = Math.hypot(this.mouse.sx - d.sx, this.mouse.sy - d.sy) > 6 * this.dpr;
    const x0 = d.wx;
    const y0 = d.wy;
    const x1 = this.mouse.wx;
    const y1 = this.mouse.wy;
    if (this.tool === 'chop' || this.tool === 'gather' || this.tool === 'mine') {
      if (moved) this.applyArea(this.tool, x0, y0, x1, y1);
      else {
        const o = this.pickObj(x1, y1);
        if (o) this.applyArea(this.tool, (o.tx + 0.5) * TW - 1, (o.ty + 0.5) * TH - 1, (o.tx + 0.5) * TW + 1, (o.ty + 0.5) * TH + 1);
      }
      return;
    }
    if (moved) {
      const minX = Math.min(x0, x1);
      const maxX = Math.max(x0, x1);
      const minY = Math.min(y0, y1);
      const maxY = Math.max(y0, y1);
      if (!d.shift) this.clearSel();
      for (const u of this.units) {
        if (u.child || u.spawn > 0) continue;
        const px = u.x * TW;
        const py = u.y * TH - 6;
        if (px >= minX && px <= maxX && py >= minY && py <= maxY) u.sel = true;
      }
      for (const u of this.guards) {
        if (u.sleeping) continue;
        const px = u.x * TW;
        const py = u.y * TH - 6;
        if (px >= minX && px <= maxX && py >= minY && py <= maxY) u.sel = true;
      }
      this.emit(true);
      return;
    }
    const u = this.pickUnit(x1, y1);
    if (u && !u.child) {
      const now = performance.now();
      if (this.lastClick.id === u.id && now - this.lastClick.t < 380) {
        // двойной клик — выбрать всех
        this.selectAll();
        this.lastClick.id = -1;
        return;
      }
      this.lastClick = { t: now, id: u.id };
      if (!d.shift) this.clearSel();
      u.sel = true;
      this.selBuilding = null;
    } else if (u && u.child) {
      this.clearSel();
    } else {
      const tn = this.pickTown(x1, y1);
      const b = tn ? null : this.pickBuilding(x1, y1);
      if (!d.shift) this.clearSel();
      if (tn) {
        this.selTown = tn.id;
        this.onOpenTown?.(tn.id);
      } else if (b) this.selBuilding = b.id;
    }
    this.emit(true);
  };

  private onWheel = (e: WheelEvent) => {
    if (this.mode !== 'play') return;
    e.preventDefault();
    this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1));
  };

  private onLeave = () => {
    this.mouse.inside = false;
  };

  private onCtx = (e: Event) => e.preventDefault();

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.mode !== 'play') return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    this.keys.add(e.code);
    if (this.uiLock && e.code !== 'Escape' && e.code !== 'KeyT' && e.code !== 'KeyV' && e.code !== 'KeyK' && e.code !== 'KeyN' && e.code !== 'KeyM' && e.code !== 'Backquote') return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.setPaused(!this.paused);
        break;
      case 'Escape':
        if (this.tool !== 'select') this.setTool('select');
        else this.onHotkey?.('escape');
        break;
      case 'KeyQ':
        this.setTool(this.tool === 'chop' ? 'select' : 'chop');
        break;
      case 'KeyE':
        this.setTool(this.tool === 'gather' ? 'select' : 'gather');
        break;
      case 'KeyR':
        this.setTool(this.tool === 'mine' ? 'select' : 'mine');
        break;
      case 'KeyT':
        this.onHotkey?.('tree');
        break;
      case 'KeyB':
        this.onHotkey?.('build');
        break;
      case 'KeyV':
        this.onHotkey?.('world');
        break;
      case 'KeyM':
        this.onHotkey?.('eco');
        break;
      case 'Backquote':
        this.onHotkey?.('dev');
        break;
      case 'KeyO':
        this.borderMode = this.borderMode === 'off' ? 'settle' : this.borderMode === 'settle' ? 'state' : 'off';
        this.msg(`Границы: ${this.borderMode === 'off' ? 'скрыты' : this.borderMode === 'settle' ? 'селений' : 'государства'}`, 'info');
        this.emit(true);
        break;
      case 'KeyN':
        this.onHotkey?.('life');
        break;
      case 'KeyL':
        this.setTool(this.tool === 'claim' ? 'select' : 'claim');
        break;
      case 'KeyK':
        this.onHotkey?.('court');
        break;
      case 'KeyH':
        this.onHotkey?.('hideui');
        break;
      case 'KeyJ':
        this.autoAssign();
        break;
      case 'KeyG':
        this.selectAll();
        break;
      case 'KeyF':
        this.selectIdle();
        break;
      case 'KeyX':
        this.stopSelected();
        break;
      case 'KeyC':
        this.selectArmy();
        break;
      case 'KeyZ':
        this.holdSelected();
        break;
      case 'Digit1':
        this.setSpeed(1);
        break;
      case 'Digit2':
        this.setSpeed(2);
        break;
      case 'Digit3':
        this.setSpeed(4);
        break;
      case 'Delete':
        if (this.selBuilding) this.demolish(this.selBuilding);
        break;
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => this.keys.clear();

  attach() {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointerleave', this.onLeave);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('contextmenu', this.onCtx);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('contextmenu', this.onCtx);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  /* ---------- Цикл ---------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (t - this.last) / 1000);
      this.last = t;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  frame(dt: number) {
    if (!this.world) return;
    this.waterT += dt;
    this.fdt = dt;
    // камера
    if (this.mode === 'play') {
      let mx = 0;
      let my = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
      if (mx || my) {
        const sp = (420 / this.zoom) * dt;
        this.cam.x += mx * sp;
        this.cam.y += my * sp;
      }
      this.clampCam();
      if (!this.paused && !this.gameOver) {
        const steps = this.speed * (this.dev.speedMult > 1 ? this.dev.speedMult : 1);
        for (let i = 0; i < steps; i++) this.update(dt);
      } else {
        this.updateParticles(dt * 0.0);
      }
      if (this.introT > 0) this.introT -= dt;
    } else {
      this.menuT += dt;
      const W = this.world.w * TW;
      const H = this.world.h * TH;
      this.cam.x = W / 2 + Math.sin(this.menuT * 0.045) * W * 0.28;
      this.cam.y = H / 2 + Math.cos(this.menuT * 0.037) * H * 0.26;
      this.clampCam();
      this.updateParticles(dt);
    }
    // наведение
    if (this.mode === 'play' && this.mouse.inside) {
      const w = this.screenToWorld(this.mouse.sx, this.mouse.sy);
      this.mouse.wx = w.x;
      this.mouse.wy = w.y;
      this.hoverUnit = this.pickUnit(w.x, w.y);
      this.hoverObj = this.hoverUnit ? null : this.pickObj(w.x, w.y);
      this.hoverBuilding = this.hoverUnit || this.hoverObj ? null : this.pickBuilding(w.x, w.y);
      this.hoverTown = this.hoverUnit || this.hoverObj || this.hoverBuilding ? null : this.pickTown(w.x, w.y);
    } else {
      this.hoverTown = null;
      this.hoverUnit = null;
      this.hoverObj = null;
      this.hoverBuilding = null;
    }
    renderFrame(this, dt);
    {
      const light = Math.max(0, Math.min(1, 0.5 + 0.55 * Math.sin((this.dayT - 0.25) * Math.PI * 2)));
      const night = Math.max(0, Math.min(1, (0.62 - light) / 0.62));
      const camp = this.buildings[0];
      const fireNear = this.mode === 'play' && !!camp && Math.hypot((camp.x + 1) * TW - this.cam.x, (camp.y + 1) * TH - this.cam.y) < 110;
      audio.ambience(dt, this.mode === 'play' && !this.paused, night, fireNear);
      audio.music(this.mode === 'menu' ? 'menu' : this.marches.length ? 'war' : 'game');
    }
    this.emitT += dt;
    if (this.emitT > 0.2) {
      this.emitT = 0;
      this.emit();
    }
  }

  /* ---------- Симуляция ---------- */

  update(dt: number) {
    this.time += dt;
    this.dayT = this.dev.alwaysDay ? 0.5 : (this.dayT + dt / DAY_LENGTH) % 1;
    this.badT += dt;
    if (this.badT > 25) {
      this.badT = 0;
      this.bad.clear();
    }
    for (const u of this.units) this.updateUnit(u, dt);
    for (const u of this.units) footFx(this, u, dt);
    for (const u of this.guards) footFx(this, u, dt);
    for (const r of this.life.raiders) footFx(this, r.unit, dt);
    updatePrints(this, dt);
    marchFx(this, dt);
    for (const [k, v] of this.fieldPulse) {
      if (v <= dt) this.fieldPulse.delete(k);
      else this.fieldPulse.set(k, v - dt);
    }
    this.updateEconomy(dt);
    updateTowns(this, dt);
    socialUpdate(this, dt);
    updateFolk(this, dt);
    lifeUpdate(this, dt);
    // ягоды отрастают
    for (let i = this.regrow.length - 1; i >= 0; i--) {
      const o = this.regrow[i];
      o.regrow -= dt;
      if (o.regrow <= 0) {
        o.spr = 'bush';
        o.amount = 6;
        this.regrow.splice(i, 1);
      }
    }
    for (const b of this.buildings) {
      if (!b.done) continue;
      b.smokeT -= dt;
      const sm = this.bspr.smoke[b.type];
      if (sm && b.smokeT <= 0 && (BUILDINGS[b.type].housing > 0 || b.type === 'lodge' || b.type === 'forge' || (!!BUILDINGS[b.type].prod && this.jobsInfo.labor > 0.05))) {
        b.smokeT = 0.9 + Math.random() * 0.8;
        const s = this.bspr.cv[b.type];
        const dx = b.x * TW + (b.w * TW) / 2 - s.width / 2;
        const dy = (b.y + b.h) * TH - s.height;
        this.particles.push({ x: dx + sm.x + 0.5, y: dy + sm.y, vx: 1.5 + windAt(this, dx) * 9 + Math.random() * 2, vy: -7 - Math.random() * 3, life: 2.8, max: 2.8, color: 'rgba(214,214,226,0.65)', size: 2, grav: 0, grow: 4 });
      }
      const fire = this.bspr.fire[b.type];
      if (fire && Math.random() < dt * 5) {
        const s = this.bspr.cv[b.type];
        const dx = b.x * TW + (b.w * TW) / 2 - s.width / 2;
        const dy = (b.y + b.h) * TH - s.height;
        this.particles.push({ x: dx + fire.x + (Math.random() - 0.5) * 3, y: dy + fire.y - 8, vx: (Math.random() - 0.5) * 2, vy: -12 - Math.random() * 6, life: 0.9, max: 0.9, color: Math.random() < 0.5 ? '#ffb040' : '#ff7a2a', size: 1, grav: 0 });
      }
    }
    this.updateParticles(dt);
    for (let i = this.pings.length - 1; i >= 0; i--) {
      this.pings[i].t += dt;
      if (this.pings[i].t > 0.7) this.pings.splice(i, 1);
    }
    // квесты
    this.checkQuests();
    if (!this.units.length && this.army + this.awayCount() <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.msg('Племя исчезло...', 'warn');
    }
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
  }

  spark(x: number, y: number, color: string, n = 1) {
    for (let i = 0; i < n; i++)
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 24, vy: -8 - Math.random() * 16, life: 0.5 + Math.random() * 0.3, max: 0.8, color, size: 1, grav: 60 });
  }

  floatText(x: number, y: number, text: string, color: string) {
    this.particles.push({ x, y, vx: 0, vy: -10, life: 1.2, max: 1.2, color, size: 0, grav: 0, text });
  }

  awayCount() {
    let n = 0;
    for (const m of this.marches) if (!m.incoming) n += m.phase === 'go' ? m.n : m.survivors;
    return n;
  }

  totalPop() {
    return this.units.filter((u) => u.spawn <= 0).length + this.army + this.awayCount();
  }

  refreshMods() {
    this.mods = computeMods(this.done, this.spec, this.gov, this.tierIdx);
    if (this.soc) {
      applySoc(this, this.mods);
      this.mods.loyalty += DIFFS[this.diff].loyal;
    }
    if (this.life) lifeApplyMods(this, this.mods);
  }

  onTownsChanged() {
    const prov = this.towns.filter((t) => t.owner === 'player').length;
    if (prov > 0 && !this.gov) {
      this.needGov = true;
      this.onNeedGov?.();
    }
    if (prov === 0 && this.stateFormed) {
      this.gov = null;
      this.stateFormed = false;
      this.needGov = false;
      this.refreshMods();
      this.msg('Государство распалось — вы снова одинокое селение', 'warn');
    }
    this.emit(true);
  }

  sfx(name: Sfx, wx?: number, wy?: number) {
    if (wx === undefined || wy === undefined) {
      audio.play(name);
      return;
    }
    const vw = this.cw / this.scale;
    const vh = this.ch / this.scale;
    const dx = wx - this.cam.x;
    const dy = wy - this.cam.y;
    if (Math.abs(dx) > vw * 0.62 || Math.abs(dy) > vh * 0.62) return;
    const d = Math.hypot(dx / (vw * 0.62), dy / (vh * 0.62));
    audio.play(name, { vol: Math.max(0.12, 1 - d * 0.65), pan: dx / (vw * 0.6) });
  }

  capOf() {
    let c = 150;
    for (const b of this.buildings) if (b.done) c += BUILDINGS[b.type].cap ?? 0;
    return Math.floor(c * this.mods.cap);
  }

  marketCount() {
    return this.buildings.filter((b) => b.done && b.type === 'market').length;
  }

  tradeFee() {
    const m = this.marketCount();
    return Math.max(0.08, Math.min(0.3, 0.3 - 0.04 * Math.max(0, m - 1) - (this.mods.gold - 1) * 0.12));
  }

  /** продажа / покупка на рынке */
  trade(k: ResKey, amount: number, mode: 'sell' | 'buy'): string | null {
    if (this.marketCount() < 1) return 'Постройте рынок (нужна технология «Мена»)';
    const fee = this.tradeFee();
    const base = RES_INFO[k].base;
    let px = this.prices[k];
    let n = 0;
    let gold = 0;
    if (mode === 'sell') {
      const have = Math.floor(this.res[k]);
      for (let i = 0; i < amount && i < have; i++) {
        gold += base * px * (1 - fee);
        px = Math.max(0.45, px * 0.996);
        n++;
      }
      if (!n) return `Нет товара: ${RES_INFO[k].name.toLowerCase()}`;
      this.spend(k, n);
      this.gain('gold', gold);
      this.stats.traded += gold;
      this.prices[k] = px;
      this.sfx('coin');
      this.floatText((this.buildings[0].x + 1) * TW, this.buildings[0].y * TH - 6, `+${Math.round(gold)} зол.`, '#ffe27a');
      this.emit(true);
      return null;
    }
    const room = this.dev.noCap || this.dev.infinite ? 99999 : Math.floor(this.capVal - this.res[k]);
    for (let i = 0; i < amount && i < room; i++) {
      const c = base * px * (1 + fee);
      if (this.res.gold < gold + c) break;
      gold += c;
      px = Math.min(2.2, px * 1.004);
      n++;
    }
    if (!n) return room <= 0 ? 'Склад полон — стройте склады' : 'Не хватает золота';
    this.spend('gold', gold);
    this.gain(k, n);
    this.prices[k] = px;
    this.sfx('coin');
    this.emit(true);
    return null;
  }

  /* ---------- Распределение работ ---------- */

  adultUnits() {
    return this.units.filter((u) => !u.child && u.spawn <= 0);
  }

  countWorkers() {
    const w = { chop: 0, gather: 0, mine: 0, build: 0, idle: 0, other: 0 };
    for (const u of this.adultUnits()) {
      const t = u.task.type;
      if (t === 'chop' || t === 'gather' || t === 'mine' || t === 'build' || t === 'idle') w[t]++;
      else w.other++;
    }
    return w;
  }

  nearestObj(kind: 'chop' | 'gather' | 'mine', fx: number, fy: number): Obj | null {
    const pred = (o: Obj) => (kind === 'chop' ? (o.kind === 'tree' || o.kind === 'palm') && o.amount > 0 : kind === 'gather' ? o.kind === 'bush' && o.amount > 0 : o.kind === 'rock' && o.amount > 0);
    let best: Obj | null = null;
    let bd = 1e9;
    for (const r of [8, 14, 22, 34, 50]) {
      this.scanFor(Math.floor(fx), Math.floor(fy), r, pred, (o) => {
        if (this.bad.has(o.ty * this.world.w + o.tx)) return;
        const d = (o.tx - fx) ** 2 + (o.ty - fy) ** 2;
        if (d < bd) {
          bd = d;
          best = o;
        }
      });
      if (best) break;
    }
    return best;
  }

  /** +1 / −1 работник на выбранный вид работ */
  assignJob(kind: 'chop' | 'gather' | 'mine', delta: number): string | null {
    if (delta < 0) {
      const cand = this.adultUnits().filter((u) => u.task.type === kind).sort((a, b) => a.carry.n - b.carry.n);
      if (!cand.length) return null;
      this.setIdle(cand[0]);
      this.emit(true);
      return null;
    }
    if (kind === 'mine' && !this.done.has('stone_tools')) return 'Для добычи камня изучите «Каменные орудия»';
    const idle = this.adultUnits().filter((u) => (u.task.type === 'idle' || u.task.type === 'move') && u.role === 'none' && !u.sleeping);
    if (!idle.length) return 'Нет свободных людей — снимите кого-то с другой работы';
    const camp = this.buildings[0];
    const o = this.nearestObj(kind, camp.x + 1, camp.y + 1);
    if (!o) return kind === 'chop' ? 'Рядом нет деревьев' : kind === 'gather' ? 'Рядом нет ягод' : 'Рядом нет камней';
    idle.sort((a, b) => Math.hypot(a.x - o.tx, a.y - o.ty) - Math.hypot(b.x - o.tx, b.y - o.ty));
    const u = idle[0];
    if (kind === 'chop') this.orderChop([u], o.tx, o.ty, true);
    else if (kind === 'gather') this.orderGather([u], o.tx, o.ty);
    else this.orderMine([u], o.tx, o.ty);
    this.emit(true);
    return null;
  }

  /** автоматически раздать свободным людям работу по нехватке ресурсов */
  autoAssign(): string | null {
    const idle = this.adultUnits().filter((u) => u.task.type === 'idle' && u.role === 'none').length;
    if (!idle) return 'Свободных людей нет';
    const stock = { chop: this.res.wood, gather: this.res.food, mine: this.res.stone };
    const want = { chop: 120, gather: 110 + (this.foodRate < 0 ? 80 : 0), mine: this.done.has('stone_tools') ? 80 : 0 };
    // мастерские забирают часть свободных — оставим им работников
    const keep = Math.min(this.jobsInfo.total, Math.floor(idle * 0.4));
    let n = 0;
    for (let i = 0; i < idle - keep; i++) {
      let best: 'chop' | 'gather' | 'mine' = 'chop';
      let bs = -1e9;
      for (const k of ['chop', 'gather', 'mine'] as const) {
        if (!want[k]) continue;
        const sc = (want[k] - stock[k]) / want[k];
        if (sc > bs) {
          bs = sc;
          best = k;
        }
      }
      if (this.assignJob(best, 1)) break;
      stock[best] += 30;
      n++;
    }
    if (n) this.msg(`Авто-распределение: ${n} чел. отправлены на работу`, 'good');
    return n ? null : 'Не нашлось подходящей работы';
  }

  updateEconomy(dt: number) {
    const dev = this.dev;
    const adultsL = this.adultUnits();
    const adults = adultsL.length;
    const kids = this.units.filter((u) => u.child).length;
    const pop = this.totalPop();
    const soldiers = this.army + this.awayCount();
    const idle = adultsL.filter((u) => u.task.type === 'idle').length;
    let working = 0;
    for (const u of adultsL) if (u.phase === 'work' && (u.task.type === 'chop' || u.task.type === 'gather' || u.task.type === 'mine' || u.task.type === 'build')) working++;
    this.workers = this.countWorkers();

    // --- здания: еда, знания, золото, содержание, рабочие места
    let foodProd = 0;
    let know = 0;
    let goldIn = 0;
    let upkeep = 0;
    let jobs = 0;
    for (const b of this.buildings) {
      if (!b.done) continue;
      const d = BUILDINGS[b.type];
      if (d.food) foodProd += d.food * (b.type === 'farm' ? this.mods.farm : this.mods.lodge);
      if (d.know) know += d.know;
      if (d.gold) goldIn += d.gold;
      if (d.upkeep) upkeep += d.upkeep;
      if (d.prod) jobs += d.jobs ?? 0;
    }

    // --- производство товаров: свободные жители становятся к станкам
    const labor = jobs > 0 ? Math.min(1, idle / jobs) : 0;
    this.jobsInfo = { total: jobs, staffed: Math.min(idle, jobs), labor };
    const payK = this.unpaid ? 0.6 : 1;
    const goodsFull = !dev.noCap && !dev.infinite && this.res.goods >= this.capVal;
    for (const b of this.buildings) {
      if (!b.done) continue;
      const d = BUILDINGS[b.type];
      if (!d.prod || goodsFull) continue;
      let f = labor * payK;
      if (f <= 0) continue;
      for (const k of Object.keys(d.prod.in) as ResKey[]) {
        const need = (d.prod.in[k] ?? 0) * dt * f;
        if (need > 0 && this.res[k] < need) f *= this.res[k] / need;
      }
      if (f < 0.0001) continue;
      for (const k of Object.keys(d.prod.in) as ResKey[]) this.spend(k, (d.prod.in[k] ?? 0) * dt * f);
      const out = d.prod.out * this.mods.prod * f * dt;
      this.gain('goods', out);
      this.stats.goods += out;
    }

    // --- инструменты: работники тратят товары, но работают быстрее
    this.toolsOn = this.res.goods > 0.05;
    if (this.toolsOn && working > 0 && !dev.superWork) this.spend('goods', Math.min(this.res.goods, working * 0.003 * dt));

    // --- еда
    const cons = ((pop - kids - soldiers) * 0.055 + kids * 0.03 + soldiers * 0.075) * this.mods.hunger * DIFFS[this.diff].hunger * (dev.noHunger ? 0 : 1);
    this.foodRate = foodProd - cons;
    this.gain('food', foodProd * dt);
    const eat = Math.min(this.res.food, cons * dt);
    this.spend('food', eat);
    if (this.res.food < 0) this.res.food = 0;
    if (this.res.food < 10 && this.foodRate < 0 && !this.lowFoodWarned && pop > 0) {
      this.lowFoodWarned = true;
      this.msg('Еды мало! Отправьте людей собирать ягоды (ПКМ по кусту) или нажмите «Авто» [J]', 'warn');
    }
    if (this.res.food > 25) this.lowFoodWarned = false;
    this.starving = this.res.food <= 0 && cons > foodProd && pop > 0;
    if (this.starving) {
      this.starveTimer += dt;
      if (this.starveTimer > 28 && this.units.length) {
        this.starveTimer = 0;
        const idx = Math.floor(Math.random() * this.units.length);
        const u = this.units[idx];
        killPerson(this, u, 'умер' + (u.look.female ? 'ла' : '') + ' от голода');
      }
    } else this.starveTimer = Math.max(0, this.starveTimer - dt);

    // --- золото: налоги + рынок − содержание зданий и армии
    const taxMult = [0, 1, 2.1][this.tax] ?? 1;
    goldIn = (goldIn + adults * 0.02 * taxMult) * this.mods.gold;
    const out = upkeep + soldiers * 0.015;
    this.upkeepNow = out;
    this.goldRate = goldIn - out + this.soc.goldFlow;
    this.gain('gold', goldIn * dt);
    if (this.res.gold >= out * dt) this.spend('gold', out * dt);
    else {
      this.spend('gold', this.res.gold);
      this.res.gold = 0;
    }
    const broke = this.res.gold <= 0.01 && out > goldIn + 1e-6;
    if (broke && !this.unpaid) this.msg('Казна пуста! Жалованье и содержание зданий не оплачено — продайте товары или поднимите налоги', 'warn');
    this.unpaid = broke;
    if (this.unpaid && soldiers > 0 && this.army > 0) {
      this.unpaidT += dt;
      if (this.unpaidT > 45) {
        this.unpaidT = 0;
        this.army--;
        this.msg('Воин дезертировал — нечем платить жалованье', 'warn');
      }
    } else this.unpaidT = 0;

    // --- знания
    this.knowRate = (adults * 0.2 + kids * 0.04 + know) * this.mods.know * (this.starving ? 0.6 : 1);
    const gain = this.knowRate * dt * (dev.researchMult > 1 ? dev.researchMult : 1);
    this.accIn.know = (this.accIn.know ?? 0) + this.knowRate * dt;
    if (this.research) {
      this.progress[this.research] = (this.progress[this.research] ?? 0) + gain;
      if (dev.instaResearch || this.progress[this.research] >= this.costs[this.research]) this.completeResearch(this.research);
    } else this.know += gain;

    // --- лимит складов
    this.capVal = this.capOf();
    if (dev.infinite) for (const k of STORED) this.res[k] = Math.max(this.res[k], 9999);
    if (dev.infinite) this.res.gold = Math.max(this.res.gold, 9999);
    if (!dev.noCap && !dev.infinite) {
      this.capMsgT -= dt;
      for (const k of STORED) {
        if (this.res[k] > this.capVal) {
          this.res[k] = this.capVal;
          if (this.capMsgT <= 0) {
            this.capMsgT = 60;
            this.msg(`Склад полон: ${RES_INFO[k].name.toLowerCase()}. Стройте склады, продавайте излишки на рынке`, 'warn');
          }
        }
      }
    }

    // --- динамика цен рынка
    for (const k of STORED) {
      this.prices[k] += (1 - this.prices[k]) * dt * 0.012 + (Math.random() - 0.5) * dt * 0.012;
      this.prices[k] = Math.max(0.45, Math.min(2.2, this.prices[k]));
    }

    // --- скользящие потоки за секунду (для экономики)
    this.accT += dt;
    if (this.accT >= 1) {
      for (const k of ['wood', 'stone', 'food', 'goods', 'gold', 'know']) {
        this.rateIn[k] = (this.rateIn[k] ?? 0) * 0.55 + ((this.accIn[k] ?? 0) / this.accT) * 0.45;
        this.rateOut[k] = (this.rateOut[k] ?? 0) * 0.55 + ((this.accOut[k] ?? 0) / this.accT) * 0.45;
        this.accIn[k] = 0;
        this.accOut[k] = 0;
      }
      this.accT = 0;
    }

    // ранг поселения
    const ti = rankIdx(pop);
    if (ti !== this.tierIdx) {
      const up = ti > this.tierIdx;
      this.tierIdx = ti;
      this.refreshMods();
      if (up) {
        this.msg(`Ваше поселение выросло: теперь это ${RANKS[ti].name.toLowerCase()}!`, 'good');
        this.sfx('tier');
      }
    }
    // рождаемость: налоги и сытость влияют на неё
    this.birthTimer += dt;
    const taxBirth = [0.85, 1, 1.3][this.tax] ?? 1;
    if (this.birthTimer >= 24 * this.mods.birth * DIFFS[this.diff].birth * (0.8 + this.soc.happy / 250) * taxBirth * (this.res.food > 80 ? 0.9 : 1)) {
      this.birthTimer = 0;
      const cap = this.housingCap();
      if (pop < cap && this.res.food >= 8 && adults >= 2 && !this.starving) this.spawnChild();
    }
    // рост детей
    for (const u of this.units) {
      if (u.child) {
        u.age += dt;
        if (u.age >= 50 / this.mods.grow) {
          u.child = false;
          this.msg(`${u.name} вырос${u.look.female ? 'ла' : ''} и готов${u.look.female ? 'а' : ''} к работе`, 'good');
        }
      }
    }
  }

  spawnChild() {
    const homes = this.buildings.filter((b) => b.done && BUILDINGS[b.type].housing > 0);
    const b = homes[Math.floor(Math.random() * homes.length)];
    if (!b) return;
    const t = this.freeTilesNear(b.x + Math.floor(b.w / 2), b.y + b.h, 4);
    const s = t[Math.floor(Math.random() * t.length)];
    if (!s) return;
    const u = this.newUnit(s.x + 0.5, s.y + 0.5, true);
    this.units.push(u);
    lifeBirth(this, u);
    for (let i = 0; i < 6; i++) this.particles.push({ x: u.x * TW + (Math.random() - 0.5) * 8, y: u.y * TH - 14, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 6, life: 1.1, max: 1.1, color: '#ff6a8a', size: 2, grav: 0 });
    this.sfx('birth', u.x * TW, u.y * TH);
    this.msg(`В поселении родился ребёнок: ${u.name}`, 'good');
  }

  startResearch(id: string) {
    const t = TECH_BY_ID[id];
    if (!t || this.done.has(id)) return;
    if (!t.req.every((r) => this.done.has(r))) {
      this.msg('Сначала изучите предыдущие технологии', 'warn');
      return;
    }
    this.research = id;
    if (this.know > 0) {
      this.progress[id] = (this.progress[id] ?? 0) + this.know;
      this.know = 0;
    }
    this.msg(`Начато изучение: ${t.name}`, 'info');
    if (this.progress[id] >= this.costs[id]) this.completeResearch(id);
    this.emit(true);
  }

  cancelResearch() {
    this.research = null;
    this.emit(true);
  }

  completeResearch(id: string) {
    const t = TECH_BY_ID[id];
    this.done.add(id);
    this.progress[id] = this.costs[id];
    this.refreshMods();
    this.research = null;
    this.msg(`Изучено: ${t.name}! ${t.effect}`, 'good');
    this.sfx('research');
    this.emit(true);
  }

  checkQuests() {
    if (Math.floor(this.time * 2) % 2 !== 0) return;
    QUESTS.forEach((q, i) => {
      if (!this.questDone.has(i) && q.check(this)) {
        this.questDone.add(i);
        this.msg(`Цель выполнена: ${q.text}`, 'good');
      }
    });
  }

  /* ---------- Юниты ---------- */

  updateUnit(u: Unit, dt: number) {
    if (u.spawn > 0) {
      u.spawn -= dt;
      if (u.spawn <= 0) {
        u.spawn = 0;
        for (let i = 0; i < 8; i++) this.spark(u.x * TW, u.y * TH - 8, '#fff2a0');
      } else if (u.spawn < 0.9 && Math.random() < dt * 30) {
        this.particles.push({ x: u.x * TW + (Math.random() - 0.5) * 10, y: u.y * TH - Math.random() * 20, vx: 0, vy: -14, life: 0.7, max: 0.7, color: Math.random() < 0.5 ? '#fff6c0' : '#ffd860', size: 1, grav: 0 });
      }
      return;
    }
    if (lifeUnit(this, u, dt)) return;
    const speed = 2.4 * this.mods.speed * (u.child ? 0.85 : 1);
    if (u.path.length) {
      const n = u.path[0];
      if (this.world.blocked[n.y * this.world.w + n.x]) {
        u.path = [];
      } else {
        const tx = n.x + 0.5;
        const ty = n.y + 0.5;
        const dx = tx - u.x;
        const dy = ty - u.y;
        const dist = Math.hypot(dx, dy);
        const step = speed * dt;
        if (dist <= step) {
          u.x = tx;
          u.y = ty;
          u.path.shift();
        } else {
          u.x += (dx / dist) * step;
          u.y += (dy / dist) * step;
        }
        if (Math.abs(dx) > Math.abs(dy) * 0.9) {
          u.dir = dx > 0 ? 2 : 3;
          u.fx = u.dir;
        } else u.dir = dy > 0 ? 0 : 1;
        u.anim += dt * speed * 1.7;
        u.moving = true;
        return;
      }
    }
    u.moving = false;
    switch (u.task.type) {
      case 'corvee':
        corveeLoop(this, u, dt);
        break;
      case 'idle':
        if (u.estate && u.status !== 'free' && this.soc.corvee > 0) {
          this.setTask(u, { type: 'corvee', tx: 0, ty: 0, site: 0, auto: true });
          break;
        }
        u.wander -= dt;
        if (u.wander <= 0) {
          u.wander = 2.5 + Math.random() * 6;
          if (Math.random() < 0.55) this.wanderStep(u);
        }
        break;
      case 'move':
        this.setIdle(u);
        break;
      case 'chop':
      case 'gather':
      case 'mine':
        this.workLoop(u, dt);
        break;
      case 'build':
        this.buildLoop(u, dt);
        break;
      case 'craft':
        lifeCraft(this, u, dt);
        break;
    }
  }

  wanderStep(u: Unit) {
    const ux = Math.floor(u.x);
    const uy = Math.floor(u.y);
    const lordE = u.role === 'lord' ? this.soc.estates.find((q) => q.id === u.estate) : undefined;
    const camp = lordE ? ({ x: lordE.bx, y: lordE.by } as Building) : this.buildings[0];
    const far = camp ? Math.hypot(ux - camp.x, uy - camp.y) > 9 : false;
    const tx = far && camp ? camp.x + Math.floor(Math.random() * 5) - 1 : ux + Math.floor(Math.random() * 7) - 3;
    const ty = far && camp ? camp.y + 3 + Math.floor(Math.random() * 3) : uy + Math.floor(Math.random() * 5) - 2;
    if (tx < 1 || ty < 1 || tx >= this.world.w - 1 || ty >= this.world.h - 1 || this.world.blocked[ty * this.world.w + tx]) return;
    const p = this.pf.find(this.world.blocked, ux, uy, (x, y) => x === tx && y === ty, tx, ty, false, 160);
    if (p && p.length < 12) u.path = p;
  }

  adjObj(u: Unit, tx: number, ty: number) {
    return Math.abs(Math.floor(u.x) - tx) <= 1 && Math.abs(Math.floor(u.y) - ty) <= 1;
  }

  adjRect(u: Unit, b: Building) {
    const x = Math.floor(u.x);
    const y = Math.floor(u.y);
    return x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h;
  }

  faceTo(u: Unit, x: number, _y: number) {
    u.fx = x >= u.x ? 2 : 3;
    u.dir = u.fx;
  }

  pathToObj(u: Unit, tx: number, ty: number): boolean {
    const bl = this.world.blocked;
    const w = this.world.w;
    const p = this.pf.find(bl, Math.floor(u.x), Math.floor(u.y), (x, y) => Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1 && !bl[y * w + x], tx, ty, false, 6000);
    if (!p) return false;
    u.path = p;
    return true;
  }

  pathToRect(u: Unit, b: Building): boolean {
    const bl = this.world.blocked;
    const w = this.world.w;
    const p = this.pf.find(bl, Math.floor(u.x), Math.floor(u.y), (x, y) => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h && !bl[y * w + x], b.x + b.w / 2, b.y + b.h / 2, false, 6000);
    if (!p) return false;
    u.path = p;
    return true;
  }

  findNext(u: Unit): { tx: number; ty: number } | null {
    const t = u.task;
    const w = this.world;
    const ux = u.x;
    const uy = u.y;
    let best: Obj | null = null;
    let bd = 1e9;
    const consider = (o: Obj) => {
      const idx = o.ty * w.w + o.tx;
      if (this.bad.has(idx)) return;
      const d = (o.tx + 0.5 - ux) ** 2 + (o.ty + 0.5 - uy) ** 2;
      if (d < bd) {
        bd = d;
        best = o;
      }
    };
    if (t.type === 'chop') {
      for (const idx of this.marked) {
        const o = w.objs[idx];
        if (!o || o.amount <= 0 || !this.isChoppable(o)) {
          this.marked.delete(idx);
          continue;
        }
        consider(o);
      }
      if (!best && t.auto) this.scanFor(t.tx, t.ty, 7, (o) => (o.kind === 'tree' || o.kind === 'palm') && o.amount > 0, consider);
    } else if (t.type === 'gather') {
      this.scanFor(Math.floor(ux), Math.floor(uy), 11, (o) => o.kind === 'bush' && o.amount > 0, consider);
    } else if (t.type === 'mine') {
      this.scanFor(Math.floor(ux), Math.floor(uy), 12, (o) => o.kind === 'rock' && o.amount > 0, consider);
    }
    const b = best as Obj | null;
    return b ? { tx: b.tx, ty: b.ty } : null;
  }

  scanFor(cx: number, cy: number, r: number, pred: (o: Obj) => boolean, fn: (o: Obj) => void) {
    const w = this.world;
    for (let y = Math.max(0, cy - r); y <= Math.min(w.h - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(w.w - 1, cx + r); x++) {
        const o = w.objs[y * w.w + x];
        if (o && pred(o)) fn(o);
      }
  }

  nearestDropoff(u: Unit): Building | null {
    let best: Building | null = null;
    let bd = 1e9;
    for (const b of this.buildings) {
      if (!b.done || !BUILDINGS[b.type].dropoff) continue;
      const d = Math.hypot(b.x + b.w / 2 - u.x, b.y + b.h / 2 - u.y);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  addRes(u: Unit, b: Building | null) {
    const type = u.carry.type;
    if (!type || u.carry.n <= 0) return;
    this.gain(type, u.carry.n);
    if (type !== 'goods') this.stats[type] += u.carry.n;
    const colors: Record<ResKey, string> = { wood: '#e0b070', stone: '#c4cad8', food: '#ff8a9a', goods: '#7fd8e0' };
    const label = type === 'wood' ? 'дер.' : type === 'stone' ? 'кам.' : type === 'food' ? 'еда' : 'тов.';
    const px = b ? (b.x + b.w / 2) * TW : u.x * TW;
    const py = b ? (b.y + b.h) * TH - 12 : u.y * TH - 14;
    this.floatText(px, py, `+${u.carry.n} ${label}`, colors[type]);
    this.sfx('drop', px, py);
    u.carry = { type: null, n: 0 };
  }

  deliver(u: Unit) {
    const b = this.nearestDropoff(u);
    if (!b) {
      this.addRes(u, null);
      u.phase = 'goto';
      return;
    }
    if (this.adjRect(u, b)) {
      this.addRes(u, b);
      u.phase = 'goto';
      return;
    }
    if (!this.pathToRect(u, b)) {
      this.addRes(u, b);
      u.phase = 'goto';
    }
  }

  depleteObj(o: Obj) {
    const w = this.world;
    const idx = o.ty * w.w + o.tx;
    this.marked.delete(idx);
    if (o.kind === 'tree' || o.kind === 'palm') {
      makeObj(w, 'stump', 'stump', o.tx, o.ty);
    } else if (o.kind === 'cactus' || o.kind === 'rock') {
      w.objs[idx] = null;
      w.blocked[idx] = 0;
    } else if (o.kind === 'bush') {
      o.spr = 'bushEmpty';
      o.amount = 0;
      o.regrow = 70;
      this.regrow.push(o);
    }
    for (let i = 0; i < 6; i++) this.spark((o.tx + 0.5) * TW, (o.ty + 0.6) * TH, o.kind === 'rock' ? '#b4bccc' : '#7aa84a');
  }

  workLoop(u: Unit, dt: number) {
    dt *= traitWork(this, u);
    const t = u.task;
    const resType = RES_OF[t.type];
    if (u.carry.n > 0 && u.carry.type !== resType) u.phase = 'deliver';
    if (u.phase === 'deliver') {
      this.deliver(u);
      return;
    }
    const o = this.objAt(t.tx, t.ty);
    const valid = !!o && o.amount > 0 && ((t.type === 'chop' && this.isChoppable(o)) || (t.type === 'gather' && o.kind === 'bush') || (t.type === 'mine' && o.kind === 'rock'));
    if (!valid) {
      const nt = this.findNext(u);
      if (nt) {
        t.tx = nt.tx;
        t.ty = nt.ty;
        u.phase = 'goto';
        u.timer = 0;
        return;
      }
      if (u.carry.n > 0) {
        u.phase = 'deliver';
        return;
      }
      this.setIdle(u);
      return;
    }
    if (this.adjObj(u, t.tx, t.ty)) {
      u.phase = 'work';
      this.faceTo(u, t.tx + 0.5, t.ty + 0.5);
      const base = (t.type === 'chop' ? 1.5 / this.mods.chop : t.type === 'gather' ? 1.1 / this.mods.gather : 2.2 / this.mods.mine) / this.workK();
      u.timer += dt;
      u.swing = u.timer / base;
      if (u.timer >= base) {
        u.timer -= base;
        this.sfx(t.type === 'chop' ? 'chop' : t.type === 'mine' ? 'mine' : 'gather', u.x * TW, u.y * TH);
        o!.amount -= 1;
        o!.shake = 0.25;
        if (Math.random() < 0.6) this.floatText(u.x * TW, u.y * TH - 24, t.type === 'chop' ? '+🪵' : t.type === 'mine' ? '+🪨' : '+🍓', '#ffffff');
        u.carry.type = resType;
        u.carry.n += 1;
        if (t.type === 'chop') {
          for (let i = 0; i < 3; i++) this.spark((o!.tx + 0.5) * TW, (o!.ty + 0.5) * TH, i % 2 ? '#d8aa72' : '#a47848');
        } else if (t.type === 'gather') {
          for (let i = 0; i < 5; i++) this.spark((o!.tx + 0.5) * TW, (o!.ty + 0.3) * TH, i % 2 ? '#ff5a78' : '#7ac04a');
        } else if (t.type === 'mine') {
          for (let i = 0; i < 4; i++) this.spark((o!.tx + 0.5) * TW, (o!.ty + 0.5) * TH, '#dfe3ee');
        }
        if (o!.amount <= 0) this.depleteObj(o!);
        if (u.carry.n >= this.mods.carry) u.phase = 'deliver';
      }
    } else if (!this.pathToObj(u, t.tx, t.ty)) {
      this.bad.add(t.ty * this.world.w + t.tx);
      this.marked.delete(t.ty * this.world.w + t.tx);
      if (o) o.marked = false;
      const nt = this.findNext(u);
      if (nt) {
        t.tx = nt.tx;
        t.ty = nt.ty;
      } else {
        if (u.carry.n > 0) u.phase = 'deliver';
        else {
          this.msg(`${u.name}: не могу добраться до цели`, 'warn');
          this.setIdle(u);
        }
      }
    }
  }

  buildLoop(u: Unit, dt: number) {
    const t = u.task;
    let site = this.buildings.find((b) => b.id === t.site) ?? null;
    if (!site || site.done) {
      let best: Building | null = null;
      let bd = 14;
      for (const b of this.buildings) {
        if (b.done) continue;
        const d = Math.hypot(b.x - u.x, b.y - u.y);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      if (best) {
        t.site = best.id;
        return;
      }
      this.setIdle(u);
      return;
    }
    if (this.adjRect(u, site)) {
      u.phase = 'work';
      this.faceTo(u, site.x + site.w / 2, site.y + site.h / 2);
      u.timer += dt;
      if (Math.floor(u.timer / 0.7) !== Math.floor((u.timer - dt) / 0.7)) {
        this.sfx('hammer', u.x * TW, u.y * TH);
        site.hit = 0.28;
        for (let i = 0; i < 4; i++) {
          const bx = (site.x + Math.random() * site.w) * TW;
          this.particles.push({ x: bx, y: (site.y + site.h) * TH - 2, vx: (Math.random() - 0.5) * 14, vy: -3 - Math.random() * 5, life: 0.7, max: 0.7, color: 'rgba(214,196,150,0.7)', size: 2, grav: 2, grow: 3 });
        }
        this.spark(u.x * TW + (u.fx === 2 ? 6 : -6), u.y * TH - 10, '#ffe9a8', 2);
      }
      u.swing = (u.timer % 0.7) / 0.7;
      const def = BUILDINGS[site.type];
      site.progress += (dt * this.mods.build * this.workK() * (this.dev.instaBuild ? 40 : 1)) / def.time;
      if (Math.random() < dt * 4) this.spark((site.x + Math.random() * site.w) * TW, (site.y + site.h) * TH - 4, '#f0d890');
      if (site.progress >= 1) {
        site.progress = 1;
        site.done = true;
        this.stats.built++;
        this.msg(`Построено: ${def.name}`, 'good');
        this.sfx('built', site.x * TW, site.y * TH);
        for (let i = 0; i < 16; i++) this.spark((site.x + Math.random() * site.w) * TW, (site.y + site.h) * TH - 6, '#fff2b0');
        this.selBuilding = this.selBuilding === site.id ? site.id : this.selBuilding;
      }
    } else if (!this.pathToRect(u, site)) {
      this.msg('Рабочие не могут подойти к стройке', 'warn');
      this.setIdle(u);
    }
  }

  /* ---------- Состояние для интерфейса ---------- */

  taskText(u: Unit): string {
    if (u.child) return 'Растёт';
    if (u.role === 'lord' && u.task.type === 'idle') return 'Помещик';
    if (u.role === 'soldier') {
      const o = u.order;
      if (!o) return 'Патруль';
      if (o.kind === 'move') return 'Идёт по приказу';
      if (o.kind === 'attack') return 'В атаке';
      return 'Держит позицию';
    }
    const t = u.task;
    const full = u.phase === 'deliver';
    switch (t.type) {
      case 'idle':
        return 'Свободен';
      case 'move':
        return 'Идёт';
      case 'chop':
        return full ? 'Несёт дерево' : 'Рубит дерево';
      case 'gather':
        return full ? 'Несёт ягоды' : 'Собирает ягоды';
      case 'mine':
        return full ? 'Несёт камень' : 'Добывает камень';
      case 'build':
        return 'Строит';
      case 'corvee':
        return u.status === 'slave' ? 'Каторжный труд' : 'Барщина';
      case 'craft':
        return 'Работает в мастерской';
    }
  }

  epoch() {
    for (const [n, f] of EPOCHS) if (f(this.done)) return n;
    return 'Рассвет человечества';
  }

  snapshot(): Snapshot {
    const pop = this.totalPop();
    const kids = this.units.filter((u) => u.child).length;
    const sel = this.units.filter((u) => u.sel);
    const hov = this.mouse.inside && this.world ? this.biomeAtMouse() : '';
    const b = this.selBuilding ? this.buildings.find((q) => q.id === this.selBuilding) : null;
    const open = QUESTS.map((q, i) => ({ text: q.text, done: this.questDone.has(i) })).filter((q) => !q.done).slice(0, 3);
    const camp = this.buildings[0];
    const towns: TownView[] = this.towns.map((t) => ({
      id: t.id,
      name: t.name,
      spec: t.spec,
      pop: Math.floor(t.pop),
      soldiers: Math.floor(t.soldiers),
      tier: t.tier,
      attitude: Math.round(t.attitude),
      aggr: t.aggr,
      owner: t.owner,
      loyalty: Math.round(t.loyalty),
      reach: camp ? townReach(this, t) : 'no',
      dist: camp ? Math.round(Math.hypot(t.x - camp.x, t.y - camp.y)) : 0,
      annexCost: camp ? annexCost(this, t) : 0,
      def: Math.round(townDef(t) * 10) / 10,
      razed: t.razedT > 0,
      x: t.x,
      y: t.y,
      governor: t.governor,
      govName: this.soc.heroes.find((h) => h.id === t.governor)?.name ?? '',
      govTrait: this.soc.heroes.find((h) => h.id === t.governor)?.trait ?? '',
      capital: this.soc.capital === t.id,
    }));
    const prov = this.towns.filter((t) => t.owner === 'player');
    return {
      mode: this.mode,
      res: { wood: Math.floor(this.res.wood), stone: Math.floor(this.res.stone), food: Math.floor(this.res.food), gold: Math.floor(this.res.gold), goods: Math.floor(this.res.goods) },
      cap: this.capVal,
      flow: Object.fromEntries(['wood', 'stone', 'food', 'goods', 'gold', 'know'].map((k) => [k, { in: this.rateIn[k] ?? 0, out: this.rateOut[k] ?? 0 }])),
      tax: this.tax,
      jobs: { ...this.jobsInfo },
      workers: { ...this.workers },
      toolsOn: this.toolsOn,
      unpaid: this.unpaid,
      upkeep: this.upkeepNow,
      trade: {
        markets: this.marketCount(),
        fee: this.tradeFee(),
        prices: Object.fromEntries(STORED.map((k) => [k, { sell: RES_INFO[k].base * this.prices[k] * (1 - this.tradeFee()), buy: RES_INFO[k].base * this.prices[k] * (1 + this.tradeFee()), mult: this.prices[k] }])),
      },
      dev: { ...this.dev },
      name: this.name,
      specId: this.spec,
      tierIdx: this.tierIdx,
      gov: this.gov,
      stateFormed: this.stateFormed,
      goldRate: this.goldRate,
      army: this.army,
      armyCap: camp ? armyCap(this) : 0,
      armyAway: this.awayCount(),
      armyPow: camp ? Math.round(armyPower(this, this.army) * 10) / 10 : 0,
      homeDef: camp ? Math.round(homeDefense(this) * 10) / 10 : 0,
      trainCost: trainCost(this),
      costs: this.costs,
      towns,
      marches: this.marches.map((m) => ({ id: m.id, townName: this.towns.find((t) => t.id === m.townId)?.name ?? '?', mode: m.mode, n: m.phase === 'go' ? m.n : m.survivors, progress: Math.min(1, m.t / m.dur), phase: m.phase, incoming: m.incoming })),
      provinces: prov.length,
      statePop: pop + Math.floor(prov.reduce((a, t) => a + t.pop, 0)),
      selTown: this.selTown,
      canSail: this.done.has('sailing'),
      know: Math.floor(this.know),
      knowRate: this.knowRate,
      foodRate: this.foodRate,
      pop,
      kids,
      housing: this.housingCap(),
      research: this.research ? { id: this.research, progress: this.progress[this.research] ?? 0, cost: this.costs[this.research] } : null,
      progress: { ...this.progress },
      done: [...this.done],
      day: Math.floor(this.time / DAY_LENGTH) + 1,
      hour: this.dayT * 24,
      speed: this.speed,
      paused: this.paused,
      tool: this.tool,
      buildType: this.buildType,
      units: [...sel, ...this.selGuards()].map((u) => ({ id: u.id, name: u.name, task: this.taskText(u), carry: u.carry.n ? `${u.carry.n}` : '', kid: u.child, female: u.look.female, sel: true, look: u.look, status: u.status, role: u.role, estate: u.estate })),
      selCount: sel.length + this.selGuards().length,
      selGuards: this.selGuards().length,
      guardsTotal: this.guards.length,
      building: b ? { id: b.id, type: b.type, done: b.done, progress: b.progress } : null,
      idleCount: this.units.filter((u) => !u.child && u.spawn <= 0 && u.task.type === 'idle').length,
      msgs: [...this.msgs],
      epoch: this.epoch(),
      objectives: open,
      questsDone: this.questDone.size,
      questsTotal: QUESTS.length,
      hover: hov,
      gameOver: this.gameOver,
      starving: this.starving,
      zoom: this.zoom,
      diff: this.diff,
      soc: socSnapshot(this),
      borderMode: this.borderMode,
      pendingLord: this.soc.pendingLord != null,
      life: lifeBrief(this),
    };
  }

  biomeAtMouse() {
    const tx = Math.floor(this.mouse.wx / TW);
    const ty = Math.floor(this.mouse.wy / TH);
    if (tx < 0 || ty < 0 || tx >= this.world.w || ty >= this.world.h) return '';
    return BIOME_NAME[this.world.biome[ty * this.world.w + tx]];
  }

  emit(force = false) {
    void force;
    if (this.onUpdate) this.onUpdate(this.snapshot());
  }
}

interface Quest {
  text: string;
  check: (g: Game) => boolean;
}

export const QUESTS: Quest[] = [
  { text: 'Нарубить 20 брёвен', check: (g) => g.stats.wood >= 20 },
  { text: 'Изучить «Огонь»', check: (g) => g.done.has('fire') },
  { text: 'Построить первое жильё', check: (g) => g.buildings.some((b) => b.done && b.type !== 'camp' && BUILDINGS[b.type].housing > 0) },
  { text: 'Население: 10 человек', check: (g) => g.totalPop() >= 10 },
  { text: 'Изучить «Каменные орудия»', check: (g) => g.done.has('stone_tools') },
  { text: 'Добыть 20 камня', check: (g) => g.stats.stone >= 20 },
  { text: 'Построить поле', check: (g) => g.buildings.some((b) => b.done && b.type === 'farm') },
  { text: 'Построить мастерскую', check: (g) => g.buildings.some((b) => b.done && b.type === 'workshop') },
  { text: 'Произвести 50 товаров', check: (g) => g.stats.goods >= 50 },
  { text: 'Построить казарму', check: (g) => g.buildings.some((b) => b.done && b.type === 'barracks') },
  { text: 'Население: 25 человек', check: (g) => g.totalPop() >= 25 },
  { text: 'Присоединить или захватить селение', check: (g) => g.towns.some((t) => t.owner === 'player') },
  { text: 'Заработать 100 золота на рынке', check: (g) => g.stats.traded >= 100 },
  { text: 'Построить Большой дом', check: (g) => g.buildings.some((b) => b.done && b.type === 'hall') },
  { text: 'Население: 50 человек', check: (g) => g.totalPop() >= 50 },
  { text: 'Изучить «Железо»', check: (g) => g.done.has('iron') },
  { text: 'Объединить 3 селения в государство', check: (g) => g.towns.filter((t) => t.owner === 'player').length >= 2 },
  { text: 'Изучить 40 технологий', check: (g) => g.done.size >= 40 },
  { text: 'Изучить все технологии', check: (g) => g.done.size >= TECHS.length },
];
