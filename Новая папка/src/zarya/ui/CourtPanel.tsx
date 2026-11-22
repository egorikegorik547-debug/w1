
import { useState } from 'react';
import { TH, TW } from '../game/data';
import type { Game, Snapshot } from '../game/game';
import { personSprite, type Look } from '../game/sprites';
import { DECREES, TRAIT_BY_ID, appointGovernor, auditGovernor, bindDependent, buySlave, cancelDecree, dismissGovernor, executeGovernor, issueDecree, moveCapital, ransomCaptives, releaseDependent, revokeEstate, startGrant } from '../game/social';

type Tab = 'tax' | 'class' | 'decree' | 'gov' | 'cap';

const cache = new Map<string, string>();
function portrait(look: Look) {
  const k = JSON.stringify(look);
  let u = cache.get(k);
  if (!u) {
    u = personSprite(look, 0, 0, 0, false).toDataURL();
    cache.set(k, u);
  }
  return u;
}

function Seg({ value, items, onPick, disabled }: { value: number; items: { l: string; t: string }[]; onPick: (i: number) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <button key={i} disabled={disabled} onClick={() => onPick(i)} title={it.t} className={`px-btn px-2.5 py-1.5 text-[13px] font-bold ${value === i ? 'active' : ''}`}>
          {it.l}
        </button>
      ))}
    </div>
  );
}

function Bar({ label, v, color, hint }: { label: string; v: number; color: string; hint?: string }) {
  return (
    <div title={hint}>
      <div className="flex justify-between text-[13px] text-[#e8d4a8]">
        <span>{label}</span>
        <b style={{ color }}>{v}%</b>
      </div>
      <div className="px-bar mt-1 h-3">
        <i style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  );
}

export function CourtPanel({ game, snap, onClose }: { game: Game; snap: Snapshot; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('tax');
  const s = snap.soc;
  const r = s.rule;
  const act = (res: string | null) => {
    if (res) game.msg(res, 'warn');
    game.emit(true);
  };
  const tabs: { id: Tab; name: string; icon: string }[] = [
    { id: 'tax', name: 'Налоги и повинности', icon: '💰' },
    { id: 'class', name: 'Сословия и земля', icon: '⛓️' },
    { id: 'decree', name: 'Указы', icon: '📜' },
    { id: 'gov', name: 'Наместники', icon: '🎩' },
    { id: 'cap', name: 'Столица', icon: '🏰' },
  ];
  const mine = snap.towns.filter((t) => t.owner === 'player');
  const freeHeroes = s.heroes.filter((h) => h.town == null);
  const canDep = r.serfs || r.slaves;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div className="px-panel flex max-h-[96vh] w-full max-w-[1180px] flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-pixel text-[14px] text-[#ffe9a8]">ДВОР И УПРАВЛЕНИЕ</h2>
            <div className="mt-2 text-[14px] text-[#e8d4a8]">Налоги, сословия, указы, наместники и столица. [K] — закрыть.</div>
          </div>
          <div className="flex min-w-[260px] flex-col gap-2">
            <Bar label="😊 Счастье народа" v={s.happy} color={s.happy > 60 ? '#8aff9a' : s.happy > 35 ? '#ffd27a' : '#ff7a6a'} hint="Влияет на работу, рождаемость и лояльность" />
            <Bar label="🔥 Недовольство зависимых" v={s.unrest} color={s.unrest < 40 ? '#8aff9a' : s.unrest < 70 ? '#ffd27a' : '#ff7a6a'} hint="Выше 68% — бунты на угодьях" />
          </div>
          <button onClick={onClose} className="px-btn px-btn-red font-pixel px-4 py-3 text-[10px]">
            ЗАКРЫТЬ ✕
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-btn flex items-center gap-1.5 px-3 py-2 text-[14px] font-bold ${tab === t.id ? 'active' : ''}`}>
              <span className="text-[18px]">{t.icon}</span>
              {t.name}
            </button>
          ))}
        </div>

        <div className="scroll-px min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === 'tax' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="px-inset flex flex-col gap-2 p-3">
                <div className="text-[15px] font-bold text-[#ffe9a8]">👥 Подушная подать (свободные жители)</div>
                <Seg value={snap.tax} items={[{ l: 'Нет', t: 'Рождаемость +15%, счастье +6' }, { l: 'Обычная', t: 'Золото ×1' }, { l: 'Высокая', t: 'Золото ×2.1, счастье −12, рождаемость −30%' }]} onPick={(i) => { game.tax = i; game.emit(true); }} />
                <div className="text-[12px] text-[#a08868]">Золото с каждого взрослого. Высокая подать злит народ и провинции.</div>
              </div>
              <div className="px-inset flex flex-col gap-2 p-3">
                <div className="text-[15px] font-bold text-[#ffe9a8]">🌾 Поземельный налог (с угодий помещиков)</div>
                <Seg value={s.taxLand} items={[{ l: 'Нет', t: 'Помещики довольны' }, { l: 'Обычный', t: 'Часть доходов угодий — в казну' }, { l: 'Высокий', t: 'Много золота, но роптание' }]} onPick={(i) => { game.soc.taxLand = i; game.emit(true); }} />
                <div className="text-[12px] text-[#a08868]">Работает, когда в государстве есть усадьбы. Сейчас усадеб: {s.estates.length}.</div>
              </div>
              <div className="px-inset flex flex-col gap-2 p-3">
                <div className="text-[15px] font-bold text-[#ffe9a8]">🏪 Торговый сбор (рынки)</div>
                <Seg value={s.taxTrade} items={[{ l: 'Нет', t: 'Счастье +3' }, { l: 'Обычный', t: 'Золото с каждого рынка' }, { l: 'Высокий', t: 'Золото ×1.8, счастье −6' }]} onPick={(i) => { game.soc.taxTrade = i; game.emit(true); }} />
                <div className="text-[12px] text-[#a08868]">Рынков построено: {snap.trade.markets}.</div>
              </div>
              <div className="px-inset flex flex-col gap-2 p-3">
                <div className="text-[15px] font-bold text-[#ffe9a8]">⛓ Барщина (работа на землях помещика)</div>
                <Seg disabled={!canDep} value={s.corvee} items={[{ l: 'Нет', t: 'Зависимые не работают на угодьях' }, { l: 'Умеренная', t: 'Половина времени на землях владельца' }, { l: 'Тяжёлая', t: '80% времени, много ресурсов, высокое недовольство' }]} onPick={(i) => { game.soc.corvee = i; game.emit(true); }} />
                <div className="text-[12px] text-[#a08868]">{canDep ? `Угодья дают: ${r.outName}. 65% — государству, 35% — владельцу.` : 'Недоступно для вашей специализации.'}</div>
              </div>
              <div className="px-inset flex flex-col gap-2 p-3">
                <div className="text-[15px] font-bold text-[#ffe9a8]">🪙 Оброк (денежная повинность крепостных)</div>
                <Seg disabled={!r.serfs} value={s.quitrent} items={[{ l: 'Нет', t: 'Без оброка' }, { l: 'Обычный', t: 'Золото с каждого крепостного' }, { l: 'Высокий', t: 'Вдвое больше, больше недовольства' }]} onPick={(i) => { game.soc.quitrent = i; game.emit(true); }} />
                <div className="text-[12px] text-[#a08868]">{r.serfs ? 'Платят только крепостные. Рабы работают без платы.' : 'Крепостных нет — оброка тоже.'}</div>
              </div>
              <div className="px-inset flex flex-col gap-1 p-3 text-[14px] text-[#e8d4a8]">
                <div className="font-bold text-[#ffe9a8]">Итоги</div>
                <div>Доход с угодий, оброка и сборов: <b className="text-[#ffe27a]">{s.goldFlow >= 0 ? '+' : ''}{s.goldFlow.toFixed(2)}🪙/с</b></div>
                <div>Общий баланс золота: <b className={snap.goldRate >= 0 ? 'text-[#8aff9a]' : 'text-[#ff7a6a]'}>{snap.goldRate >= 0 ? '+' : ''}{snap.goldRate.toFixed(2)}🪙/с</b></div>
                <div>Целевое счастье: <b>{s.happyTarget}%</b> (здания, указы, налоги, голод)</div>
              </div>
            </div>
          )}

          {tab === 'class' && (
            <div className="flex flex-col gap-3">
              <div className="px-inset p-3 text-[14px] text-[#e8d4a8]">
                <b className="text-[#ffe9a8]">{r.note}</b>
                <div className="mt-1.5 text-[13px] text-[#c8b088]">
                  {r.lords ? `Землевладелец: ${r.lordTitle}. ` : ''}
                  {r.serfs ? `Крепостные: ${r.serfName}. ` : ''}
                  {r.slaves ? `Рабы: ${r.slaveName}. ` : ''}
                  {!r.lords && !r.serfs && !r.slaves ? 'Сословий нет.' : ''}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 text-[14px]">
                  <span>👑 Землевладельцев: <b>{s.lords}</b></span>
                  <span>🌾 Крепостных: <b>{s.serfs}</b></span>
                  <span>⛓ Рабов: <b>{s.slaves}</b></span>
                  <span>🪢 Пленных: <b>{s.captives}</b></span>
                </div>
              </div>
              {r.slaves && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => act(buySlave(game))} className="px-btn px-btn-gold px-3 py-2 text-[13px] font-bold">
                    🛒 Купить невольника (28🪙)
                  </button>
                  <button onClick={() => act(ransomCaptives(game))} disabled={s.captives < 1} className="px-btn px-3 py-2 text-[13px] font-bold">
                    🕊 Отпустить пленных за выкуп
                  </button>
                </div>
              )}
              {r.lords && (
                <div className="px-inset flex flex-col gap-2 p-3">
                  <div className="text-[15px] font-bold text-[#ffe9a8]">🏰 Пожаловать землю жителю (30🪙 + 40 дерева)</div>
                  <div className="text-[13px] text-[#c8b088]">Выберите человека — вы укажете место на карте. Он станет землевладельцем, и вы сможете закрепить за ним зависимых людей.</div>
                  <div className="flex flex-wrap gap-2">
                    {game.units
                      .filter((u) => !u.child && u.spawn <= 0 && u.status === 'free' && u.role === 'none')
                      .slice(0, 10)
                      .map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            const e = startGrant(game, u.id);
                            if (e) act(e);
                            else onClose();
                          }}
                          className="px-btn flex items-center gap-1.5 px-2 py-1 text-[13px] font-bold"
                        >
                          <img src={portrait(u.look)} className="pix h-[30px] w-6" />
                          {u.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {s.estates.length === 0 && r.lords && <div className="text-[14px] text-[#a08868]">Угодий пока нет.</div>}
              {s.estates.map((e) => (
                <div key={e.id} className="px-inset flex flex-col gap-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[15px] font-bold text-[#ffe9a8]">
                        {e.name} {e.riot && <span className="blink-px text-[#ff7a6a]">· БУНТ</span>}
                      </div>
                      <div className="text-[13px] text-[#c8b088]">
                        Владелец: <b>{e.lord}</b> ({r.lordTitle.toLowerCase()}) · зависимых: <b>{e.dep}</b> · добыча: <b>{e.rate.toFixed(2)}/с</b> {r.outName} · казна владельца: <b>{e.wealth}</b>
                      </div>
                    </div>
                    <button onClick={() => game.centerOn((e.x + 1.5) * TW, (e.y + 1.5) * TH)} className="px-btn px-2.5 py-1.5 text-[13px] font-bold">
                      📍 Показать
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.serfs && (
                      <button onClick={() => act(bindDependent(game, e.id, 'serf'))} className="px-btn px-2.5 py-1.5 text-[13px] font-bold">
                        ➕ Закрепостить жителя
                      </button>
                    )}
                    {r.slaves && (
                      <button onClick={() => act(bindDependent(game, e.id, 'slave'))} className="px-btn px-2.5 py-1.5 text-[13px] font-bold">
                        ➕ Обратить пленника в раба
                      </button>
                    )}
                    <button onClick={() => act(releaseDependent(game, e.id))} className="px-btn px-btn-green px-2.5 py-1.5 text-[13px] font-bold text-white">
                      🕊 Освободить одного
                    </button>
                    <button onClick={() => { revokeEstate(game, e.id); game.emit(true); }} className="px-btn px-btn-red px-2.5 py-1.5 text-[13px] font-bold">
                      ✖ Изъять землю
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'decree' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {DECREES.map((d) => {
                const active = s.decrees.find((x) => x.id === d.id);
                const cd = s.cd[d.id] ?? 0;
                return (
                  <div key={d.id} className="px-inset flex flex-col gap-2 p-3" style={active ? { boxShadow: 'inset 0 0 0 2px #7dff8c' } : undefined}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[16px] font-bold text-[#ffe9a8]">
                        {d.icon} {d.name}
                      </div>
                      <div className="text-[12px] text-[#a08868]">{d.dur} с · перезарядка {d.cd} с</div>
                    </div>
                    <div className="text-[13px] text-[#e8d4a8]">{d.desc}</div>
                    <div className="text-[13px] text-[#9affaa]">{d.pros.map((p) => `＋ ${p}`).join(' · ')}</div>
                    <div className="text-[13px] text-[#ff9a8a]">{d.cons.map((p) => `－ ${p}`).join(' · ')}</div>
                    {active ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-[#8aff9a]">Действует ещё {active.left} с</span>
                        <button onClick={() => { cancelDecree(game, d.id); game.emit(true); }} className="px-btn px-btn-red px-2.5 py-1.5 text-[13px] font-bold">
                          Отменить
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => act(issueDecree(game, d.id))} disabled={cd > 0} className="px-btn px-btn-gold px-2.5 py-1.5 text-[13px] font-bold">
                        {cd > 0 ? `Перезарядка ${cd} с` : `Издать указ (${d.cost}🪙)`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'gov' && (
            <div className="flex flex-col gap-3">
              <div className="px-inset p-3 text-[13px] text-[#c8b088]">Каждому присоединённому селению нужен наместник. Без него доход ×0.7, лояльность −12. Герои различаются чертами: кто-то ворует, но держит порядок, кто-то честен, но мягок.</div>
              {mine.length === 0 && <div className="text-[14px] text-[#a08868]">Пока нет присоединённых селений. Захватите или присоедините соседей (V).</div>}
              {mine.map((t) => {
                const tr = t.govTrait ? TRAIT_BY_ID[t.govTrait] : null;
                const hero = s.heroes.find((h) => h.id === t.governor);
                return (
                  <div key={t.id} className="px-inset flex flex-col gap-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[15px] font-bold text-[#ffe9a8]">
                        {t.capital ? '★ ' : ''}
                        {t.name} <span className="text-[13px] font-normal text-[#c8b088]">· 👥 {t.pop} · лояльность {t.loyalty}%</span>
                      </div>
                      <button onClick={() => game.centerOn((t.x + 0.5) * TW, (t.y + 0.5) * TH)} className="px-btn px-2.5 py-1 text-[13px] font-bold">
                        📍
                      </button>
                    </div>
                    {hero && tr ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <img src={portrait(hero.look)} className="pix h-[40px] w-8" />
                        <div className="min-w-[240px] flex-1">
                          <div className="text-[14px] font-bold text-[#fff3d0]">
                            {hero.name} — {tr.icon} {tr.name}
                          </div>
                          <div className="text-[12px] text-[#c8b088]">{tr.desc}</div>
                          <div className="text-[12px] text-[#ffd27a]">Накоплено в личной казне: {hero.stash}🪙</div>
                        </div>
                        <button onClick={() => act(auditGovernor(game, t.id))} className="px-btn px-2.5 py-1.5 text-[13px] font-bold">🔍 Ревизия</button>
                        <button onClick={() => { dismissGovernor(game, t.id); game.emit(true); }} className="px-btn px-2.5 py-1.5 text-[13px] font-bold">Отстранить</button>
                        <button onClick={() => { executeGovernor(game, hero.id); game.emit(true); }} className="px-btn px-btn-red px-2.5 py-1.5 text-[13px] font-bold">☠ Казнить</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-[#ff9a8a]">⚠ Наместника нет.</span>
                        {freeHeroes.length === 0 && <span className="text-[13px] text-[#a08868]">Ждите: новые герои прибывают ко двору.</span>}
                        {freeHeroes.map((h) => (
                          <button key={h.id} onClick={() => act(appointGovernor(game, t.id, h.id))} className="px-btn flex items-center gap-1.5 px-2 py-1 text-[12px] font-bold">
                            <img src={portrait(h.look)} className="pix h-[30px] w-6" />
                            {h.name.split(' ')[0]} · {TRAIT_BY_ID[h.trait].icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="px-inset flex flex-col gap-2 p-3">
                <div className="text-[15px] font-bold text-[#ffe9a8]">🧑‍💼 Герои при дворе ({freeHeroes.length})</div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {freeHeroes.map((h) => {
                    const tr = TRAIT_BY_ID[h.trait];
                    const sign = (v: number, unit = '%') => `${v >= 1 ? '+' : '−'}${Math.abs(Math.round((v - 1) * 100))}${unit}`;
                    return (
                      <div key={h.id} className="flex gap-2">
                        <img src={portrait(h.look)} className="pix h-[40px] w-8" />
                        <div className="text-[13px] leading-tight">
                          <div className="font-bold text-[#fff3d0]">
                            {h.name} · {tr.icon} {tr.name}
                          </div>
                          <div className="text-[#c8b088]">{tr.desc}</div>
                          <div className="text-[#a08868]">
                            золото {sign(tr.gold)} · выпуск {sign(tr.prod)} · лояльность {tr.loy >= 0 ? '+' : ''}
                            {tr.loy} · воровство {Math.round(tr.theft * 100)}%
                          </div>
                          <button onClick={() => { executeGovernor(game, h.id); game.emit(true); }} className="mt-0.5 text-[11px] text-[#ff9a8a] underline">
                            прогнать
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {s.stolen > 0 && <div className="text-[13px] text-[#ff9a8a]">Всего украдено наместниками: {s.stolen}🪙</div>}
              </div>
            </div>
          )}

          {tab === 'cap' && (
            <div className="flex flex-col gap-3">
              <div className="px-inset p-3 text-[13px] text-[#c8b088]">
                Столица даёт государству бонусы. Богатая столица увеличивает доход золота (до +30%), укреплённая — оборону (до +40%). Перенос стоит 120🪙, вызывает смятение (лояльность −8 на 90 с) и возможен раз в 5 минут.
                {s.capCd > 0 && <b className="ml-1 text-[#ffd27a]">Следующий перенос через {s.capCd} с.</b>}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="px-inset flex flex-col gap-1 p-3" style={s.capital === null ? { boxShadow: 'inset 0 0 0 2px #ffe27a' } : undefined}>
                  <div className="text-[15px] font-bold text-[#ffe9a8]">{s.capital === null ? '★ ' : ''}{snap.name} (исходное селение)</div>
                  <div className="text-[13px] text-[#c8b088]">👥 {snap.pop} · оборона {snap.homeDef} · бонусы столицы: золото +4%, оборона +4%</div>
                  <button onClick={() => act(moveCapital(game, null))} disabled={s.capital === null} className="px-btn px-btn-gold mt-1 px-2.5 py-1.5 text-[13px] font-bold">
                    {s.capital === null ? 'Это столица' : 'Вернуть столицу (120🪙)'}
                  </button>
                </div>
                {mine.map((t) => (
                  <div key={t.id} className="px-inset flex flex-col gap-1 p-3" style={t.capital ? { boxShadow: 'inset 0 0 0 2px #ffe27a' } : undefined}>
                    <div className="text-[15px] font-bold text-[#ffe9a8]">{t.capital ? '★ ' : ''}{t.name}</div>
                    <div className="text-[13px] text-[#c8b088]">
                      👥 {t.pop} · ⚔ защита {t.def} · лояльность {t.loyalty}% · {t.govName ? `наместник ${t.govName}` : 'без наместника'}
                    </div>
                    <div className="text-[12px] text-[#a08868]">
                      Прогноз: золото +{Math.round(Math.min(30, (t.pop * 100) / 220))}% · оборона +{Math.round(Math.min(40, (t.def * 100) / 70))}%
                    </div>
                    <button onClick={() => act(moveCapital(game, t.id))} disabled={t.capital} className="px-btn px-btn-gold mt-1 px-2.5 py-1.5 text-[13px] font-bold">
                      {t.capital ? 'Это столица' : 'Сделать столицей (120🪙)'}
                    </button>
                  </div>
                ))}
              </div>
              {mine.length === 0 && <div className="text-[14px] text-[#a08868]">Присоедините селения, чтобы выбрать столицу побогаче или посильнее.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

void TH;
