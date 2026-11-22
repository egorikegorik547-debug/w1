export const TW = 16; // ширина тайла в «родных» пикселях
export const TH = 12; // высота тайла (вид под углом — тайл сплюснут)

export const B = {
  DEEP: 0,
  WATER: 1,
  BEACH: 2,
  DESERT: 3,
  STEPPE: 4,
  FIELD: 5,
  FSTEPPE: 6,
  OAK: 7,
  BIRCH: 8,
  AUTUMN: 9,
  TAIGA: 10,
  DARK: 11,
} as const;

export const BIOME_NAME = [
  'Глубокая вода',
  'Мелководье',
  'Пляж',
  'Пустыня',
  'Степь',
  'Поле',
  'Лесостепь',
  'Дубрава',
  'Берёзовая роща',
  'Осенний лес',
  'Тайга',
  'Тёмный бор',
];

export const BIOME_MINI = [
  '#1d5f9a',
  '#3aa0cf',
  '#ecdca6',
  '#e3c47e',
  '#aca853',
  '#5fb046',
  '#78b84b',
  '#468a39',
  '#7cc152',
  '#8a8a3a',
  '#437e60',
  '#31574c',
];

export type ResKey = 'wood' | 'stone' | 'food' | 'goods';
export type AllRes = ResKey | 'gold' | 'know';

export const RES_INFO: Record<AllRes, { name: string; icon: string; color: string; base: number }> = {
  wood: { name: 'Дерево', icon: '🪵', color: '#e0b070', base: 1 },
  stone: { name: 'Камень', icon: '🪨', color: '#c4cad8', base: 1.4 },
  food: { name: 'Еда', icon: '🍖', color: '#ff8a9a', base: 0.9 },
  goods: { name: 'Товары', icon: '📦', color: '#7fd8e0', base: 3.5 },
  gold: { name: 'Золото', icon: '🪙', color: '#ffe27a', base: 1 },
  know: { name: 'Знания', icon: '💡', color: '#8ac8ff', base: 0 },
};
export const STORED: ResKey[] = ['wood', 'stone', 'food', 'goods'];

type BaseId =
  | 'camp'
  | 'campfire'
  | 'shelter'
  | 'house'
  | 'stonehouse'
  | 'storage'
  | 'farm'
  | 'lodge'
  | 'shrine'
  | 'hall'
  | 'barracks'
  | 'market'
  | 'forge'
  | 'library'
  | 'tower'
  | 'workshop'
  | 'foundry'
  | 'factory';

export type BuildingId = BaseId | (string & {});

export type BuildCat = 'home' | 'eco' | 'ind' | 'cult' | 'war' | 'spec';
export const BUILD_CATS: { id: BuildCat; name: string; icon: string; hint: string }[] = [
  { id: 'home', name: 'Жильё', icon: '🏠', hint: 'Дома и центры селения — растят население' },
  { id: 'eco', name: 'Еда и склады', icon: '🌾', hint: 'Поля, охота, костры и хранилища' },
  { id: 'ind', name: 'Производство', icon: '🏭', hint: 'Мастерские, заводы и рынок' },
  { id: 'cult', name: 'Знания и вера', icon: '📚', hint: 'Святилища и библиотеки' },
  { id: 'war', name: 'Оборона', icon: '⚔️', hint: 'Казармы и башни' },
  { id: 'spec', name: 'Особые', icon: '✨', hint: '30 построек вашей специализации' },
];

export interface BuildingDef {
  id: BuildingId;
  name: string;
  desc: string;
  cat: BuildCat;
  w: number;
  h: number;
  cost: Partial<Record<ResKey, number>>;
  time: number;
  housing: number;
  req: string | null;
  /** для особой специализации здание открывается раньше */
  reqAlt?: { spec: string; req: string };
  dropoff?: boolean;
  food?: number;
  know?: number;
  light?: boolean;
  gold?: number;
  army?: number;
  def?: number;
  atk?: number;
  /** рабочие места (их занимают свободные жители) */
  jobs?: number;
  /** производство: сырьё в секунду → товары в секунду */
  prod?: { in: Partial<Record<ResKey, number>>; out: number };
  /** прибавка к лимиту склада для каждого ресурса */
  cap?: number;
  /** содержание, золота в секунду */
  upkeep?: number;
  /** пассивная добыча ресурсов в секунду */
  yield?: Partial<Record<ResKey, number>>;
  loyalty?: number;
  happy?: number;
  spec?: string;
  arch?: string;
  tier?: number;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  camp: {
    id: 'camp',
    name: 'Стоянка племени',
    desc: 'Сердце племени. Здесь горит первый костёр, сюда несут добычу.',
    cat: 'home',
    w: 2,
    h: 2,
    cost: {},
    time: 1,
    housing: 6,
    req: null,
    dropoff: true,
    know: 0.5,
    light: true,
  },
  campfire: {
    id: 'campfire',
    name: 'Костёр',
    desc: 'Пункт сдачи добычи и свет в ночи. У огня рождаются идеи.',
    cat: 'eco',
    w: 1,
    h: 1,
    cost: { wood: 8 },
    time: 6,
    housing: 0,
    req: 'fire',
    dropoff: true,
    know: 0.4,
    light: true,
    cap: 20,
  },
  shelter: {
    id: 'shelter',
    name: 'Шалаш',
    desc: 'Простейшее жильё из шкур и жердей. Вмещает 3 человек.',
    cat: 'home',
    w: 1,
    h: 1,
    cost: { wood: 12 },
    time: 8,
    housing: 3,
    req: 'shelter',
  },
  house: {
    id: 'house',
    name: 'Деревянный дом',
    desc: 'Тёплый бревенчатый дом. Вмещает 6 человек.',
    cat: 'home',
    w: 2,
    h: 2,
    cost: { wood: 30 },
    time: 16,
    housing: 6,
    req: 'carpentry',
  },
  stonehouse: {
    id: 'stonehouse',
    name: 'Каменный дом',
    desc: 'Прочный дом с черепичной крышей. Вмещает 10 человек.',
    cat: 'home',
    w: 2,
    h: 2,
    cost: { wood: 20, stone: 30 },
    time: 24,
    housing: 10,
    req: 'stonework',
  },
  storage: {
    id: 'storage',
    name: 'Склад',
    desc: 'Пункт сдачи ресурсов вдали от стоянки. Лимит запасов каждого ресурса +250.',
    cat: 'eco',
    w: 2,
    h: 2,
    cost: { wood: 30 },
    time: 14,
    housing: 0,
    req: 'storage',
    dropoff: true,
    cap: 250,
  },
  farm: {
    id: 'farm',
    name: 'Поле',
    desc: 'Возделанное поле. Само приносит еду (+0.45/с).',
    cat: 'eco',
    w: 3,
    h: 2,
    cost: { wood: 15 },
    time: 12,
    housing: 0,
    req: 'agri',
    food: 0.45,
  },
  lodge: {
    id: 'lodge',
    name: 'Дом охотника',
    desc: 'Охотники приносят мясо и шкуры (+0.35 еды/с).',
    cat: 'eco',
    w: 2,
    h: 2,
    cost: { wood: 25, stone: 5 },
    time: 14,
    housing: 0,
    req: 'hunting',
    food: 0.35,
  },
  shrine: {
    id: 'shrine',
    name: 'Святилище',
    desc: 'Место обрядов и размышлений. Много знаний (+1.6/с).',
    cat: 'cult',
    w: 2,
    h: 2,
    cost: { wood: 20, stone: 25 },
    time: 18,
    housing: 0,
    req: 'rituals',
    know: 1.6,
    light: true,
    upkeep: 0.02,
  },
  hall: {
    id: 'hall',
    name: 'Большой дом',
    desc: 'Центр деревни. Вмещает 20 человек, даёт знания (+2.5/с) и склад (+150).',
    cat: 'home',
    w: 3,
    h: 3,
    cost: { wood: 80, stone: 60, goods: 10 },
    time: 40,
    housing: 20,
    req: 'town',
    dropoff: true,
    know: 2.5,
    light: true,
    cap: 150,
    upkeep: 0.06,
  },
  barracks: {
    id: 'barracks',
    name: 'Казарма',
    desc: 'Здесь обучают воинов. +10 к лимиту армии. Нужны товары на оружие.',
    cat: 'war',
    w: 3,
    h: 2,
    cost: { wood: 40, stone: 30, goods: 8 },
    time: 24,
    housing: 0,
    req: 'spears',
    army: 10,
    upkeep: 0.05,
  },
  market: {
    id: 'market',
    name: 'Рынок',
    desc: 'Откройте «Экономику» (M): здесь можно продавать и покупать ресурсы. Даёт золото (+0.35/с).',
    cat: 'ind',
    w: 2,
    h: 2,
    cost: { wood: 35, stone: 5 },
    time: 14,
    housing: 0,
    req: 'barter',
    gold: 0.35,
    upkeep: 0.02,
  },
  forge: {
    id: 'forge',
    name: 'Кузница',
    desc: 'Кузнецы куют мечи (бронзовые, железные, стальные) из камня и товаров. Откройте «Жизнь» [N] → Производство и закажите оружие.',
    cat: 'war',
    w: 2,
    h: 2,
    cost: { wood: 20, stone: 30, goods: 6 },
    time: 20,
    housing: 0,
    req: 'smithing',
    jobs: 2,
    gold: 0.1,
    light: true,
    upkeep: 0.04,
  },
  library: {
    id: 'library',
    name: 'Библиотека',
    desc: 'Хранилище свитков и книг. Много знаний (+2.2/с).',
    cat: 'cult',
    w: 2,
    h: 2,
    cost: { wood: 40, stone: 40, goods: 8 },
    time: 22,
    housing: 0,
    req: 'library_tech',
    know: 2.2,
    light: true,
    upkeep: 0.04,
  },
  tower: {
    id: 'tower',
    name: 'Сторожевая башня',
    desc: 'Усиливает защиту селения (+10% к обороне).',
    cat: 'war',
    w: 2,
    h: 2,
    cost: { wood: 25, stone: 35, goods: 5 },
    time: 20,
    housing: 0,
    req: 'fortification',
    def: 0.1,
    upkeep: 0.03,
  },
  workshop: {
    id: 'workshop',
    name: 'Мастерская',
    desc: 'Здесь работают люди: корзины, топоры, кирки, плуги, тележки, дубины, копья и щиты — по заказам из панели «Жизнь» [N]. Ещё свободные жители делают товары.',
    cat: 'ind',
    w: 2,
    h: 2,
    cost: { wood: 30, stone: 10 },
    time: 14,
    housing: 0,
    req: 'carpentry',
    jobs: 2,
    prod: { in: { wood: 0.1 }, out: 0.05 },
    cap: 40,
    upkeep: 0.02,
  },
  foundry: {
    id: 'foundry',
    name: 'Литейная',
    desc: 'Плавит камень и дерево в товары. Втрое эффективнее мастерской, нужны 3 работника.',
    cat: 'ind',
    w: 2,
    h: 2,
    cost: { wood: 40, stone: 45, goods: 4 },
    time: 22,
    housing: 0,
    req: 'bronze',
    jobs: 3,
    prod: { in: { stone: 0.12, wood: 0.04 }, out: 0.12 },
    light: true,
    upkeep: 0.05,
  },
  factory: {
    id: 'factory',
    name: 'Завод',
    desc: 'Конвейер: огромный выпуск товаров из дерева и камня. Нужны 6 работников и золото на содержание.',
    cat: 'ind',
    w: 3,
    h: 3,
    cost: { wood: 90, stone: 80, goods: 20 },
    time: 36,
    housing: 0,
    req: 'gears',
    reqAlt: { spec: 'factory', req: 'iron' },
    jobs: 6,
    prod: { in: { wood: 0.22, stone: 0.2 }, out: 0.5 },
    light: true,
    cap: 100,
    upkeep: 0.1,
  },
  bowyer: {
    id: 'bowyer',
    name: 'Лучная мастерская',
    desc: 'Мастера делают луки и арбалеты — когда открыта технология. Заказы: «Жизнь» [N].',
    cat: 'ind',
    w: 2,
    h: 2,
    cost: { wood: 30, stone: 8 },
    time: 14,
    housing: 0,
    req: 'archery',
    jobs: 2,
    upkeep: 0.02,
  },
  armory: {
    id: 'armory',
    name: 'Бронная мастерская',
    desc: 'Бронники шьют кожаную броню и куют кольчуги для воинов.',
    cat: 'ind',
    w: 2,
    h: 2,
    cost: { wood: 25, stone: 30, goods: 5 },
    time: 20,
    housing: 0,
    req: 'armorsmith',
    jobs: 2,
    light: true,
    upkeep: 0.03,
  },
  stable: {
    id: 'stable',
    name: 'Конюшня',
    desc: 'Конюхи выращивают боевых коней для кавалерии.',
    cat: 'ind',
    w: 3,
    h: 2,
    cost: { wood: 40, stone: 5 },
    time: 18,
    housing: 0,
    req: 'cavalry',
    jobs: 2,
    upkeep: 0.03,
  },
  siegeworks: {
    id: 'siegeworks',
    name: 'Осадная мастерская',
    desc: 'Инженеры строят катапульты и тараны.',
    cat: 'ind',
    w: 3,
    h: 2,
    cost: { wood: 60, stone: 30, goods: 8 },
    time: 26,
    housing: 0,
    req: 'siege',
    jobs: 3,
    upkeep: 0.04,
  },
  gunsmith: {
    id: 'gunsmith',
    name: 'Оружейная мануфактура',
    desc: 'Порох и мушкеты — оружие нового времени.',
    cat: 'ind',
    w: 2,
    h: 2,
    cost: { wood: 40, stone: 50, goods: 12 },
    time: 28,
    housing: 0,
    req: 'gunpowder',
    jobs: 3,
    light: true,
    upkeep: 0.05,
  },
  cemetery: {
    id: 'cemetery',
    name: 'Кладбище',
    desc: 'Павших героев хоронят здесь («Жизнь» [N]). Жители приходят помянуть, а память о героях поднимает боевой дух армии.',
    cat: 'cult',
    w: 3,
    h: 2,
    cost: { wood: 20, stone: 20 },
    time: 14,
    housing: 0,
    req: 'rituals',
    happy: 1,
  },
};

export const BUILD_ORDER: BuildingId[] = [
  'shelter',
  'house',
  'stonehouse',
  'hall',
  'campfire',
  'storage',
  'farm',
  'lodge',
  'workshop',
  'bowyer',
  'armory',
  'stable',
  'siegeworks',
  'gunsmith',
  'foundry',
  'factory',
  'market',
  'shrine',
  'library',
  'barracks',
  'cemetery',
  'forge',
  'tower',
];

export const MALE_NAMES = ['Арин', 'Борг', 'Дан', 'Ерик', 'Грон', 'Ивар', 'Кай', 'Лев', 'Мор', 'Нур', 'Орм', 'Рюрик', 'Тор', 'Ульф', 'Яр', 'Жар', 'Стах', 'Вран'];
export const FEMALE_NAMES = ['Айра', 'Бела', 'Вея', 'Гая', 'Дара', 'Ема', 'Зара', 'Лада', 'Мира', 'Нея', 'Ола', 'Рада', 'Сана', 'Тая', 'Уна', 'Ясна', 'Ильва', 'Кора'];

export const DAY_LENGTH = 180; // секунд игрового времени в сутках
