import { BUILDINGS } from './data';
import { GOVS, SPECS, type GovId, type SpecId } from './meta';
import { LIFE, SPEC_TECHS } from './spectechs';

export type BranchId = 'war' | 'prod' | 'build' | 'agri' | 'mine' | 'wood' | 'trade' | 'sci' | 'soc';

export interface BranchDef {
  id: BranchId;
  name: string;
  sub: string;
  icon: string;
  color: string;
}

export const BRANCHES: BranchDef[] = [
  { id: 'war', name: 'Военное дело', sub: 'Оружие, доспехи и тактика', icon: '⚔️', color: '#e5484d' },
  { id: 'prod', name: 'Производство', sub: 'Огонь, металлы и механизмы', icon: '🔨', color: '#f08a24' },
  { id: 'build', name: 'Строительство', sub: 'Дома, стены и города', icon: '🏛️', color: '#c9a35a' },
  { id: 'agri', name: 'Земледелие', sub: 'Поля, скот и охота', icon: '🌾', color: '#7bc043' },
  { id: 'mine', name: 'Горное дело', sub: 'Камень, руда и шахты', icon: '⛏️', color: '#8f9bb3' },
  { id: 'wood', name: 'Лесное дело', sub: 'Рубка и лесопереработка', icon: '🪓', color: '#3fa56b' },
  { id: 'trade', name: 'Торговля', sub: 'Золото, караваны и флот', icon: '🪙', color: '#f2c94c' },
  { id: 'sci', name: 'Наука', sub: 'Знания, медицина и открытия', icon: '🔬', color: '#4aa8ff' },
  { id: 'soc', name: 'Общество', sub: 'Законы, власть и порядок', icon: '👑', color: '#b362ff' },
];
export const BRANCH_BY_ID = Object.fromEntries(BRANCHES.map((b) => [b.id, b])) as Record<BranchId, BranchDef>;

export interface Mods {
  chop: number;
  mine: number;
  gather: number;
  build: number;
  carry: number;
  know: number;
  birth: number;
  grow: number;
  farm: number;
  lodge: number;
  speed: number;
  hunger: number;
  gold: number;
  atk: number;
  def: number;
  armyCost: number;
  loyalty: number;
  housing: number;
  march: number;
  annex: number;
  prod: number;
  cap: number;
}

export type Fx = Partial<Mods>;
const ADD: (keyof Mods)[] = ['carry', 'loyalty'];

export function baseMods(): Mods {
  return { chop: 1, mine: 1, gather: 1, build: 1, carry: 4, know: 1, birth: 1, grow: 1, farm: 1, lodge: 1, speed: 1, hunger: 1, gold: 1, atk: 1, def: 1, armyCost: 1, loyalty: 0, housing: 1, march: 1, annex: 1, prod: 1, cap: 1 };
}

export function applyFx(m: Mods, fx: Fx | undefined) {
  if (!fx) return;
  for (const k of Object.keys(fx) as (keyof Mods)[]) {
    const v = fx[k]!;
    if (ADD.includes(k)) m[k] += v;
    else m[k] *= v;
  }
}

const LABEL: Record<keyof Mods, string> = {
  chop: 'Рубка',
  mine: 'Добыча камня',
  gather: 'Сбор ягод',
  build: 'Скорость стройки',
  carry: 'Ноша',
  know: 'Знания',
  birth: 'Рождаемость',
  grow: 'Рост детей',
  farm: 'Урожай полей',
  lodge: 'Охота',
  speed: 'Скорость людей',
  hunger: 'Потребление еды',
  gold: 'Доход золота',
  atk: 'Сила атаки',
  def: 'Оборона',
  armyCost: 'Цена воинов',
  loyalty: 'Лояльность',
  housing: 'Вместимость жилья',
  march: 'Скорость походов',
  annex: 'Цена присоединения',
  prod: 'Выпуск товаров',
  cap: 'Лимит складов',
};
const INVERSE: (keyof Mods)[] = ['hunger', 'armyCost', 'annex'];

export function fxText(fx: Fx): string[] {
  const out: string[] = [];
  for (const k of Object.keys(fx) as (keyof Mods)[]) {
    const v = fx[k]!;
    if (ADD.includes(k)) out.push(`${LABEL[k]} ${v >= 0 ? '+' : ''}${v}`);
    else if (INVERSE.includes(k)) out.push(`${LABEL[k]} ${v < 1 ? '−' : '+'}${Math.abs(Math.round((1 - v) * 100))}%`);
    else if (k === 'birth') out.push(`${LABEL[k]} ${v < 1 ? '+' : '−'}${Math.abs(Math.round((1 / v - 1) * 100))}%`);
    else out.push(`${LABEL[k]} ${v >= 1 ? '+' : '−'}${Math.abs(Math.round((v - 1) * 100))}%`);
  }
  return out;
}

export interface TechDef {
  id: string;
  name: string;
  desc: string;
  branch: BranchId;
  cost: number;
  req: string[];
  icon: string;
  fx: Fx;
  extra?: string;
  effect: string;
  col: number;
  spec?: SpecId;
  life?: string;
}

type Row = [string, string, BranchId, number, string[], string, Fx, string, string?];

const RAW: Row[] = [
  // ───────── Военное дело ─────────
  ['clubs', 'Дубины', 'war', 20, [], '🏏', {}, 'Простое оружие для защиты племени.', 'Открывает: Дубина (Мастерская)'],
  ['spears', 'Копья', 'war', 55, ['clubs', 'hunting'], '🔱', {}, 'Заострённые древки с кремнёвым наконечником.', 'Открывает: Копьё (Мастерская), Казарма'],
  ['shields', 'Щиты', 'war', 90, ['spears'], '🛡️', {}, 'Плетёные и деревянные щиты.', 'Открывает: Щит (Мастерская)'],
  ['archery', 'Стрельба из лука', 'war', 130, ['spears'], '🏹', {}, 'Дальний бой — залпы стрел.', 'Открывает: Лучная мастерская, Лук'],
  ['bronze_weapons', 'Бронзовое оружие', 'war', 260, ['bronze', 'shields'], '⚔️', {}, 'Мечи и топоры из бронзы.', 'Открывает: Бронзовый меч (Кузница)'],
  ['fortification', 'Укрепления', 'war', 300, ['shields', 'stonework'], '🏰', { def: 1.25 }, 'Валы, рвы и каменные стены.'],
  ['military_drill', 'Строевая подготовка', 'war', 340, ['archery', 'shields'], '🥁', { atk: 1.1, armyCost: 0.85 }, 'Слаженные действия отряда.'],
  ['iron_weapons', 'Железное оружие', 'war', 520, ['iron', 'bronze_weapons'], '🗡️', {}, 'Прочные железные клинки.', 'Открывает: Железный меч (Кузница)'],
  ['chainmail', 'Кольчуга', 'war', 560, ['iron', 'fortification'], '⛓️', {}, 'Железные кольца защищают воина.', 'Открывает: Кольчуга (Бронная мастерская)'],
  ['cavalry', 'Кавалерия', 'war', 700, ['husbandry', 'military_drill'], '🐎', {}, 'Быстрые конные отряды.', 'Открывает: Конюшня, Боевой конь'],
  ['siege', 'Осадные орудия', 'war', 900, ['fortification', 'iron_weapons'], '💥', {}, 'Тараны и катапульты.', 'Открывает: Осадная мастерская, Катапульта'],
  ['crossbow', 'Арбалет', 'war', 1000, ['archery', 'iron_weapons'], '🎯', {}, 'Мощный и точный выстрел.', 'Открывает: Арбалет (Лучная мастерская)'],
  ['steel_arms', 'Стальное оружие', 'war', 1400, ['steel', 'iron_weapons'], '🔪', {}, 'Булатные клинки.', 'Открывает: Стальной меч (Кузница)'],
  ['gunpowder', 'Порох', 'war', 2000, ['alchemy', 'siege'], '🧨', {}, 'Гром и огонь на поле боя.', 'Открывает: Оружейная мануфактура, Порох'],
  ['muskets', 'Мушкеты', 'war', 2800, ['gunpowder', 'steel_arms'], '🔫', {}, 'Стрелковая пехота нового времени.', 'Открывает: Мушкет (Оружейная мануфактура)'],
  ['war_academy', 'Военная академия', 'war', 3500, ['muskets', 'military_drill'], '🎖️', { atk: 1.15, def: 1.15, armyCost: 0.8 }, 'Офицерская школа и стратегия.'],

  // ───────── Производство ─────────
  ['fire', 'Огонь', 'prod', 12, [], '🔥', {}, 'Приручённое пламя греет и освещает ночь.'],
  ['pottery', 'Гончарное дело', 'prod', 45, ['fire'], '🏺', { carry: 1, cap: 1.15 }, 'Глиняные сосуды для запасов.'],
  ['weaving', 'Ткачество', 'prod', 80, ['pottery'], '🧵', { hunger: 0.95 }, 'Тёплая одежда бережёт силы.'],
  ['kiln', 'Обжиг', 'prod', 120, ['pottery'], '🧱', { build: 1.05, prod: 1.05 }, 'Печи для кирпича и керамики.'],
  ['bronze', 'Бронза', 'prod', 220, ['hunting', 'stonework'], '⚒️', { chop: 1.3, mine: 1.3, build: 1.15 }, 'Сплав меди и олова — металл нового века.'],
  ['smithing', 'Кузнечное дело', 'prod', 330, ['bronze'], '🔨', { build: 1.1, atk: 1.05 }, 'Мастера ковки и литья.'],
  ['bellows', 'Кузнечные меха', 'prod', 260, ['smithing'], '🌬️', { mine: 1.1, prod: 1.1 }, 'Жаркий горн плавит больше руды.'],
  ['iron', 'Железо', 'prod', 400, ['bronze'], '🗡️', { chop: 1.4, mine: 1.4, carry: 2 }, 'Крепкие кованые орудия и плуги.'],
  ['waterwheel', 'Водяное колесо', 'prod', 450, ['wheel', 'carpentry'], '🎡', { build: 1.1, chop: 1.1 }, 'Сила реки на службе людей.'],
  ['armorsmith', 'Бронники', 'prod', 600, ['smithing', 'iron'], '🥋', {}, 'Мастерская доспехов.', 'Открывает: Бронная мастерская, Кожаная броня'],
  ['steel', 'Сталь', 'prod', 900, ['iron', 'bellows'], '⚙️', { chop: 1.2, mine: 1.2, prod: 1.15 }, 'Закалённый сплав — основа инструмента.'],
  ['gears', 'Механизмы', 'prod', 1200, ['steel'], '🛠️', { build: 1.2, prod: 1.2 }, 'Шестерни, рычаги и блоки.'],
  ['steam', 'Паровая машина', 'prod', 3000, ['gears', 'coal'], '♨️', { chop: 1.3, mine: 1.3, build: 1.3, prod: 1.25 }, 'Пар вращает колёса индустрии.'],
  ['industry', 'Мануфактуры', 'prod', 3600, ['steam', 'banking'], '🏭', { gold: 1.2, build: 1.2, prod: 1.3 }, 'Фабрики и конвейеры.'],

  // ───────── Строительство ─────────
  ['shelter', 'Шалаш', 'build', 25, [], '⛺', {}, 'Укрытие от дождя и ветра.'],
  ['carpentry', 'Плотницкое дело', 'build', 70, ['shelter', 'stone_tools'], '🪵', { build: 1.2 }, 'Брёвна, вязка и первые срубы.'],
  ['palisade', 'Частокол', 'build', 110, ['shelter'], '🚧', { def: 1.1 }, 'Деревянная ограда селения.'],
  ['storage', 'Хранение', 'build', 100, ['carpentry'], '📦', { cap: 1.3 }, 'Амбары и навесы для запасов.'],
  ['stonework', 'Каменная кладка', 'build', 150, ['storage'], '🧱', {}, 'Камень на растворе — на века.'],
  ['town', 'Поселение', 'build', 280, ['stonework'], '🏘️', {}, 'Дома объединяются в деревню.'],
  ['bricks', 'Кирпич', 'build', 200, ['stonework', 'kiln'], '🟫', { build: 1.1 }, 'Ровные обожжённые блоки.'],
  ['masonry', 'Зодчество', 'build', 420, ['bricks'], '🏛️', { build: 1.2 }, 'Своды, колонны и арки.'],
  ['roads', 'Мощёные дороги', 'build', 500, ['wheel', 'masonry'], '🛣️', { speed: 1.2 }, 'Камень под ногами и колёсами.'],
  ['aqueduct', 'Акведук', 'build', 750, ['masonry'], '🌉', { housing: 1.15 }, 'Чистая вода — больше жителей.'],
  ['cathedral', 'Соборы', 'build', 1000, ['masonry', 'rituals'], '⛪', { know: 1.1, loyalty: 8 }, 'Величественные храмы объединяют людей.'],
  ['glass', 'Стекло', 'build', 1100, ['kiln', 'masonry'], '💎', { housing: 1.05, know: 1.05 }, 'Окна для света и обсерваторий.'],
  ['sanitation', 'Канализация', 'build', 1400, ['aqueduct'], '🚰', { housing: 1.15, birth: 0.9 }, 'Здоровье городов.'],
  ['urban_planning', 'Градостроительство', 'build', 1800, ['roads', 'aqueduct', 'laws'], '🗺️', { housing: 1.1, build: 1.15, loyalty: 5 }, 'Улицы, кварталы и площади.'],
  ['concrete', 'Бетон', 'build', 2500, ['bricks', 'steel'], '🏗️', { build: 1.4, housing: 1.2, cap: 1.25 }, 'Высотные и прочные здания.'],

  // ───────── Земледелие ─────────
  ['baskets', 'Плетение корзин', 'agri', 20, [], '🧺', {}, 'Лозу — в корзину, ягоды — в запас.', 'Открывает: Корзина (Мастерская)'],
  ['fishing', 'Рыболовство', 'agri', 60, ['baskets'], '🎣', { gather: 1.15, hunger: 0.95 }, 'Сети и удочки дают пищу.'],
  ['agri', 'Земледелие', 'agri', 80, ['baskets'], '🌾', {}, 'Зерно можно сеять, а не искать.'],
  ['hunting', 'Охота', 'agri', 70, ['stone_tools'], '🏹', {}, 'Копья и загонная охота на дичь.'],
  ['granary', 'Зернохранилище', 'agri', 140, ['agri', 'storage'], '🌽', { hunger: 0.9, cap: 1.2 }, 'Запасы не гниют.'],
  ['orchards', 'Сады', 'agri', 300, ['agri'], '🍎', { gather: 1.2, farm: 1.1 }, 'Фруктовые деревья у дома.'],
  ['irrigation', 'Орошение', 'agri', 160, ['agri'], '💧', { farm: 1.6 }, 'Канавы приносят воду к посевам.'],
  ['plow', 'Плуг', 'agri', 240, ['agri', 'stone_tools'], '🚜', {}, 'Глубокая вспашка земли.', 'Открывает: Плуг (Мастерская)'],
  ['husbandry', 'Скотоводство', 'agri', 260, ['irrigation', 'hunting'], '🐑', { farm: 1.25, lodge: 1.5 }, 'Прирученные животные — живая кладовая.'],
  ['beekeeping', 'Пчеловодство', 'agri', 250, ['orchards'], '🐝', { farm: 1.1, gold: 1.05 }, 'Мёд и воск.'],
  ['dairy', 'Молочное хозяйство', 'agri', 480, ['husbandry'], '🥛', { lodge: 1.2, farm: 1.1 }, 'Сыр и масло.'],
  ['crop_rotation', 'Севооборот', 'agri', 420, ['plow', 'irrigation'], '🔄', { farm: 1.25 }, 'Земля отдыхает и родит больше.'],
  ['iron_plow', 'Железный плуг', 'agri', 700, ['plow', 'iron'], '⚙️', { farm: 1.3 }, 'Тяжёлые земли поддаются.'],
  ['windmill', 'Ветряная мельница', 'agri', 900, ['crop_rotation', 'carpentry'], '🌬️', { farm: 1.2 }, 'Мука для хлеба.'],
  ['fertilizer', 'Удобрения', 'agri', 1500, ['crop_rotation', 'alchemy'], '🧪', { farm: 1.35 }, 'Химия на службе урожая.'],
  ['mechanized', 'Механизация', 'agri', 2800, ['fertilizer', 'steam'], '🚛', { farm: 1.5 }, 'Машины работают в полях.'],

  // ───────── Горное дело ─────────
  ['flint', 'Кремневый скол', 'mine', 15, [], '🔶', { mine: 1.1 }, 'Острые сколы для резки.'],
  ['stone_tools', 'Каменные орудия', 'mine', 30, ['fire'], '🪓', { chop: 1.25 }, 'Топоры и кирки из скола кремня.', 'Можно добывать камень'],
  ['quarrying', 'Каменоломни', 'mine', 120, ['stone_tools'], '⛰️', { mine: 1.2 }, 'Организованная добыча камня.'],
  ['pickaxes', 'Кирки', 'mine', 200, ['quarrying'], '⛏️', { mine: 1.1 }, 'Прочные кирки облегчают труд.', 'Открывает: Кирка (Мастерская)'],
  ['prospecting', 'Рудознатство', 'mine', 300, ['pickaxes'], '🧭', { mine: 1.1, gold: 1.05 }, 'Поиск жил и самоцветов.'],
  ['mine_shafts', 'Шахты', 'mine', 520, ['prospecting', 'carpentry'], '🕳️', { mine: 1.3 }, 'Глубокие выработки.'],
  ['coal', 'Каменный уголь', 'mine', 650, ['mine_shafts'], '⚫', { mine: 1.1 }, 'Топливо для металла и пара.'],
  ['mine_carts', 'Вагонетки', 'mine', 800, ['mine_shafts', 'wheel'], '🛒', { carry: 2, mine: 1.15 }, 'Рельсы под землёй.'],
  ['mine_vent', 'Вентиляция шахт', 'mine', 1100, ['mine_shafts'], '💨', { mine: 1.2 }, 'Свежий воздух — больше работы.'],
  ['blasting', 'Взрывные работы', 'mine', 1700, ['coal', 'alchemy'], '🌋', { mine: 1.4 }, 'Порох ломает скалы.'],
  ['drills', 'Буровые машины', 'mine', 2900, ['blasting', 'steam'], '🔩', { mine: 1.5 }, 'Паровые буры.'],

  // ───────── Лесное дело ─────────
  ['forest_paths', 'Лесные тропы', 'wood', 18, [], '🥾', { chop: 1.1 }, 'Проторённые дорожки в чащу.'],
  ['hatchets', 'Топоры на рукояти', 'wood', 60, ['forest_paths'], '🪓', { chop: 1.2 }, 'Удобная насадка на древко.'],
  ['sawpit', 'Пильная яма', 'wood', 180, ['hatchets', 'carpentry'], '🪚', { chop: 1.2, build: 1.1 }, 'Доски вместо брёвен.'],
  ['logging_camps', 'Лесные лагеря', 'wood', 300, ['sawpit'], '🏕️', { chop: 1.2, carry: 1 }, 'Лесорубы живут у делянки.'],
  ['two_man_saw', 'Двуручная пила', 'wood', 420, ['sawpit', 'bronze'], '🪵', { chop: 1.25 }, 'Валят самые толстые стволы.'],
  ['forestry', 'Лесоводство', 'wood', 600, ['logging_camps'], '🌲', { chop: 1.15, gather: 1.1 }, 'Уход за лесом.'],
  ['log_rafts', 'Сплав леса', 'wood', 800, ['logging_camps', 'wheel'], '🛶', { carry: 2, chop: 1.1 }, 'Река несёт брёвна.'],
  ['lumber_mill', 'Водяная лесопилка', 'wood', 1100, ['two_man_saw', 'waterwheel'], '🏭', { chop: 1.35 }, 'Пилы без устали.'],
  ['steam_saw', 'Паровая пила', 'wood', 3200, ['lumber_mill', 'steam'], '⚡', { chop: 1.6 }, 'Лес падает целыми делянками.'],

  // ───────── Торговля ─────────
  ['barter', 'Мена', 'trade', 30, [], '🤝', { gold: 1.1 }, 'Обмен товарами между племенами.'],
  ['currency', 'Монеты', 'trade', 240, ['barter', 'bronze'], '🪙', { gold: 1.25 }, 'Единая мера ценности.'],
  ['wheel', 'Колесо и тропы', 'trade', 300, ['husbandry'], '🛞', { speed: 1.25, cap: 1.1 }, 'Тачки, телеги и утоптанные дороги.'],
  ['caravans', 'Караваны', 'trade', 350, ['wheel', 'currency'], '🐪', { gold: 1.15, march: 1.15 }, 'Торговые пути между селениями.'],
  ['harbor', 'Гавань', 'trade', 500, ['carpentry', 'currency'], '⚓', { gold: 1.1 }, 'Причалы и верфи.'],
  ['sailing', 'Парусный флот', 'trade', 700, ['harbor', 'weaving'], '⛵', { gold: 1.05 }, 'Паруса несут корабли через море.', 'Морские походы на другие острова'],
  ['guilds', 'Гильдии', 'trade', 900, ['currency', 'laws'], '🧑‍🔧', { gold: 1.2 }, 'Объединения мастеров и купцов.'],
  ['cartography', 'Картография', 'trade', 1000, ['sailing', 'writing'], '🧭', { march: 1.3 }, 'Точные карты берегов.'],
  ['banking', 'Банки', 'trade', 1300, ['currency', 'guilds'], '🏦', { gold: 1.3 }, 'Кредит и вклады.'],
  ['maritime_trade', 'Морская торговля', 'trade', 1500, ['sailing', 'banking'], '🚢', { gold: 1.25 }, 'Заморские товары.'],
  ['stock_exchange', 'Биржа', 'trade', 2800, ['banking', 'printing'], '📈', { gold: 1.4 }, 'Рынок капиталов.'],

  // ───────── Наука ─────────
  ['counting', 'Счёт', 'sci', 20, [], '🔢', { know: 1.1 }, 'Зарубки и узелки.'],
  ['medicine', 'Травничество', 'sci', 100, ['rituals'], '🌿', { grow: 2, birth: 0.8 }, 'Лечебные травы спасают жизни.'],
  ['writing', 'Письменность', 'sci', 200, ['medicine'], '📜', { know: 1.4 }, 'Знаки на глине хранят память веков.'],
  ['calendar', 'Календарь', 'sci', 90, ['counting', 'speech'], '📅', { farm: 1.1, know: 1.05 }, 'Сроки посева и жатвы.'],
  ['mathematics', 'Математика', 'sci', 300, ['counting', 'writing'], '➗', { know: 1.15, build: 1.05 }, 'Числа и геометрия.'],
  ['astronomy', 'Астрономия', 'sci', 250, ['calendar', 'writing'], '🔭', { know: 1.15 }, 'Наблюдение за звёздами.'],
  ['philosophy', 'Философия', 'sci', 450, ['writing', 'rituals'], '🧠', { know: 1.2 }, 'Размышления о мире и людях.'],
  ['library_tech', 'Библиотеки', 'sci', 380, ['writing'], '📚', { know: 1.1 }, 'Свитки собраны в одном месте.'],
  ['alchemy', 'Алхимия', 'sci', 800, ['philosophy', 'smithing'], '⚗️', { know: 1.1 }, 'Первые опыты с веществами.'],
  ['printing', 'Книгопечатание', 'sci', 1100, ['library_tech', 'mathematics'], '📖', { know: 1.25 }, 'Знания тиражируются.'],
  ['anatomy', 'Анатомия', 'sci', 1600, ['medicine', 'mathematics'], '🩺', { birth: 0.9, grow: 1.25 }, 'Врачи знают тело человека.'],
  ['university', 'Университет', 'sci', 1500, ['philosophy', 'printing'], '🎓', { know: 1.3 }, 'Школа учёных.'],
  ['scientific_method', 'Научный метод', 'sci', 2200, ['university', 'astronomy'], '🔬', { know: 1.3 }, 'Опыт и проверка гипотез.'],
  ['encyclopedia', 'Энциклопедия', 'sci', 3000, ['scientific_method', 'printing'], '📕', { know: 1.4 }, 'Всё знание мира в книгах.'],

  // ───────── Общество ─────────
  ['speech', 'Речь', 'soc', 15, [], '🗣️', { know: 1.25, birth: 0.8 }, 'Люди учатся говорить и передавать опыт.'],
  ['rituals', 'Обряды', 'soc', 60, ['speech'], '🪘', { know: 1.1 }, 'Танцы у огня и вера в духов предков.'],
  ['tribal_council', 'Совет племени', 'soc', 100, ['speech'], '👥', { know: 1.05, loyalty: 5 }, 'Старейшины решают вместе.'],
  ['chieftainship', 'Вождество', 'soc', 180, ['tribal_council'], '👑', { armyCost: 0.95, loyalty: 5 }, 'Один вождь ведёт многих.'],
  ['laws', 'Законы', 'soc', 500, ['writing', 'town'], '⚖️', { know: 1.2, hunger: 0.8 }, 'Порядок и согласие в большом племени.'],
  ['taxes', 'Налоги', 'soc', 400, ['laws', 'barter'], '💰', { gold: 1.2 }, 'Казна наполняется.'],
  ['civics', 'Гражданство', 'soc', 600, ['laws'], '🏛️', { loyalty: 8 }, 'Права и обязанности жителей.'],
  ['divine_right', 'Божественное право', 'soc', 700, ['chieftainship', 'rituals'], '✝️', { loyalty: 10 }, 'Власть от богов.'],
  ['diplomacy', 'Дипломатия', 'soc', 800, ['civics', 'writing'], '🕊️', { annex: 0.7 }, 'Послы и договоры.'],
  ['police', 'Стража порядка', 'soc', 1000, ['civics', 'shields'], '👮', { loyalty: 12 }, 'Закон подкреплён силой.'],
  ['constitution', 'Конституция', 'soc', 1200, ['civics', 'writing'], '📜', { loyalty: 10 }, 'Основной закон государства.', 'Открывает конституционную монархию'],
  ['republic', 'Республиканская идея', 'soc', 1400, ['civics', 'philosophy'], '🗳️', { know: 1.05 }, 'Власть — выборным.', 'Открывает президентскую республику'],
  ['parliament', 'Парламентаризм', 'soc', 1900, ['constitution', 'republic'], '🏛️', { know: 1.1, gold: 1.05 }, 'Законы пишет собрание.', 'Открывает парламентскую республику'],
  ['nationalism', 'Национальная идея', 'soc', 2000, ['constitution', 'printing'], '🚩', { loyalty: 15, atk: 1.1 }, 'Единый народ — единое дело.'],
];

const GOV_TECH: Record<string, GovId> = { constitution: 'con', republic: 'pres', parliament: 'par' };
void GOV_TECH;

// глубина (колонка) = самая длинная цепочка требований
const colMemo: Record<string, number> = {};
const rawById: Record<string, Row> = Object.fromEntries(RAW.map((r) => [r[0], r]));
function colOf(id: string): number {
  if (colMemo[id] !== undefined) return colMemo[id];
  const r = rawById[id];
  const c = r[4].length ? Math.max(...r[4].map(colOf)) + 1 : 0;
  colMemo[id] = c;
  return c;
}

export const TECHS: TechDef[] = RAW.map((r) => {
  const unlock = Object.values(BUILDINGS)
    .filter((b) => b.req === r[0] || b.reqAlt?.req === r[0])
    .map((b) => (b.reqAlt?.req === r[0] ? `${b.name} (для заводчан)` : b.name));
  const parts = [...fxText(r[6])];
  if (unlock.length) parts.push(`Открывает: ${unlock.join(', ')}`);
  if (r[8]) parts.push(r[8]);
  return {
    id: r[0],
    name: r[1],
    branch: r[2],
    cost: r[3],
    req: r[4],
    icon: r[5],
    fx: r[6],
    desc: r[7],
    extra: r[8],
    effect: parts.join(' · ') || 'Основа для новых открытий',
    col: colOf(r[0]),
    life: LIFE[r[0]],
  };
});

// уникальные улучшения специализаций
for (const spec of Object.keys(SPEC_TECHS) as SpecId[]) {
  for (const r of SPEC_TECHS[spec]) {
    const col = Math.max(0, ...r[4].map((q) => TECHS.find((t) => t.id === q)?.col ?? 0)) + 1;
    TECHS.push({ id: r[0], name: r[1], branch: r[2], cost: r[3], req: r[4], icon: r[5], fx: r[6], desc: r[7], effect: [...fxText(r[6]), 'Особое улучшение специализации'].join(' · '), col, spec, life: undefined });
  }
}

export const TECH_BY_ID: Record<string, TechDef> = Object.fromEntries(TECHS.map((t) => [t.id, t]));
export const techsFor = (spec: SpecId) => TECHS.filter((t) => !t.spec || t.spec === spec);

export function techCost(t: TechDef, spec: SpecId): number {
  return Math.max(5, Math.round(t.cost * (SPECS[spec].discount[t.branch] ?? 1)));
}

export function computeMods(done: Set<string>, spec: SpecId, gov: GovId | null, tier: number): Mods {
  const m = baseMods();
  applyFx(m, SPECS[spec].mods);
  for (const t of TECHS) if (done.has(t.id)) applyFx(m, t.fx);
  if (gov) applyFx(m, GOVS[gov].mods);
  m.know *= 1 + 0.03 * tier;
  return m;
}
