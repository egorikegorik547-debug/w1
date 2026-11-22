import type { BuildingId } from './data';

/* ───────────── Характеры ───────────── */

export type Trait = 'coward' | 'worker' | 'drunkard' | 'brave' | 'kind';

export const TRAITS: Record<Trait, { name: string; icon: string; desc: string }> = {
  coward: { name: 'Трус', icon: '🐭', desc: 'Убегает от волков и воров. Плохой воин (−30% силы).' },
  worker: { name: 'Трудяга', icon: '💪', desc: 'Работает на 25% быстрее остальных.' },
  drunkard: { name: 'Пьяница', icon: '🍺', desc: 'Работает медленнее, вечером пропадает у костра.' },
  brave: { name: 'Храбрец', icon: '🦁', desc: 'Не боится зверей. Отличный воин (+25% силы).' },
  kind: { name: 'Добряк', icon: '💛', desc: 'Радует соседей: чаще в семье рождаются дети.' },
};

export const TRAIT_LIST = Object.keys(TRAITS) as Trait[];

export function randomTrait(): Trait {
  const r = Math.random();
  if (r < 0.26) return 'worker';
  if (r < 0.44) return 'drunkard';
  if (r < 0.62) return 'coward';
  if (r < 0.8) return 'brave';
  return 'kind';
}

export const FAMILY_NAMES = ['Волковы', 'Дубровы', 'Медведевы', 'Соколовы', 'Ржановы', 'Кузнецовы', 'Лесовы', 'Громовы', 'Ясеневы', 'Берёзины', 'Орловы', 'Рысины', 'Беловы', 'Черновы', 'Зорины', 'Горчаковы', 'Тихомировы', 'Вороновы'];

/* ───────────── Предметы и рецепты ───────────── */

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  kind: 'tool' | 'weapon' | 'armor' | 'shield' | 'horse' | 'siege' | 'mat';
  /** бонус к силе воина (оружие/броня/щит/конь) */
  pow?: number;
  desc: string;
}

export const ITEMS: Record<string, ItemDef> = {
  basket: { id: 'basket', name: 'Корзина', icon: '🧺', kind: 'tool', desc: 'Сборщики носят больше и собирают быстрее (+30% ягод, +2 ноши) — по одной на человека.' },
  axe: { id: 'axe', name: 'Топор', icon: '🪓', kind: 'tool', desc: 'Рубка леса быстрее на 25% (по одному на человека).' },
  pickaxe: { id: 'pickaxe', name: 'Кирка', icon: '⛏️', kind: 'tool', desc: 'Добыча камня быстрее на 30% и +1 ноши.' },
  plow: { id: 'plow', name: 'Плуг', icon: '🚜', kind: 'tool', desc: 'Урожай полей +20% (по одному плугу на поле).' },
  cart: { id: 'cart', name: 'Тележка', icon: '🛒', kind: 'tool', desc: 'Люди ходят быстрее (+25%), по тележке на троих.' },
  club: { id: 'club', name: 'Дубина', icon: '🏏', kind: 'weapon', pow: 0.1, desc: 'Простое оружие воина.' },
  spear: { id: 'spear', name: 'Копьё', icon: '🔱', kind: 'weapon', pow: 0.22, desc: 'Копьё с кремнёвым наконечником.' },
  bow: { id: 'bow', name: 'Лук', icon: '🏹', kind: 'weapon', pow: 0.3, desc: 'Дальний бой.' },
  crossbow: { id: 'crossbow', name: 'Арбалет', icon: '🎯', kind: 'weapon', pow: 0.45, desc: 'Мощный и точный выстрел.' },
  bronze_sword: { id: 'bronze_sword', name: 'Бронзовый меч', icon: '⚔️', kind: 'weapon', pow: 0.4, desc: 'Меч из бронзы.' },
  iron_sword: { id: 'iron_sword', name: 'Железный меч', icon: '🗡️', kind: 'weapon', pow: 0.65, desc: 'Прочный железный клинок.' },
  steel_sword: { id: 'steel_sword', name: 'Стальной меч', icon: '🔪', kind: 'weapon', pow: 0.95, desc: 'Булатный клинок.' },
  musket: { id: 'musket', name: 'Мушкет', icon: '🔫', kind: 'weapon', pow: 1.4, desc: 'Огнестрельное оружие.' },
  shield: { id: 'shield', name: 'Щит', icon: '🛡️', kind: 'shield', pow: 0.15, desc: 'Деревянный щит воина.' },
  leather: { id: 'leather', name: 'Кожаная броня', icon: '🦺', kind: 'armor', pow: 0.15, desc: 'Лёгкая броня из шкур.' },
  chainmail: { id: 'chainmail', name: 'Кольчуга', icon: '⛓️', kind: 'armor', pow: 0.38, desc: 'Железные кольца защищают воина.' },
  horse: { id: 'horse', name: 'Боевой конь', icon: '🐎', kind: 'horse', pow: 0.5, desc: 'Всадник сильнее пехотинца, отряд идёт быстрее.' },
  catapult: { id: 'catapult', name: 'Катапульта', icon: '💥', kind: 'siege', pow: 3, desc: 'Осадное орудие: +3 к силе армии (до 4 штук).' },
  powder: { id: 'powder', name: 'Порох', icon: '🧨', kind: 'mat', desc: 'Нужен для мушкетов.' },
};

export interface Recipe {
  id: string;
  item: string;
  bld: BuildingId;
  tech: string;
  in: Record<string, number>;
  time: number;
  out: number;
}

const R = (item: string, bld: BuildingId, tech: string, inp: Record<string, number>, time: number, out = 1): Recipe => ({ id: item, item, bld, tech, in: inp, time, out });

export const RECIPES: Recipe[] = [
  R('basket', 'workshop', 'baskets', { wood: 3 }, 7),
  R('axe', 'workshop', 'stone_tools', { wood: 2, stone: 1 }, 10),
  R('club', 'workshop', 'clubs', { wood: 3 }, 6),
  R('spear', 'workshop', 'spears', { wood: 3, stone: 1 }, 9),
  R('shield', 'workshop', 'shields', { wood: 5 }, 10),
  R('pickaxe', 'workshop', 'pickaxes', { wood: 2, stone: 3 }, 12),
  R('plow', 'workshop', 'plow', { wood: 4, stone: 2 }, 14),
  R('cart', 'workshop', 'wheel', { wood: 10 }, 20),
  R('bow', 'bowyer', 'archery', { wood: 4 }, 12),
  R('crossbow', 'bowyer', 'crossbow', { wood: 5, goods: 3, stone: 1 }, 18),
  R('bronze_sword', 'forge', 'bronze_weapons', { stone: 5, goods: 2, wood: 1 }, 16),
  R('iron_sword', 'forge', 'iron_weapons', { stone: 8, goods: 4 }, 22),
  R('steel_sword', 'forge', 'steel_arms', { stone: 10, goods: 6 }, 28),
  R('leather', 'armory', 'armorsmith', { wood: 2, food: 5 }, 12),
  R('chainmail', 'armory', 'chainmail', { stone: 10, goods: 5 }, 26),
  R('horse', 'stable', 'cavalry', { food: 20, wood: 4 }, 25),
  R('catapult', 'siegeworks', 'siege', { wood: 20, stone: 10, goods: 4 }, 40),
  R('powder', 'gunsmith', 'gunpowder', { stone: 4, food: 2 }, 10, 2),
  R('musket', 'gunsmith', 'muskets', { goods: 6, wood: 2, powder: 1 }, 30),
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export const CRAFT_BUILDINGS: BuildingId[] = ['workshop', 'bowyer', 'forge', 'armory', 'stable', 'siegeworks', 'gunsmith'];

/* ───────────── Странники ───────────── */

export type VisitorKind = 'smith' | 'witch' | 'knight';

export const VISITORS: Record<VisitorKind, { name: string; icon: string; greet: string }> = {
  smith: { name: 'Бродячий кузнец', icon: '🔨', greet: 'Бродячий кузнец пришёл в деревню со своим молотом' },
  witch: { name: 'Ведьма-травница', icon: '🌿', greet: 'К деревне вышла ведьма-травница с корзиной трав' },
  knight: { name: 'Странствующий рыцарь', icon: '🛡️', greet: 'В деревню забрёл странствующий рыцарь' },
};

export const KNIGHT_NAMES = ['Роланд', 'Ланселот', 'Эрик', 'Гавейн', 'Ричард', 'Бертран'];
export const WITCH_NAMES = ['Баба Яга', 'Мара', 'Велена', 'Ягиня', 'Морена'];
export const SMITH_NAMES = ['Горн', 'Вулкан', 'Кузьма', 'Брок', 'Свар'];
