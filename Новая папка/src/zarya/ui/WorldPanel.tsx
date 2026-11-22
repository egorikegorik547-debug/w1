
import { useEffect, useRef, useState } from 'react';
import { TH, TW } from '../game/data';
import type { Game, Snapshot, TownView } from '../game/game';
import { GOVS, GOV_ORDER, RANKS, SPECS, type GovId } from '../game/meta';
import { annexPeace, changeGov, giftTown, sendArmy, trainSoldiers } from '../game/towns';
import { icons } from './icons';

function Bar({ v, max = 100, color }: { v: number; max?: number; color: string }) {
  return (
    <div className="px-bar h-2.5 w-full">
      <i style={{ width: `${Math.max(0, Math.min(100, (v / max) * 100))}%`, background: color }} />
    </div>
  );
}

export function GovCards({ game, snap, onPick }: { game: Game; snap: Snapshot; onPick?: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {GOV_ORDER.map((id: GovId) => {
        const g = GOVS[id];
        const ok = !g.needTech || snap.done.includes(g.needTech);
        const cur = snap.gov === id;
        return (
          <button
            key={id}
            disabled={!ok}
            onClick={() => {
              changeGov(game, id);
              onPick?.();
            }}
            className={`px-card p-3 ${cur ? 'sel' : ''} ${ok ? '' : 'opacity-50'}`}
            style={{ cursor: ok ? 'pointer' : 'not-allowed' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[24px]">{g.icon}</span>
              <div className="font-pixel text-[8px] leading-snug text-[#ffe9a8]">{g.name.toUpperCase()}</div>
            </div>
            <div className="mt-2 text-[13px] leading-tight text-[#e8d4a8]">{g.desc}</div>
            <div className="mt-1.5 text-[12px] leading-tight text-[#9affaa]">{g.bonus.join(' · ')}</div>
            <div className="mt-1.5 text-[12px] text-[#ffcf6a]">{cur ? '✔ Текущий строй' : ok ? `Правитель: ${g.rulerTitle}` : `🔒 Нужна технология «${g.needName}»`}</div>
          </button>
        );
      })}
    </div>
  );
}

export function GovModal({ game, snap }: { game: Game; snap: Snapshot }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="px-panel scroll-px max-h-[94vh] w-full max-w-[760px] overflow-y-auto p-6">
        <h2 className="px-title mb-2 text-center text-[16px] leading-relaxed sm:text-[20px]">ГОСУДАРСТВО ОБРАЗОВАНО!</h2>
        <p className="mb-4 text-center text-[16px] text-[#e8d4a8]">
          Под властью «{snap.name}» объединились {snap.provinces + 1} селения. Выберите форму правления — её можно будет сменить позже.
        </p>
        <GovCards game={game} snap={snap} />
        <p className="mt-3 text-center text-[13px] text-[#c8b088]">Конституционная монархия и республики открываются технологиями ветки «Общество».</p>
      </div>
    </div>
  );
}

function Odds({ a, d }: { a: number; d: number }) {
  const r = d > 0 ? a / d : 9;
  const [t, c] = r >= 1.6 ? ['Подавляющее превосходство', '#7dff8c'] : r >= 1.15 ? ['Преимущество', '#b8f08a'] : r >= 0.85 ? ['Равные силы — риск', '#ffe27a'] : r >= 0.5 ? ['Вы слабее', '#ffa070'] : ['Верное поражение', '#ff6a6a'];
  return <span style={{ color: c }}>{t}</span>;
}

export function WorldPanel({ game, snap, focusId, onClose }: { game: Game; snap: Snapshot; focusId: number | null; onClose: () => void }) {
  const ic = icons();
  const spec = SPECS[snap.specId];
  const [sendN, setSendN] = useState<Record<number, number>>({});
  const focusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  const act = (r: string | null) => {
    if (r && r !== 'Отказ') game.msg(r, 'warn');
    game.emit(true);
  };
  const towns = [...snap.towns].sort((a, b) => (a.owner === b.owner ? a.dist - b.dist : a.owner === 'player' ? -1 : 1));
  const tc = snap.trainCost;
  const hasBarracks = snap.armyCap > 4 || snap.specId === 'warrior';

  const card = (t: TownView) => {
    const s = SPECS[t.spec];
    const mine = t.owner === 'player';
    const n = Math.max(1, Math.min(snap.army, sendN[t.id] ?? Math.max(1, Math.ceil(snap.army * 0.7))));
    const power = Math.round(n * (snap.armyPow / Math.max(1, snap.army)) * 10) / 10;
    return (
      <div key={t.id} ref={focusId === t.id ? focusRef : undefined} className={`px-card flex flex-col gap-2 p-3 ${focusId === t.id ? 'sel' : ''}`} style={{ cursor: 'default' }}>
        <div className="flex items-center gap-3">
          <span className="px-inset flex h-11 w-11 shrink-0 items-center justify-center text-[24px]" style={{ boxShadow: `inset 0 0 0 2px ${s.color}` }}>
            {s.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-pixel truncate text-[10px] text-[#ffe9a8]">{t.name.toUpperCase()}</div>
            <div className="mt-1 text-[13px] text-[#e8d4a8]">
              {RANKS[t.tier].name} · {s.name}
            </div>
          </div>
          <div className="text-right text-[12px]">
            {mine ? <span className="text-[#7dff8c]">✔ В ГОСУДАРСТВЕ</span> : <span className="text-[#ffcf6a]">Независимое{t.razed ? ' · разорено' : ''}</span>}
            <div className="text-[#c8b088]">{t.reach === 'land' ? 'по суше' : t.reach === 'sea' ? 'морем' : '🔒 нужен флот'} · {t.dist} кл.</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[13px] text-[#f3e3c0]">
          <div className="px-inset px-2 py-1">👥 {t.pop}</div>
          <div className="px-inset px-2 py-1">⚔ {mine ? '—' : `~${t.soldiers}`}</div>
          <div className="px-inset px-2 py-1">🛡 {t.def}</div>
        </div>
        {mine ? (
          <div className="flex flex-col gap-1.5 text-[13px] text-[#e8d4a8]">
            <div className="flex items-center gap-2">
              <span className="w-[90px]">Лояльность</span>
              <Bar v={t.loyalty} color={t.loyalty < 25 ? '#e0503a' : t.loyalty < 50 ? '#e0b030' : '#5ac85a'} />
              <span className="w-8 text-right">{t.loyalty}</span>
            </div>
            <div className="text-[12px] text-[#c8b088]">Приносит: {{ smith: 'камень, золото', miner: 'камень', lumber: 'дерево', warrior: 'новобранцев', trader: 'золото', farmer: 'еду', sage: 'знания', factory: 'товары, золото' }[t.spec]}. Низкая лояльность ведёт к восстанию.</div>
            <button onClick={() => { game.centerOn((t.x + 0.5) * TW, (t.y + 0.5) * TH); onClose(); }} className="px-btn font-pixel self-start px-3 py-2 text-[8px]">
              ◎ НА КАРТЕ
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[13px] text-[#e8d4a8]">
              <span className="w-[90px]">Отношение</span>
              <Bar v={t.attitude} color={t.attitude < 35 ? '#e0503a' : t.attitude < 60 ? '#e0b030' : '#5ac85a'} />
              <span className="w-8 text-right">{t.attitude}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => act(annexPeace(game, t.id))} disabled={snap.res.gold < t.annexCost} className="px-btn px-btn-gold font-pixel px-2.5 py-2 text-[8px]" title="Мирно присоединить к вашему государству. Нужно хорошее отношение или явное превосходство армии.">
                🕊 ПРИСОЕДИНИТЬ · {t.annexCost}🪙
              </button>
              <button onClick={() => act(giftTown(game, t.id))} disabled={snap.res.gold < 20} className="px-btn font-pixel px-2.5 py-2 text-[8px]" title="Подарок улучшает отношение">
                🎁 ДАР · 20🪙
              </button>
            </div>
            <div className="px-inset flex flex-col gap-2 p-2">
              <div className="flex items-center gap-2 text-[13px] text-[#e8d4a8]">
                <span className="font-pixel text-[8px]">ВОЙСКО</span>
                <input type="range" min={1} max={Math.max(1, snap.army)} value={n} disabled={snap.army < 1} onChange={(e) => setSendN({ ...sendN, [t.id]: Number(e.target.value) })} className="px-range min-w-0 flex-1" />
                <span className="font-pixel w-8 text-right text-[9px] text-[#ffcf6a]">{snap.army < 1 ? 0 : n}</span>
              </div>
              <div className="text-[12px] text-[#c8b088]">
                Сила: {power} против обороны ~{t.def} — {snap.army > 0 ? <Odds a={power} d={t.def} /> : 'нет армии'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => act(sendArmy(game, t.id, 'conquer', n))} disabled={snap.army < 1 || t.reach === 'no'} className="px-btn px-btn-red font-pixel px-2.5 py-2 text-[8px]" title="Военный захват: при победе селение присоединяется к вам (лояльность низкая).">
                  ⚔ ЗАХВАТИТЬ
                </button>
                {snap.specId === 'warrior' ? (
                  <button onClick={() => act(sendArmy(game, t.id, 'raze', n))} disabled={snap.army < 1 || t.reach === 'no'} className="px-btn px-btn-red font-pixel px-2.5 py-2 text-[8px]" title="Разорить: ограбить и ослабить селение, не присоединяя его. Доступно только воинам.">
                    🔥 РАЗОРИТЬ
                  </button>
                ) : (
                  <span className="self-center text-[12px] text-[#a08868]">🔥 Разорять умеют только воины</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div className="px-panel flex max-h-[96vh] w-full max-w-[1280px] flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-pixel text-[14px] text-[#ffe9a8]">МИР И ВОЙНА</h2>
            <div className="mt-2 text-[15px] text-[#e8d4a8]">
              {spec.icon} {RANKS[snap.tierIdx].name} «{snap.name}» · {spec.name}
              {snap.gov ? ` · ${GOVS[snap.gov].icon} ${GOVS[snap.gov].name}` : ' · государства пока нет'}
            </div>
          </div>
          <button onClick={onClose} className="px-btn px-btn-red font-pixel px-4 py-3 text-[10px]">
            ЗАКРЫТЬ ✕
          </button>
        </div>

        <div className="scroll-px grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-[400px_1fr]">
          <div className="flex flex-col gap-3">
            <div className="px-panel-dark flex flex-col gap-2 p-3">
              <div className="font-pixel text-[8px] text-[#ffcf6a]">ВАШЕ ГОСУДАРСТВО</div>
              <div className="grid grid-cols-2 gap-2 text-[14px] text-[#f3e3c0]">
                <div className="px-inset px-2 py-1.5">👥 Население: {snap.statePop}</div>
                <div className="px-inset px-2 py-1.5">🏘 Селений: {snap.provinces + 1}</div>
                <div className="px-inset flex items-center gap-1.5 px-2 py-1.5">
                  <img src={ic.gold} className="pix h-4 w-4" /> {snap.res.gold} <span className="text-[12px] text-[#8aff9a]">+{snap.goldRate.toFixed(2)}/с</span>
                </div>
                <div className="px-inset px-2 py-1.5">🛡 Оборона: {snap.homeDef}</div>
              </div>
            </div>

            <div className="px-panel-dark flex flex-col gap-2 p-3">
              <div className="font-pixel text-[8px] text-[#ffcf6a]">АРМИЯ</div>
              <div className="grid grid-cols-3 gap-2 text-[14px] text-[#f3e3c0]">
                <div className="px-inset px-2 py-1.5">⚔ Дома: {snap.army}</div>
                <div className="px-inset px-2 py-1.5">🚩 В походе: {snap.armyAway}</div>
                <div className="px-inset px-2 py-1.5">Лимит: {snap.armyCap}</div>
              </div>
              <div className="text-[13px] text-[#c8b088]">
                Сила армии: <b className="text-[#ffe27a]">{snap.armyPow}</b>. Каждый воин — это взрослый житель, он перестаёт работать, но ест.
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 5, 10].map((n) => (
                  <button key={n} onClick={() => act(trainSoldiers(game, n))} className="px-btn px-btn-green font-pixel px-3 py-2 text-[9px] text-white">
                    + {n}
                  </button>
                ))}
              </div>
              <div className="text-[13px] text-[#e8d4a8]">
                Цена воина: 🍖{tc.food} 🪵{tc.wood} 🪙{tc.gold} 📦{tc.goods} · содержание 🪙0.015/с
              </div>
              {!hasBarracks && <div className="text-[13px] text-[#ffa08a]">Нужна казарма: изучите «Копья» и постройте её (лимит +10).</div>}
            </div>

            {snap.marches.length > 0 && (
              <div className="px-panel-dark flex flex-col gap-2 p-3">
                <div className="font-pixel text-[8px] text-[#ffcf6a]">ПОХОДЫ</div>
                {snap.marches.map((m) => (
                  <div key={m.id} className="text-[13px] text-[#f3e3c0]">
                    <div className="flex justify-between">
                      <span style={{ color: m.incoming ? '#ff9a8a' : '#ffe9a8' }}>
                        {m.incoming ? '⚠ Набег из' : m.phase === 'back' ? '↩ Возвращение из' : m.mode === 'raze' ? '🔥 Разорение' : '⚔ Захват'} «{m.townName}»
                      </span>
                      <span>⚔{m.n}</span>
                    </div>
                    <Bar v={m.progress * 100} color={m.incoming ? '#e0503a' : '#e0b030'} />
                  </div>
                ))}
              </div>
            )}

            <div className="px-panel-dark flex flex-col gap-2 p-3">
              <div className="font-pixel text-[8px] text-[#ffcf6a]">{snap.gov ? 'ФОРМА ПРАВЛЕНИЯ' : 'ВОЗМОЖНЫЕ ФОРМЫ ПРАВЛЕНИЯ'}</div>
              {snap.provinces > 0 ? <GovCards game={game} snap={snap} /> : <div className="text-[13px] text-[#c8b088]">Государство образуется, когда вы присоединяете или захватываете первое селение. Тогда вы выберете строй:</div>}
              {snap.provinces === 0 && (
                <div className="flex flex-col gap-1 text-[13px] text-[#e8d4a8]">
                  {GOV_ORDER.map((id) => (
                    <div key={id}>
                      {GOVS[id].icon} <b>{GOVS[id].name}</b> — {GOVS[id].bonus.slice(0, 2).join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="font-pixel text-[8px] text-[#ffcf6a]">СЕЛЕНИЯ НА КАРТЕ ({towns.length})</div>
            {towns.length === 0 && <div className="text-[15px] text-[#c8b088]">Соседей не найдено.</div>}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{towns.map(card)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
