import { BUILDINGS, type BuildingDef, type BuildingId } from './data';
import type { SpecId } from './meta';

export type Roof = 'gable' | 'hip' | 'flat' | 'dome' | 'spire' | 'thatch' | 'tent' | 'none';
export type WallKind = 'plank' | 'stone' | 'brick' | 'plaster' | 'log' | 'metal';

export interface ArchStyle {
  wallH: number;
  roofH: number;
  roof: Roof;
  wall: WallKind;
  windows: number;
  decor: string[];
  kind?: 'house' | 'field' | 'statue' | 'well' | 'mill' | 'mine' | 'wall' | 'yard';
}

export interface Arch {
  name: string;
  desc: string;
  cat: 'home' | 'eco' | 'ind' | 'cult' | 'war';
  w: number;
  h: number;
  wood: number;
  stone: number;
  goods: number;
  time: number;
  fx: Partial<BuildingDef>;
  style: ArchStyle;
}

const S = (wallH: number, roofH: number, roof: Roof, wall: WallKind, windows: number, decor: string[], kind?: ArchStyle['kind']): ArchStyle => ({ wallH, roofH, roof, wall, windows, decor, kind });

export const ARCH: Record<string, Arch> = {
  hut: { name: 'Хижина', desc: 'Простое жильё.', cat: 'home', w: 1, h: 1, wood: 10, stone: 0, goods: 0, time: 7, fx: { housing: 4 }, style: S(9, 8, 'thatch', 'log', 0, ['door']) },
  home: { name: 'Дом', desc: 'Добротный дом семьи.', cat: 'home', w: 2, h: 2, wood: 24, stone: 4, goods: 0, time: 14, fx: { housing: 8 }, style: S(14, 11, 'gable', 'plank', 2, ['door', 'chimney', 'smoke']) },
  hall: { name: 'Усадьба', desc: 'Большой дом знати: жильё и порядок.', cat: 'home', w: 3, h: 2, wood: 50, stone: 30, goods: 4, time: 26, fx: { housing: 14, happy: 1, loyalty: 1, upkeep: 0.03 }, style: S(18, 13, 'hip', 'plaster', 4, ['door', 'chimney', 'smoke', 'balcony', 'banner']) },
  granary: { name: 'Амбар', desc: 'Увеличивает лимит складов.', cat: 'eco', w: 2, h: 2, wood: 30, stone: 0, goods: 0, time: 14, fx: { cap: 120 }, style: S(13, 11, 'gable', 'plank', 0, ['bigdoor', 'sacks']) },
  ware: { name: 'Склад', desc: 'Пункт сдачи и большие запасы.', cat: 'eco', w: 3, h: 2, wood: 45, stone: 10, goods: 0, time: 20, fx: { cap: 260, dropoff: true }, style: S(16, 10, 'gable', 'plank', 0, ['bigdoor', 'barrels', 'crates']) },
  field: { name: 'Поля', desc: 'Растят еду.', cat: 'eco', w: 3, h: 2, wood: 14, stone: 0, goods: 0, time: 12, fx: { food: 0.5 }, style: S(0, 0, 'none', 'plank', 0, ['crops', 'scarecrow'], 'field') },
  garden: { name: 'Сад', desc: 'Плоды и покой — жители счастливее.', cat: 'eco', w: 2, h: 2, wood: 20, stone: 0, goods: 0, time: 12, fx: { food: 0.3, happy: 2 }, style: S(0, 0, 'none', 'plank', 0, ['trees', 'flowers'], 'field') },
  pasture: { name: 'Пастбище', desc: 'Скот даёт мясо и молоко.', cat: 'eco', w: 3, h: 2, wood: 22, stone: 0, goods: 0, time: 14, fx: { food: 0.42 }, style: S(0, 0, 'none', 'plank', 0, ['fence', 'animals'], 'field') },
  lodge: { name: 'Промысловая изба', desc: 'Охота, рыбалка и сбор — еда в казну.', cat: 'eco', w: 2, h: 2, wood: 26, stone: 4, goods: 0, time: 14, fx: { food: 0.36 }, style: S(14, 10, 'gable', 'log', 1, ['door', 'antlers', 'smoke']) },
  shop: { name: 'Мастерская', desc: 'Свободные жители делают из сырья товары.', cat: 'ind', w: 2, h: 2, wood: 32, stone: 10, goods: 0, time: 15, fx: { jobs: 3, prod: { in: { wood: 0.1 }, out: 0.07 }, upkeep: 0.02 }, style: S(14, 11, 'gable', 'plank', 1, ['door', 'chimney', 'smoke', 'sign']) },
  forge: { name: 'Кузница', desc: 'Куют оружие: сила армии растёт.', cat: 'ind', w: 2, h: 2, wood: 22, stone: 34, goods: 5, time: 20, fx: { atk: 0.05, gold: 0.1, upkeep: 0.04, light: true }, style: S(15, 10, 'gable', 'stone', 1, ['chimney', 'smoke', 'anvil', 'fire']) },
  smelter: { name: 'Плавильня', desc: 'Плавит камень и дерево в товары.', cat: 'ind', w: 2, h: 2, wood: 40, stone: 45, goods: 4, time: 22, fx: { jobs: 3, prod: { in: { stone: 0.13, wood: 0.04 }, out: 0.13 }, upkeep: 0.05, light: true }, style: S(18, 8, 'flat', 'stone', 0, ['stack', 'smoke', 'fire']) },
  saw: { name: 'Лесопилка', desc: 'Распиливает брёвна: даёт дерево.', cat: 'ind', w: 2, h: 2, wood: 36, stone: 6, goods: 0, time: 16, fx: { yield: { wood: 0.28 }, upkeep: 0.02 }, style: S(12, 9, 'gable', 'plank', 0, ['open', 'logs', 'wheel']) },
  mine: { name: 'Шахта', desc: 'Добывает камень без людей-работников.', cat: 'ind', w: 2, h: 2, wood: 36, stone: 6, goods: 0, time: 18, fx: { yield: { stone: 0.28 }, upkeep: 0.025 }, style: S(0, 0, 'none', 'stone', 0, ['cart', 'timbers'], 'mine') },
  market: { name: 'Рынок', desc: 'Торговля приносит золото.', cat: 'ind', w: 2, h: 2, wood: 34, stone: 5, goods: 0, time: 14, fx: { gold: 0.4, upkeep: 0.02 }, style: S(0, 0, 'none', 'plank', 0, ['stalls', 'awning', 'crates'], 'yard') },
  bank: { name: 'Казначейство', desc: 'Золото и надёжное хранение.', cat: 'ind', w: 2, h: 2, wood: 20, stone: 60, goods: 8, time: 28, fx: { gold: 0.65, cap: 100, upkeep: 0.04 }, style: S(18, 10, 'hip', 'stone', 3, ['columns', 'door', 'banner']) },
  lib: { name: 'Библиотека', desc: 'Хранилище знаний.', cat: 'cult', w: 2, h: 2, wood: 40, stone: 40, goods: 8, time: 22, fx: { know: 2, light: true, upkeep: 0.04 }, style: S(17, 11, 'gable', 'stone', 3, ['door', 'columns', 'lantern']) },
  school: { name: 'Школа', desc: 'Учит детей: знания и лояльность.', cat: 'cult', w: 2, h: 2, wood: 36, stone: 20, goods: 4, time: 20, fx: { know: 1.4, loyalty: 1, upkeep: 0.03 }, style: S(15, 11, 'gable', 'plaster', 3, ['door', 'bell', 'flag']) },
  obs: { name: 'Обсерватория', desc: 'Изучение звёзд даёт много знаний.', cat: 'cult', w: 2, h: 2, wood: 30, stone: 60, goods: 12, time: 30, fx: { know: 2.6, light: true, upkeep: 0.05 }, style: S(18, 12, 'dome', 'stone', 1, ['door', 'telescope']) },
  temple: { name: 'Храм', desc: 'Обряды объединяют людей: лояльность и счастье.', cat: 'cult', w: 3, h: 2, wood: 30, stone: 56, goods: 6, time: 28, fx: { know: 1, loyalty: 4, happy: 3, light: true, upkeep: 0.04 }, style: S(17, 14, 'spire', 'stone', 2, ['door', 'columns', 'lantern', 'banner']) },
  tavern: { name: 'Трактир', desc: 'Место отдыха — больше счастья и немного налогов.', cat: 'cult', w: 2, h: 2, wood: 34, stone: 4, goods: 0, time: 16, fx: { happy: 6, gold: 0.15, light: true, upkeep: 0.02 }, style: S(15, 11, 'gable', 'plank', 3, ['door', 'sign', 'chimney', 'smoke', 'barrels', 'lantern']) },
  bath: { name: 'Баня', desc: 'Здоровье и настроение жителей.', cat: 'cult', w: 2, h: 2, wood: 32, stone: 10, goods: 0, time: 15, fx: { happy: 4, loyalty: 1, upkeep: 0.02 }, style: S(12, 10, 'hip', 'log', 1, ['door', 'chimney', 'smoke']) },
  statue: { name: 'Монумент', desc: 'Величие власти: лояльность и гордость.', cat: 'cult', w: 1, h: 2, wood: 0, stone: 44, goods: 4, time: 16, fx: { loyalty: 6, happy: 2, light: true }, style: S(0, 0, 'none', 'stone', 0, ['pedestal', 'figure'], 'statue') },
  well: { name: 'Колодец', desc: 'Чистая вода радует людей.', cat: 'home', w: 1, h: 1, wood: 8, stone: 10, goods: 0, time: 8, fx: { happy: 2, housing: 2 }, style: S(0, 0, 'none', 'stone', 0, ['bucket'], 'well') },
  barracks: { name: 'Казарма', desc: 'Обучает воинов: +лимит армии.', cat: 'war', w: 3, h: 2, wood: 40, stone: 30, goods: 8, time: 24, fx: { army: 8, upkeep: 0.05 }, style: S(15, 10, 'gable', 'stone', 2, ['door', 'banner', 'weapons', 'shield']) },
  stable: { name: 'Конюшня', desc: 'Конные отряды: армия сильнее.', cat: 'war', w: 3, h: 2, wood: 44, stone: 8, goods: 4, time: 20, fx: { army: 4, atk: 0.03, upkeep: 0.03 }, style: S(13, 10, 'gable', 'plank', 0, ['bigdoor', 'hay', 'flag']) },
  tower: { name: 'Дозорная башня', desc: 'Усиливает оборону.', cat: 'war', w: 2, h: 2, wood: 25, stone: 36, goods: 5, time: 20, fx: { def: 0.1, upkeep: 0.03 }, style: S(30, 9, 'spire', 'stone', 1, ['flag', 'crenel', 'door']) },
  gate: { name: 'Укреплённые ворота', desc: 'Ворота и стены: оборона и порядок.', cat: 'war', w: 3, h: 1, wood: 20, stone: 50, goods: 3, time: 22, fx: { def: 0.12, loyalty: 2, upkeep: 0.03 }, style: S(20, 6, 'flat', 'stone', 0, ['arch', 'crenel', 'banner'], 'wall') },
  keep: { name: 'Крепость', desc: 'Мощный оплот: оборона и гарнизон.', cat: 'war', w: 3, h: 3, wood: 60, stone: 100, goods: 14, time: 42, fx: { def: 0.26, army: 6, upkeep: 0.07, light: true }, style: S(30, 10, 'flat', 'stone', 2, ['crenel', 'tower', 'door', 'banner', 'flag']) },
  arsenal: { name: 'Арсенал', desc: 'Оружейные склады: армия сильнее.', cat: 'war', w: 2, h: 2, wood: 36, stone: 40, goods: 10, time: 24, fx: { atk: 0.08, army: 3, upkeep: 0.04 }, style: S(15, 9, 'gable', 'metal', 1, ['bigdoor', 'weapons', 'shield']) },
  jail: { name: 'Острог', desc: 'Тюрьма держит порядок, но портит настроение.', cat: 'war', w: 2, h: 2, wood: 30, stone: 36, goods: 4, time: 18, fx: { loyalty: 6, happy: -2, upkeep: 0.03 }, style: S(14, 6, 'flat', 'stone', 1, ['bars', 'door', 'crenel']) },
  court: { name: 'Ратуша', desc: 'Закон и сбор налогов.', cat: 'cult', w: 3, h: 2, wood: 40, stone: 50, goods: 8, time: 28, fx: { loyalty: 8, gold: 0.12, upkeep: 0.05, light: true }, style: S(20, 13, 'hip', 'plaster', 4, ['door', 'columns', 'bell', 'banner']) },
  inn: { name: 'Караван-сарай', desc: 'Гости и купцы приносят золото.', cat: 'ind', w: 3, h: 2, wood: 44, stone: 12, goods: 4, time: 20, fx: { gold: 0.32, happy: 2, light: true, upkeep: 0.03 }, style: S(14, 9, 'tent', 'plaster', 2, ['door', 'awning', 'lantern', 'crates']) },
  factory: { name: 'Фабрика', desc: 'Конвейер выпускает много товаров.', cat: 'ind', w: 3, h: 3, wood: 90, stone: 80, goods: 20, time: 36, fx: { jobs: 6, prod: { in: { wood: 0.22, stone: 0.2 }, out: 0.55 }, upkeep: 0.1, light: true }, style: S(22, 8, 'flat', 'brick', 3, ['stack', 'stack2', 'smoke', 'pipes']) },
  mill: { name: 'Мельница', desc: 'Мука и хлеб: больше еды.', cat: 'eco', w: 2, h: 2, wood: 40, stone: 10, goods: 0, time: 18, fx: { food: 0.5, upkeep: 0.01 }, style: S(24, 6, 'spire', 'plank', 0, ['blades', 'door'], 'mill') },
  dock: { name: 'Пристань', desc: 'Торговля и рыба с моря.', cat: 'eco', w: 3, h: 2, wood: 50, stone: 8, goods: 0, time: 22, fx: { gold: 0.3, food: 0.22, upkeep: 0.02 }, style: S(8, 6, 'gable', 'plank', 0, ['planks', 'crates', 'barrels', 'flag']) },
};

type Row = string;
const L = (...r: Row[]) => r;

/** 30 построек для каждой специализации в порядке развития: «тип|Название» */
export const SPEC_ROWS: Record<SpecId, Row[]> = {
  smith: L('hut|Кузнецкая изба', 'well|Колодец кузни', 'shop|Слесарная мастерская', 'forge|Горн мастера', 'home|Дом кузнеца', 'ware|Рудный склад', 'smelter|Плавильная печь', 'market|Лавка железа', 'tavern|Харчевня у горна', 'forge|Оружейная кузница', 'arsenal|Оружейная палата', 'tower|Дозорная вышка', 'lib|Свитки мастеров', 'home|Двор цеховых мастеров', 'smelter|Доменная печь', 'barracks|Казарма латников', 'gate|Железные ворота', 'bank|Казна цеха', 'school|Школа ковки', 'forge|Кузница булата', 'hall|Дом старшего мастера', 'temple|Храм огня', 'statue|Памятник кузнецу', 'keep|Крепость-кузня', 'factory|Прокатный цех', 'court|Суд мастеров', 'stable|Конюшня тяжеловозов', 'obs|Лаборатория сплавов', 'factory|Паровой молот', 'keep|Цитадель стали'),
  miner: L('hut|Землянка горняка', 'well|Шахтный колодец', 'mine|Кремнёвая копь', 'home|Барак горняков', 'ware|Рудный склад', 'mine|Каменоломня', 'smelter|Обжиговая печь', 'tavern|Забой-таверна', 'market|Рудный торг', 'tower|Штольная вышка', 'mine|Глубокая шахта', 'barracks|Казарма стражи недр', 'bath|Горная баня', 'lib|Архив жил', 'mine|Рудник серебра', 'gate|Горные ворота', 'hall|Дом рудовладельца', 'bank|Казна рудника', 'smelter|Литейный двор', 'temple|Храм Подземного Отца', 'school|Школа рудознатцев', 'mine|Угольный разрез', 'arsenal|Взрывной погреб', 'statue|Памятник проходчику', 'keep|Горная цитадель', 'court|Горный суд', 'factory|Дробильная фабрика', 'mine|Алмазная шахта', 'obs|Геологическая башня', 'factory|Паровая подъёмная'),
  lumber: L('hut|Лесная хижина', 'well|Родник в чаще', 'lodge|Избушка охотника', 'saw|Пильная яма', 'home|Сруб лесоруба', 'ware|Лесной склад', 'saw|Лесопилка', 'garden|Ягодная делянка', 'tavern|Лесной трактир', 'tower|Дозорная сосна', 'bath|Банька на опушке', 'shop|Столярная', 'stable|Тягловая конюшня', 'hall|Терем лесничего', 'temple|Священная роща', 'barracks|Казарма егерей', 'market|Торг пушниной', 'saw|Водяная лесопилка', 'lib|Береста-архив', 'gate|Частокольные ворота', 'school|Школа лесничих', 'bank|Казна лесных старост', 'pasture|Лосиная ферма', 'dock|Сплавная пристань', 'statue|Идол Лешего', 'keep|Лесной острог', 'court|Вече леса', 'factory|Фанерная фабрика', 'saw|Паровая лесопилка', 'obs|Дозорная вершина'),
  warrior: L('hut|Палатка воина', 'well|Поилка', 'barracks|Учебный лагерь', 'home|Длинный дом дружины', 'tower|Сторожевой столб', 'forge|Оружейный горн', 'stable|Конюшня', 'tavern|Пиршественный зал', 'ware|Воинский склад', 'barracks|Казарма копейщиков', 'gate|Частокол и ворота', 'arsenal|Арсенал', 'jail|Острог пленных', 'hall|Дом воеводы', 'temple|Храм Войны', 'keep|Каменный замок', 'barracks|Казарма рыцарей', 'market|Рынок трофеев', 'stable|Рыцарские конюшни', 'statue|Курган славы', 'lib|Зал хроник', 'gate|Крепостная стена', 'school|Военная школа', 'court|Суд воевод', 'bank|Казна дружины', 'arsenal|Пороховой склад', 'keep|Цитадель', 'obs|Командная башня', 'factory|Оружейная фабрика', 'barracks|Академия генералов'),
  trader: L('hut|Лавка-палатка', 'well|Колодец у рынка', 'market|Торговые ряды', 'shop|Ремесленная лавка', 'home|Дом купца', 'ware|Торговый склад', 'inn|Постоялый двор', 'tavern|Купеческий трактир', 'dock|Малая пристань', 'bank|Меняльная контора', 'market|Большой рынок', 'hall|Дом торгового старосты', 'tower|Маяк-башня', 'dock|Торговая гавань', 'lib|Архив договоров', 'gate|Таможенные ворота', 'bank|Банк', 'inn|Караван-сарай', 'temple|Храм Удачи', 'school|Школа счёта', 'court|Торговая палата', 'statue|Статуя Меркурия', 'barracks|Казарма охраны', 'ware|Портовые склады', 'garden|Сад богача', 'market|Биржа товаров', 'obs|Навигационная башня', 'keep|Купеческая крепость', 'factory|Мануфактура', 'bank|Фондовая биржа'),
  farmer: L('hut|Землянка пахаря', 'well|Деревенский колодец', 'field|Огороды', 'granary|Амбар', 'home|Крестьянская изба', 'pasture|Выгон', 'garden|Яблоневый сад', 'mill|Ветряная мельница', 'ware|Зерновой склад', 'lodge|Рыбацкая изба', 'tavern|Деревенская корчма', 'bath|Деревенская баня', 'field|Большие поля', 'hall|Дом старосты', 'temple|Часовня урожая', 'school|Приходская школа', 'pasture|Молочная ферма', 'market|Ярмарка', 'granary|Зернохранилище', 'tower|Сторожевая вышка', 'mill|Водяная мельница', 'barracks|Казарма ополчения', 'statue|Каменная баба', 'court|Земская изба', 'lib|Книжная изба', 'bank|Хлебный банк', 'gate|Ворота села', 'field|Агрофермы', 'factory|Консервный завод', 'keep|Усадьба-крепость'),
  sage: L('hut|Келья мудреца', 'well|Колодец мудрости', 'lib|Свитковая', 'school|Школа философов', 'home|Дом учёного', 'garden|Сад размышлений', 'temple|Храм знаний', 'bath|Термы', 'obs|Обсерватория', 'lib|Большая библиотека', 'tavern|Кофейня учёных', 'market|Книжный рынок', 'hall|Дом академика', 'statue|Статуя мыслителя', 'court|Совет мудрецов', 'school|Академия', 'tower|Башня наблюдений', 'bank|Фонд наук', 'ware|Архив-хранилище', 'obs|Звёздная башня', 'shop|Лаборатория', 'barracks|Стража мудрецов', 'gate|Врата знаний', 'temple|Пантеон', 'lib|Энциклопедический зал', 'school|Университет', 'keep|Крепость разума', 'factory|Типография', 'obs|Институт открытий', 'court|Парламент учёных'),
  factory: L('hut|Рабочая хибара', 'well|Заводской колодец', 'shop|Мастерская', 'home|Барак рабочих', 'ware|Заводской склад', 'smelter|Литейная', 'shop|Станочный цех', 'tavern|Рабочая столовая', 'market|Заводской рынок', 'forge|Кузнечный цех', 'factory|Малая фабрика', 'tower|Заводская вышка', 'bath|Баня рабочих', 'hall|Дом директора', 'bank|Заводская касса', 'factory|Механический завод', 'school|Фабзавуч', 'barracks|Казарма охраны', 'court|Заводской суд', 'lib|Технический архив', 'factory|Текстильная фабрика', 'statue|Монумент труду', 'dock|Грузовая пристань', 'smelter|Мартеновская печь', 'obs|Лаборатория', 'gate|Проходная', 'factory|Паровой гигант', 'keep|Заводская цитадель', 'temple|Дворец культуры', 'factory|Конвейерная линия'),
};

export const LADDER = ['shelter', 'fire', 'stone_tools', 'carpentry', 'storage', 'agri', 'hunting', 'barter', 'stonework', 'rituals', 'bronze', 'town', 'smithing', 'currency', 'library_tech', 'fortification', 'laws', 'masonry', 'iron', 'guilds', 'cathedral', 'banking', 'university', 'roads', 'steel', 'printing', 'gears', 'steam', 'industry', 'concrete'];

const BIAS: Record<SpecId, Partial<Record<string, number>>> = {
  smith: { atk: 1.3, gold: 1.2, out: 1.2 },
  miner: { stone: 1.35, def: 1.1 },
  lumber: { wood: 1.35, housing: 1.1 },
  warrior: { army: 1.35, def: 1.2, atk: 1.2 },
  trader: { gold: 1.4, cap: 1.2 },
  farmer: { food: 1.35, housing: 1.15 },
  sage: { know: 1.35, loyalty: 1.2 },
  factory: { out: 1.3, goods: 1.3 },
};

export const SPEC_BUILD_IDS = {} as Record<SpecId, string[]>;
export const SPEC_STYLE: Record<string, { spec: SpecId; arch: string; tier: number; idx: number }> = {};

const r2 = (v: number) => Math.round(v * 1000) / 1000;

for (const spec of Object.keys(SPEC_ROWS) as SpecId[]) {
  const bias = BIAS[spec];
  SPEC_BUILD_IDS[spec] = [];
  SPEC_ROWS[spec].forEach((row, i) => {
    const [ak, name] = row.split('|');
    const a = ARCH[ak];
    const id = `${spec}_${i + 1}`;
    const f = 1 + i * 0.045;
    const cm = 1 + i * 0.1;
    const bk = (k: string) => bias[k] ?? 1;
    const fx: Partial<BuildingDef> = {};
    const src = a.fx;
    if (src.housing) fx.housing = Math.round(src.housing * f * bk('housing'));
    if (src.food) fx.food = r2(src.food * f * bk('food'));
    if (src.know) fx.know = r2(src.know * f * bk('know'));
    if (src.gold) fx.gold = r2(src.gold * f * bk('gold'));
    if (src.army) fx.army = Math.round(src.army * f * bk('army'));
    if (src.def) fx.def = r2(src.def * (1 + i * 0.02) * bk('def'));
    if (src.atk) fx.atk = r2(src.atk * (1 + i * 0.02) * bk('atk'));
    if (src.cap) fx.cap = Math.round(src.cap * f * bk('cap'));
    if (src.loyalty) fx.loyalty = r2(src.loyalty * bk('loyalty') * (1 + i * 0.02));
    if (src.happy) fx.happy = src.happy;
    if (src.upkeep) fx.upkeep = r2(src.upkeep * (1 + i * 0.05));
    if (src.light) fx.light = true;
    if (src.dropoff) fx.dropoff = true;
    if (src.jobs) fx.jobs = src.jobs;
    if (src.prod) fx.prod = { in: src.prod.in, out: r2(src.prod.out * f * bk('out')) };
    if (src.yield) {
      const y: Partial<Record<'wood' | 'stone' | 'food' | 'goods', number>> = {};
      for (const k of Object.keys(src.yield) as ('wood' | 'stone' | 'food' | 'goods')[]) y[k] = r2((src.yield[k] ?? 0) * f * bk(k));
      fx.yield = y;
    }
    const cost: BuildingDef['cost'] = {};
    if (a.wood) cost.wood = Math.round(a.wood * cm);
    if (a.stone) cost.stone = Math.round(a.stone * cm);
    if (a.goods) cost.goods = Math.round(a.goods * (1 + i * 0.08));
    const def: BuildingDef = {
      id,
      name,
      desc: `${a.desc} (${a.name.toLowerCase()}, ступень ${Math.min(6, 1 + Math.floor(i / 5))})`,
      cat: 'spec',
      w: a.w,
      h: a.h,
      cost,
      time: Math.round(a.time * (1 + i * 0.04)),
      housing: 0,
      req: LADDER[i],
      ...fx,
      spec,
      arch: ak,
      tier: i,
    };
    BUILDINGS[id] = def;
    SPEC_BUILD_IDS[spec].push(id);
    SPEC_STYLE[id] = { spec, arch: ak, tier: i, idx: i };
  });
}

export function isSpecBuilding(id: BuildingId): boolean {
  return id in SPEC_STYLE;
}

// усадьба помещика (рисуется в цвете выбранной специализации)
BUILDINGS.manor = {
  id: 'manor',
  name: 'Усадьба помещика',
  desc: 'Дом землевладельца. Вокруг — угодья, на которых трудятся зависимые люди.',
  cat: 'home',
  w: 3,
  h: 3,
  cost: {},
  time: 1,
  housing: 4,
  req: null,
  light: true,
  upkeep: 0.03,
  arch: 'hall',
  tier: 18,
};
SPEC_STYLE.manor = { spec: 'farmer', arch: 'hall', tier: 18, idx: 18 };
