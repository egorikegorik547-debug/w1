import type { BranchId, Mods } from './techs';

export type SpecId = 'smith' | 'miner' | 'lumber' | 'warrior' | 'trader' | 'farmer' | 'sage' | 'factory';

export interface SpecDef {
  id: SpecId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  strong: string[];
  weak: string[];
  mods: Partial<Mods>;
  discount: Partial<Record<BranchId, number>>;
  start: { wood?: number; stone?: number; food?: number; gold?: number; know?: number; army?: number; goods?: number };
  canRaze?: boolean;
}

export const SPECS: Record<SpecId, SpecDef> = {
  smith: {
    id: 'smith',
    name: 'Кузнецы',
    icon: '🔨',
    color: '#f08a24',
    desc: 'Мастера металла. Быстро осваивают производство и оружие, ковут лучшие орудия.',
    strong: ['Производство −35% к цене', 'Военное дело −15%', 'Сила армии +10%', 'Стройка +10%'],
    weak: ['Земледелие +15%', 'Общество +10%'],
    mods: { atk: 1.1, build: 1.1, def: 1.05 },
    discount: { prod: 0.65, war: 0.85, mine: 0.9, agri: 1.15, soc: 1.1 },
    start: { stone: 12, wood: 5 },
  },
  miner: {
    id: 'miner',
    name: 'Горняки',
    icon: '⛏️',
    color: '#8f9bb3',
    desc: 'Живут в горах и карьерах. Камень и руда — их хлеб.',
    strong: ['Горное дело −35%', 'Строительство −15%', 'Добыча камня +40%', 'Ноша +1'],
    weak: ['Лесное дело +10%', 'Наука +15%'],
    mods: { mine: 1.4, carry: 1 },
    discount: { mine: 0.65, build: 0.85, prod: 0.9, wood: 1.1, sci: 1.15 },
    start: { stone: 25 },
  },
  lumber: {
    id: 'lumber',
    name: 'Лесорубы',
    icon: '🪓',
    color: '#3fa56b',
    desc: 'Дети леса. Рубят быстрее всех и строят из дерева с лёгкостью.',
    strong: ['Лесное дело −35%', 'Строительство −15%', 'Рубка +40%', 'Стройка +10%'],
    weak: ['Горное дело +10%', 'Наука +10%'],
    mods: { chop: 1.4, build: 1.1 },
    discount: { wood: 0.65, build: 0.85, agri: 0.9, mine: 1.1, sci: 1.1, war: 1.05 },
    start: { wood: 35 },
  },
  warrior: {
    id: 'warrior',
    name: 'Воины',
    icon: '⚔️',
    color: '#e5484d',
    desc: 'Народ войны. Сильная армия, дешёвые воины, и только они умеют разорять селения.',
    strong: ['Военное дело −35%', 'Сила атаки +25%', 'Воины дешевле на 20%', 'Старт: 3 воина', 'Могут РАЗОРЯТЬ'],
    weak: ['Земледелие +10%', 'Наука +15%', 'Торговля +10%', 'Знания −10%'],
    mods: { atk: 1.25, def: 1.1, armyCost: 0.8, know: 0.9, hunger: 1.05 },
    discount: { war: 0.65, prod: 0.9, soc: 0.95, agri: 1.1, sci: 1.15, trade: 1.1 },
    start: { food: 5 },
    canRaze: true,
  },
  trader: {
    id: 'trader',
    name: 'Торговцы',
    icon: '🪙',
    color: '#f2c94c',
    desc: 'Купцы и мореходы. Богатеют быстрее всех, умеют договариваться и покупать чужие земли.',
    strong: ['Торговля −35%', 'Общество −15%', 'Доход золота +40%', 'Присоединение −15%', 'Старт: 40 золота'],
    weak: ['Военное дело +15%', 'Горное дело +10%'],
    mods: { gold: 1.4, speed: 1.05, annex: 0.85 },
    discount: { trade: 0.65, soc: 0.85, build: 0.95, war: 1.15, mine: 1.1 },
    start: { gold: 40 },
  },
  farmer: {
    id: 'farmer',
    name: 'Труженики',
    icon: '🌾',
    color: '#7bc043',
    desc: 'Землепашцы и скотоводы. Сытое и многолюдное селение, растёт быстрее остальных.',
    strong: ['Земледелие −35%', 'Строительство −15%', 'Урожай +30%', 'Ягоды +30%', 'Рождаемость выше'],
    weak: ['Наука +15%', 'Военное дело +15%'],
    mods: { farm: 1.3, gather: 1.3, lodge: 1.2, birth: 0.85, hunger: 0.95 },
    discount: { agri: 0.65, build: 0.85, wood: 0.9, sci: 1.15, war: 1.15 },
    start: { food: 30 },
  },
  sage: {
    id: 'sage',
    name: 'Философы',
    icon: '📜',
    color: '#4aa8ff',
    desc: 'Мудрецы и учёные. Быстрее всех изучают знания, лучше управляют людьми.',
    strong: ['Наука −35%', 'Общество −20%', 'Знания +35%', 'Лояльность +5', 'Старт: 20 знаний'],
    weak: ['Военное дело +20%', 'Производство +10%', 'Горное дело +10%', 'Золото −10%'],
    mods: { know: 1.35, grow: 1.2, loyalty: 5, gold: 0.9 },
    discount: { sci: 0.65, soc: 0.8, trade: 0.95, war: 1.2, prod: 1.1, mine: 1.1 },
    start: { know: 20 },
  },
  factory: {
    id: 'factory',
    name: 'Заводчане',
    icon: '🏭',
    color: '#5fd0d6',
    desc: 'Дети индустрии. Превращают сырьё в товары: быстрее строят мастерские и заводы, торгуют готовой продукцией и раньше всех получают конвейер.',
    strong: ['Производство −30% к цене', 'Товаров с фабрик +50%', 'Завод доступен уже с «Железом»', 'Стройка +10%, Ноша +1', 'Склады вместительнее +15%', 'Старт: 12 товаров, 20 золота'],
    weak: ['Земледелие +15%', 'Общество +10%', 'Лесное дело +5%', 'Воины слабее на 5%'],
    mods: { prod: 1.5, build: 1.1, carry: 1, cap: 1.15, atk: 0.95, gold: 1.05 },
    discount: { prod: 0.7, mine: 0.9, build: 0.9, trade: 0.95, agri: 1.15, soc: 1.1, wood: 1.05 },
    start: { wood: 10, stone: 15, gold: 20, goods: 12 },
  },
};
export const SPEC_ORDER: SpecId[] = ['smith', 'miner', 'lumber', 'warrior', 'trader', 'farmer', 'sage', 'factory'];

export type GovId = 'abs' | 'con' | 'par' | 'pres';

export interface GovDef {
  id: GovId;
  name: string;
  icon: string;
  desc: string;
  needTech: string | null;
  needName?: string;
  mods: Partial<Mods>;
  bonus: string[];
  rulerTitle: string;
}

export const GOVS: Record<GovId, GovDef> = {
  abs: {
    id: 'abs',
    name: 'Абсолютная монархия',
    icon: '👑',
    desc: 'Вся власть у монарха. Сильная армия и твёрдая рука.',
    needTech: null,
    mods: { atk: 1.15, armyCost: 0.8, loyalty: 12, know: 0.9, gold: 1.05 },
    bonus: ['Сила армии +15%', 'Воины дешевле на 20%', 'Лояльность +12', 'Знания −10%'],
    rulerTitle: 'Монарх',
  },
  con: {
    id: 'con',
    name: 'Конституционная монархия',
    icon: '🏰',
    desc: 'Монарх ограничен законом. Баланс силы, торговли и науки.',
    needTech: 'constitution',
    needName: 'Конституция',
    mods: { gold: 1.1, know: 1.1, loyalty: 8, atk: 1.05 },
    bonus: ['Золото +10%', 'Знания +10%', 'Лояльность +8', 'Атака +5%'],
    rulerTitle: 'Король',
  },
  par: {
    id: 'par',
    name: 'Парламентская республика',
    icon: '🏛️',
    desc: 'Законы пишет парламент. Наука и экономика процветают, армия дороже.',
    needTech: 'parliament',
    needName: 'Парламентаризм',
    mods: { know: 1.2, gold: 1.15, loyalty: 6, atk: 0.95, armyCost: 1.1 },
    bonus: ['Знания +20%', 'Золото +15%', 'Лояльность +6', 'Воины дороже на 10%'],
    rulerTitle: 'Премьер-министр',
  },
  pres: {
    id: 'pres',
    name: 'Президентская республика',
    icon: '🗳️',
    desc: 'Сильный выборный президент. Производство и армия под единым руководством.',
    needTech: 'republic',
    needName: 'Республиканская идея',
    mods: { chop: 1.1, mine: 1.1, build: 1.1, farm: 1.1, atk: 1.1, gold: 1.05, loyalty: 4 },
    bonus: ['Добыча, стройка, поля +10%', 'Атака +10%', 'Золото +5%', 'Лояльность +4'],
    rulerTitle: 'Президент',
  },
};
export const GOV_ORDER: GovId[] = ['abs', 'con', 'par', 'pres'];

export type MapType = 'continent' | 'continents' | 'archipelago' | 'islands';
export const MAP_TYPES: { id: MapType; name: string; icon: string; desc: string }[] = [
  { id: 'continent', name: 'Континент', icon: '🌍', desc: 'Одна огромная суша. Все соседи достижимы по земле.' },
  { id: 'continents', name: 'Континенты', icon: '🗺️', desc: 'Несколько больших материков. Для заморских войн нужен флот.' },
  { id: 'archipelago', name: 'Архипелаг', icon: '🏝️', desc: 'Множество островов средней величины, часто рядом друг с другом.' },
  { id: 'islands', name: 'Острова', icon: '🌊', desc: 'Редкие небольшие острова среди океана. Много воды.' },
];

export type MapSize = 'small' | 'medium' | 'large' | 'huge';
export const MAP_SIZES: { id: MapSize; name: string; n: number; towns: number }[] = [
  { id: 'small', name: 'Малая', n: 70, towns: 4 },
  { id: 'medium', name: 'Средняя', n: 100, towns: 6 },
  { id: 'large', name: 'Большая', n: 140, towns: 9 },
  { id: 'huge', name: 'Огромная', n: 190, towns: 13 },
];

export const RANKS = [
  { min: 0, name: 'Хутор' },
  { min: 8, name: 'Деревня' },
  { min: 20, name: 'Посёлок' },
  { min: 40, name: 'Село' },
  { min: 70, name: 'Городок' },
  { min: 110, name: 'Город' },
  { min: 170, name: 'Крупный город' },
  { min: 260, name: 'Мегаполис' },
];
export function rankIdx(pop: number): number {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (pop >= RANKS[i].min) r = i;
  return r;
}

export const TOWN_NAMES = [
  'Заречье', 'Белоярск', 'Волчий Лог', 'Каменка', 'Орлиное', 'Тихий Омут', 'Светлоград', 'Ржавец', 'Дубрава', 'Соколиная Гора',
  'Медвежий Угол', 'Ладога', 'Берестье', 'Чернолесье', 'Ясный Бор', 'Горюн', 'Рыбачье', 'Солнцево', 'Грозовой Перевал', 'Стрела',
  'Кремнев', 'Вороново', 'Лунная Гавань', 'Златогорье', 'Серебрянка', 'Туманный Брод', 'Хмурый Холм', 'Ветрогон',
];
export const SETTLEMENT_DEFAULTS = ['Заря', 'Новая Ладога', 'Рассвет', 'Родники', 'Светлый Брод', 'Первоград', 'Тихая Гавань', 'Сосновка'];
