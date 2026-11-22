
import { BUILDINGS, RES_INFO, STORED, type AllRes, type ResKey } from '../game/data';
import type { Game, Snapshot } from '../game/game';
import { icons } from './icons';

const ROWS: AllRes[] = ['wood', 'stone', 'food', 'goods', 'gold', 'know'];

const SOURCES: Record<AllRes, { src: string; use: string }> = {
  wood: { src: 'Рубка деревьев, лесные провинции', use: 'Здания, цеха (сырьё), воины' },
  stone: { src: 'Добыча камня, горняки и кузнецы', use: 'Здания, литейная и завод (сырьё)' },
  food: { src: 'Ягоды, поля, охота, фермерские провинции', use: 'Питание жителей (дети едят меньше, воины больше)' },
  goods: { src: 'Мастерская, литейная, завод (работают свободные жители)', use: 'Инструменты (+20% к скорости), здания, воины, продажа' },
  gold: { src: 'Налоги, рынок, торговцы, продажа товаров', use: 'Содержание зданий и армии, дипломатия, воины' },
  know: { src: 'Жители, костры, святилища, библиотеки', use: 'Изучение технологий' },
};

function fmt(v: number, d = 2) {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;
}

export function EconomyPanel({ game, snap, onClose }: { game: Game; snap: Snapshot; onClose: () => void }) {
  const ic = icons();
  const act = (r: string | null) => {
    if (r) game.msg(r, 'warn');
    game.emit(true);
  };
  const prodBuildings = Object.values(BUILDINGS).filter((b) => b.prod);
  const countOf = (id: string) => game.buildings.filter((b) => b.type === id && b.done).length;
  const taxes = [
    { id: 0, name: 'Без налогов', icon: '🕊️', gold: '×0', note: 'Рождаемость +15%, лояльность провинций +6' },
    { id: 1, name: 'Обычные', icon: '⚖️', gold: '×1', note: 'Золото 0.02 с взрослого, без последствий' },
    { id: 2, name: 'Высокие', icon: '💰', gold: '×2.1', note: 'Рождаемость −30%, лояльность провинций −10' },
  ];

  const tips: string[] = [];
  const net = (k: string) => (snap.flow[k]?.in ?? 0) - (snap.flow[k]?.out ?? 0);
  if (snap.foodRate < 0) tips.push('🍖 Еда расходуется быстрее, чем производится без сбора: стройте поля и дома охотника, отправьте людей собирать ягоды.');
  if (snap.unpaid) tips.push('🪙 Казна пуста: продайте товары на рынке, поднимите налоги или снесите дорогие в содержании здания.');
  if (snap.res.goods < 1 && snap.jobs.total === 0) tips.push('📦 Постройте «Мастерскую» (технология «Плотницкое дело») — товары ускоряют работу и нужны для зданий и армии.');
  if (snap.jobs.total > 0 && snap.jobs.labor < 1) tips.push(`🏭 Цехам не хватает работников: заняты ${snap.jobs.staffed} из ${snap.jobs.total}. Освободите людей (кнопка «Стоп») — свободные жители встают к станкам.`);
  if (STORED.some((k) => snap.res[k] >= snap.cap * 0.9)) tips.push('📥 Склады почти полны: стройте «Склад» (+250 к лимиту) или продайте излишки.');
  if (!snap.trade.markets) tips.push('🏪 Постройте «Рынок» (технология «Мена») — тогда откроются торговля и налоговая выручка.');
  if (!tips.length) tips.push('✅ Экономика в порядке. Растите население, стройте цеха и копите товары для армии и зданий.');

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div className="px-panel flex max-h-[96vh] w-full max-w-[1200px] flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-pixel text-[14px] text-[#ffe9a8]">ЭКОНОМИКА</h2>
            <div className="mt-2 text-[14px] text-[#e8d4a8]">Всё связано: сырьё → товары → скорость работы, здания, армия и золото. Налоги влияют на рождаемость и лояльность.</div>
          </div>
          <button onClick={onClose} className="px-btn px-btn-red font-pixel px-4 py-3 text-[10px]">
            ЗАКРЫТЬ ✕
          </button>
        </div>

        <div className="scroll-px grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-3">
            {/* баланс */}
            <div className="px-panel-dark flex flex-col gap-1 p-3">
              <div className="mb-1 text-[12px] font-bold tracking-widest text-[#ffcf6a]">БАЛАНС РЕСУРСОВ (в секунду)</div>
              <div className="grid grid-cols-[1.4fr_1.3fr_.8fr_.8fr_.9fr] gap-x-2 text-[11px] tracking-wider text-[#a08868] uppercase">
                <span>Ресурс</span>
                <span>Запас</span>
                <span className="text-right">Доход</span>
                <span className="text-right">Расход</span>
                <span className="text-right">Итог</span>
              </div>
              {ROWS.map((k) => {
                const cap = k === 'gold' || k === 'know' ? undefined : snap.cap;
                const stock = k === 'know' ? snap.know : snap.res[k];
                const inn = snap.flow[k]?.in ?? 0;
                const out = snap.flow[k]?.out ?? 0;
                const n = inn - out;
                return (
                  <div key={k} className="grid grid-cols-[1.4fr_1.3fr_.8fr_.8fr_.9fr] items-center gap-x-2 border-t border-[#5a3e26]/60 py-1.5 text-[14px]" title={`Откуда: ${SOURCES[k].src}\nНа что: ${SOURCES[k].use}`}>
                    <span className="flex items-center gap-2 text-[#f3e3c0]">
                      <img src={ic[k === 'know' ? 'know' : k]} className="pix h-5 w-5" />
                      {RES_INFO[k].name}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-bold text-[#fff3d0]">
                        {stock}
                        {cap !== undefined && <span className="text-[11px] font-normal text-[#a08868]"> / {cap}</span>}
                      </span>
                      {cap !== undefined && (
                        <span className="px-bar h-1.5">
                          <i style={{ width: `${Math.min(100, (stock / cap) * 100)}%`, background: stock >= cap ? '#e0603a' : undefined }} />
                        </span>
                      )}
                    </span>
                    <span className="text-right text-[#8aff9a]">{inn > 0.004 ? fmt(inn) : '—'}</span>
                    <span className="text-right text-[#ff9a8a]">{out > 0.004 ? fmt(-out) : '—'}</span>
                    <span className="text-right font-bold" style={{ color: n > 0.005 ? '#8aff9a' : n < -0.005 ? '#ff7a6a' : '#a08868' }}>
                      {Math.abs(n) < 0.005 ? '±0' : fmt(n)}
                    </span>
                  </div>
                );
              })}
              <div className="mt-1 text-[12px] text-[#a08868]">Наведите на строку — откуда берётся ресурс и на что тратится. Доход считается скользящим средним, включая сбор рабочими.</div>
            </div>

            {/* цепочка */}
            <div className="px-panel-dark flex flex-col gap-2 p-3">
              <div className="text-[12px] font-bold tracking-widest text-[#ffcf6a]">ПРОИЗВОДСТВЕННАЯ ЦЕПЬ</div>
              <div className="flex flex-wrap items-center gap-2 text-[14px] text-[#f3e3c0]">
                <span className="px-inset px-2 py-1">🪵 + 🪨 рабочие</span>
                <span className="text-[#ffcf6a]">→</span>
                <span className="px-inset px-2 py-1">🏭 цеха · {snap.jobs.staffed}/{snap.jobs.total} чел.</span>
                <span className="text-[#ffcf6a]">→</span>
                <span className="px-inset px-2 py-1">📦 товары {snap.res.goods}</span>
                <span className="text-[#ffcf6a]">→</span>
                <span className="px-inset px-2 py-1">🔧 +20% работа · 🏗 здания · ⚔ воины · 🪙 рынок</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {prodBuildings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#e8d4a8]">
                    <span>
                      <b className="text-[#ffe9a8]">{b.name}</b> × {countOf(b.id)} · {Object.entries(b.prod!.in).map(([k, v]) => `${RES_INFO[k as ResKey].icon}${v}`).join(' ')} → 📦{b.prod!.out} (в сек) · {b.jobs} раб.
                    </span>
                    <span className={game.isUnlocked(b.id) ? 'text-[#8aff9a]' : 'text-[#ffa08a]'}>{game.isUnlocked(b.id) ? 'открыто' : `🔒 ${game.unlockName(b.id)}`}</span>
                  </div>
                ))}
              </div>
              <div className="text-[13px] text-[#c8b088]">
                {snap.toolsOn ? '🔧 Инструменты в наличии: рабочие и строители быстрее на 20%, тратят по 0.003 товара/с на человека.' : '🔧 Товаров нет — рабочие без инструментов. Постройте мастерскую!'}{' '}
                {snap.specId === 'factory' ? 'Заводчане: выпуск товаров +50%.' : ''}
              </div>
            </div>

            {/* советы */}
            <div className="px-panel-dark flex flex-col gap-1.5 p-3">
              <div className="text-[12px] font-bold tracking-widest text-[#ffcf6a]">СОВЕТЫ</div>
              {tips.map((t) => (
                <div key={t} className="text-[14px] leading-snug text-[#f3e3c0]">
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* налоги */}
            <div className="px-panel-dark flex flex-col gap-2 p-3">
              <div className="text-[12px] font-bold tracking-widest text-[#ffcf6a]">НАЛОГИ</div>
              <div className="grid grid-cols-3 gap-2">
                {taxes.map((t) => (
                  <button key={t.id} onClick={() => ((game.tax = t.id), game.emit(true))} className={`px-card flex flex-col gap-1 p-2 ${snap.tax === t.id ? 'sel' : ''}`}>
                    <span className="text-[20px]">{t.icon}</span>
                    <span className="text-[14px] font-bold text-[#ffe9a8]">{t.name}</span>
                    <span className="text-[13px] text-[#ffe27a]">{t.gold}</span>
                  </button>
                ))}
              </div>
              <div className="text-[13px] text-[#c8b088]">{taxes[snap.tax].note}</div>
              <div className="grid grid-cols-2 gap-2 text-[14px]">
                <div className="px-inset px-2 py-1.5">
                  Доход: <b className="text-[#8aff9a]">{fmt(snap.flow.gold?.in ?? 0)}</b>/с
                </div>
                <div className="px-inset px-2 py-1.5">
                  Содержание: <b className="text-[#ff9a8a]">−{snap.upkeep.toFixed(2)}</b>/с
                </div>
              </div>
              <div className="text-[12px] text-[#a08868]">Содержание = здания (казармы, башни, цеха, залы…) + 0.015 за каждого воина. При пустой казне цеха работают на 60%, а воины дезертируют.</div>
            </div>

            {/* рынок */}
            <div className="px-panel-dark flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-widest text-[#ffcf6a]">РЫНОК</span>
                <span className="text-[12px] text-[#c8b088]">
                  Рынков: {snap.trade.markets} · комиссия {Math.round(snap.trade.fee * 100)}%
                </span>
              </div>
              {snap.trade.markets < 1 ? (
                <div className="px-inset p-3 text-[14px] text-[#ffa08a]">🔒 Постройте рынок (технология «Мена»), чтобы продавать и покупать ресурсы.</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {STORED.map((k) => {
                    const p = snap.trade.prices[k];
                    return (
                      <div key={k} className="px-inset flex flex-col gap-1.5 p-2">
                        <div className="flex items-center gap-2 text-[14px]">
                          <img src={ic[k]} className="pix h-5 w-5" />
                          <b className="text-[#fff3d0]">{RES_INFO[k].name}</b>
                          <span className="text-[#a08868]">у вас {snap.res[k]}</span>
                          <span className="ml-auto text-[12px]" style={{ color: p.mult > 1.05 ? '#8aff9a' : p.mult < 0.95 ? '#ff9a8a' : '#c8b088' }}>
                            цена ×{p.mult.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                          <span className="text-[#ffe27a]">продажа {p.sell.toFixed(2)}🪙</span>
                          <button onClick={() => act(game.trade(k, 10, 'sell'))} className="px-btn px-btn-gold px-2 py-1 text-[12px] font-bold">
                            Продать 10
                          </button>
                          <button onClick={() => act(game.trade(k, 50, 'sell'))} className="px-btn px-btn-gold px-2 py-1 text-[12px] font-bold">
                            50
                          </button>
                          <span className="ml-2 text-[#9ad8ff]">покупка {p.buy.toFixed(2)}🪙</span>
                          <button onClick={() => act(game.trade(k, 10, 'buy'))} className="px-btn px-2 py-1 text-[12px] font-bold">
                            Купить 10
                          </button>
                          <button onClick={() => act(game.trade(k, 50, 'buy'))} className="px-btn px-2 py-1 text-[12px] font-bold">
                            50
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-[12px] text-[#a08868]">Каждая сделка двигает цену (−0.4%/+0.4% за единицу), потом цена возвращается к норме. Больше рынков и торговые технологии снижают комиссию.</div>
                </div>
              )}
            </div>

            {/* склады */}
            <div className="px-panel-dark flex flex-col gap-1 p-3 text-[14px] text-[#e8d4a8]">
              <div className="text-[12px] font-bold tracking-widest text-[#ffcf6a]">СКЛАДЫ</div>
              <div>
                Лимит каждого ресурса: <b className="text-[#ffe9a8]">{snap.cap}</b> (база 150 + склады, залы, костры, цеха; технологии «Гончарное дело», «Хранение», «Зернохранилище» повышают лимит).
              </div>
              <div className="text-[13px] text-[#c8b088]">Склады: {countOf('storage')} · Большие дома: {countOf('hall')} · Завод/цеха: {countOf('workshop') + countOf('foundry') + countOf('factory')}</div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-[12px] text-[#a08868]">
          Горячие клавиши: <b className="text-[#ffcf6a]">M</b> — экономика · <b className="text-[#ffcf6a]">J</b> — авто-распределение · <b className="text-[#ffcf6a]">Esc</b> — закрыть. Баланс по ресурсу: {RES_INFO.gold.name} {fmt(net('gold'))}/с
        </div>
      </div>
    </div>
  );
}
