
import { useState } from 'react';
import { BUILDINGS, DAY_LENGTH } from '../game/data';
import type { Game, Snapshot, Unit } from '../game/game';
import {
  GRAVES_PER_CEMETERY, acceptQuest, buryFallen, buyOffer, canAfford, canPayRecipe, cemeteries, claimCost, clearQueue, dismissHunter, hireHunter, hunters, itemCount, offersFor, personName, prodOf, queueCraft, questProgress, recipeOpen, turnInQuest,
  type Person,
} from '../game/life';
import { CRAFT_BUILDINGS, ITEMS, RECIPES, RECIPE_BY_ID, TRAITS, VISITORS } from '../game/lifeData';
import { TECH_BY_ID } from '../game/techs';
import { personSprite, type Look } from '../game/sprites';

type Tab = 'prod' | 'army' | 'fam' | 'grave' | 'guests' | 'hunt' | 'land';

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

const RES_ICON: Record<string, string> = { wood: '🪵', stone: '🪨', food: '🍖', goods: '📦', gold: '🪙' };
const iconOf = (k: string) => RES_ICON[k] ?? ITEMS[k]?.icon ?? k;

function Need({ need, g }: { need: Record<string, number>; g: Game }) {
  return (
    <span className="inline-flex flex-wrap gap-x-2">
      {Object.keys(need).map((k) => {
        const have = k in ITEMS ? itemCount(g, k) : Math.floor((g.res as Record<string, number>)[k] ?? 0);
        return (
          <span key={k} className={have >= need[k] ? 'text-[#b8f0b8]' : 'text-[#ff9a8a]'}>
            {iconOf(k)}
            {need[k]}
          </span>
        );
      })}
    </span>
  );
}

function Bar({ label, v, max = 100, color }: { label: string; v: number; max?: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[13px] font-bold">
        <span>{label}</span>
        <span>{Math.round(v)}</span>
      </div>
      <div className="px-inset h-3 p-[2px]">
        <div className="h-full" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

const dayOf = (t: number) => Math.floor(t / DAY_LENGTH) + 1;

function unitOfPerson(g: Game, p: Person): Unit | undefined {
  return g.units.find((u) => u.id === p.id) ?? g.guards.find((u) => u.id === p.id) ?? g.marches.flatMap((m) => m.members ?? []).find((u) => u.id === p.id);
}

export function LifePanel({ game, snap, onClose }: { game: Game; snap: Snapshot; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('prod');
  const [famSel, setFamSel] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const L = game.life;
  const act = (r: string | null | void) => setNote(r ?? '');
  const tabs: { id: Tab; name: string; icon: string; badge?: number }[] = [
    { id: 'prod', name: 'Производство', icon: '🔨' },
    { id: 'army', name: 'Войско', icon: '⚔️' },
    { id: 'fam', name: 'Династии', icon: '👪' },
    { id: 'grave', name: 'Кладбище', icon: '🪦', badge: L.fallen.length },
    { id: 'guests', name: 'Странники', icon: '🧳', badge: L.visitors.filter((v) => v.state !== 'leave').length },
    { id: 'hunt', name: 'Охота и ночь', icon: '🐺' },
    { id: 'land', name: 'Земли', icon: '🏴' },
  ];

  /* ───── Производство ───── */
  const prodTab = () => {
    const blds = game.buildings.filter((b) => b.done && CRAFT_BUILDINGS.includes(b.type));
    const missing = CRAFT_BUILDINGS.filter((t) => !blds.some((b) => b.type === t));
    const stock = Object.values(ITEMS).filter((i) => itemCount(game, i.id) > 0);
    return (
      <div className="flex flex-col gap-3">
        <div className="px-inset p-3">
          <div className="mb-2 text-[15px] font-bold text-[#ffe9a8]">📦 Склад изделий</div>
          {stock.length === 0 ? (
            <div className="text-[14px] text-[#a08868]">Пусто. Изучите технологию, постройте мастерскую и закажите вещь — свободные жители придут работать.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stock.map((i) => (
                <div key={i.id} title={i.desc} className="px-panel-dark px-2.5 py-1.5 text-[14px] font-bold">
                  {i.icon} {i.name} ×{itemCount(game, i.id)}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-[12px] text-[#a08868]">Орудия (корзины, топоры, плуги…) усиливают работников, оружие и броня сами надеваются на воинов гарнизона, а новые воины берут оружие со склада.</div>
        </div>
        {blds.length === 0 && <div className="px-inset p-3 text-[14px] text-[#e8d4a8]">У вас ещё нет мастерских. Постройте «Мастерскую» (меню построек [B] → Производство).</div>}
        {blds.map((b) => {
          const P = prodOf(game, b.id);
          const def = BUILDINGS[b.type];
          const slots = def.jobs ?? 2;
          const recs = RECIPES.filter((r) => r.bld === b.type);
          return (
            <div key={b.id} className="px-inset flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[15px] font-bold text-[#ffe9a8]">
                  {def.name} <span className="text-[12px] text-[#a08868]">({b.x},{b.y})</span>
                </div>
                <div className="text-[13px]">
                  👷 Мастеров: {P.staff.length}/{slots} · <span className="text-[#ffd27a]">{P.status}</span>
                  {P.started && P.queue[0] && <> · ⏱ {Math.round((P.progress / RECIPE_BY_ID[P.queue[0].recipe].time) * 100)}%</>}
                </div>
              </div>
              {P.queue.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {P.queue.map((q) => (
                    <button key={q.recipe} onClick={() => clearQueue(game, b.id, q.recipe)} title="Убрать из очереди" className="px-btn px-2 py-1 text-[13px]">
                      {ITEMS[RECIPE_BY_ID[q.recipe].item].icon} {ITEMS[q.recipe].name} ×{q.n} ✕
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {recs.map((r) => {
                  const open = recipeOpen(game, r);
                  const it = ITEMS[r.item];
                  return (
                    <div key={r.id} className={`px-panel-dark flex items-center justify-between gap-2 p-2 ${open ? '' : 'opacity-55'}`}>
                      <div className="min-w-0">
                        <div className="text-[14px] font-bold">
                          {it.icon} {it.name} <span className="text-[12px] text-[#a08868]">у вас: {itemCount(game, r.item)}</span>
                        </div>
                        <div className="text-[12px] text-[#c8b090]">{it.desc}</div>
                        <div className="text-[12px]">
                          {open ? <Need need={r.in} g={game} /> : <span className="text-[#ff9a8a]">🔒 Нужна технология «{TECH_BY_ID[r.tech]?.name ?? r.tech}»</span>}
                          {open && <span className="text-[#a08868]"> · {r.time}с</span>}
                        </div>
                      </div>
                      {open && (
                        <div className="flex gap-1">
                          <button disabled={!canPayRecipe(game, r)} onClick={() => act(queueCraft(game, b.id, r.id, 1))} className="px-btn px-2 py-1 text-[13px] font-bold">
                            +1
                          </button>
                          <button onClick={() => act(queueCraft(game, b.id, r.id, 5))} className="px-btn px-2 py-1 text-[13px] font-bold">
                            +5
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {missing.length > 0 && (
          <div className="px-inset p-3 text-[13px] text-[#c8b090]">
            Другие производства: {missing.map((t) => `${BUILDINGS[t].name} (${TECH_BY_ID[BUILDINGS[t].req ?? '']?.name ?? '—'})`).join(' · ')}.
          </div>
        )}
      </div>
    );
  };

  /* ───── Войско ───── */
  const armyTab = () => {
    const all: Unit[] = [...game.guards, ...game.marches.flatMap((m) => (m.incoming ? [] : m.members ?? []))];
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="px-inset p-3">
            <div className="text-[15px] font-bold text-[#ffe9a8]">⚔️ Гарнизон: {game.guards.length}</div>
            <div className="text-[13px] text-[#c8b090]">В походе: {snap.armyAway} · Лимит: {snap.armyCap} · Сила: {snap.armyPow}</div>
            <div className="mt-1 text-[12px] text-[#a08868]">Воины не пропадают: они стоят на постах и патрулируют деревню, а в поход идут колонной.</div>
          </div>
          <div className="px-inset p-3">
            <Bar label="🕯 Боевой дух (память героев)" v={L.moraleBonus * 100} max={40} color="#b89aff" />
            <div className="mt-1 text-[12px] text-[#a08868]">+{Math.round(L.moraleBonus * 100)}% к силе армии. Могилы: {L.graves.length}, память живых: {Math.round(L.memory)}.</div>
          </div>
          <div className="px-inset p-3 text-[13px]">
            <div className="font-bold text-[#ffe9a8]">Действующие эффекты</div>
            {L.buffs.atk > 0 && <div>🗡 Заточка оружия: {Math.ceil(L.buffs.atk)}с</div>}
            {L.buffs.work > 0 && <div>🧪 Зелье бодрости: {Math.ceil(L.buffs.work)}с</div>}
            {L.buffs.craft > 0 && <div>🔨 Мастера вдохновлены: {Math.ceil(L.buffs.craft)}с</div>}
            {L.buffs.birth > 0 && <div>🌿 Эликсир жизни: {Math.ceil(L.buffs.birth)}с</div>}
            {L.buffs.atk + L.buffs.work + L.buffs.craft + L.buffs.birth <= 0 && <div className="text-[#a08868]">Нет</div>}
          </div>
        </div>
        <div className="px-inset p-3">
          <div className="mb-2 text-[15px] font-bold text-[#ffe9a8]">Бойцы</div>
          {all.length === 0 && <div className="text-[14px] text-[#a08868]">Войска нет. В панели «Война» [V] обучите воинов — но сначала сделайте оружие в мастерской/кузнице.</div>}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {all.map((u) => (
              <div key={u.id} className="px-panel-dark flex items-center gap-2 p-2">
                <img src={portrait(u.look)} className="pix h-10 w-10 shrink-0" alt="" />
                <div className="min-w-0 text-[13px]">
                  <div className="font-bold">
                    {u.hero ? '👑 ' : ''}
                    {personName(game, u.id) !== '—' ? personName(game, u.id) : u.name} <span title={TRAITS[u.trait].desc}>{TRAITS[u.trait].icon}</span>
                  </div>
                  <div className="text-[#c8b090]">
                    {u.gear?.weapon ? ITEMS[u.gear.weapon].icon + ' ' + ITEMS[u.gear.weapon].name : '✊ без оружия'}
                    {u.gear?.armor ? ' · ' + ITEMS[u.gear.armor].icon : ''}
                    {u.gear?.shield ? ' · 🛡️' : ''}
                    {u.gear?.horse ? ' · 🐎' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ───── Династии ───── */
  const famTab = () => {
    const fams = [...L.families.values()];
    const sel = famSel ?? L.follow ?? fams[0]?.id ?? null;
    const members = [...L.people.values()].filter((p) => p.fam === sel);
    const events = members.flatMap((p) => p.log.map((l) => ({ ...l, who: p.name }))).sort((a, b) => b.t - a.t).slice(0, 14);
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-2">
          {fams.map((f) => {
            const ms = [...L.people.values()].filter((p) => p.fam === f.id);
            const alive = ms.filter((p) => p.alive).length;
            return (
              <button key={f.id} onClick={() => setFamSel(f.id)} className={`px-btn flex flex-col items-start px-3 py-2 text-left ${sel === f.id ? 'active' : ''}`}>
                <span className="text-[15px] font-bold">
                  {L.follow === f.id ? '⭐ ' : ''}Род {f.name}
                </span>
                <span className="text-[12px] text-[#c8b090]">
                  Живых: {alive} · Всего: {ms.length} · основан в день {dayOf(f.founded)}
                </span>
              </button>
            );
          })}
          {fams.length === 0 && <div className="px-inset p-3 text-[14px] text-[#a08868]">Начните игру — первые поселенцы образуют роды.</div>}
        </div>
        <div className="px-inset flex flex-col gap-3 p-3">
          {sel !== null && L.families.get(sel) && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[16px] font-bold text-[#ffe9a8]">Род {L.families.get(sel)!.name}</div>
                <button onClick={() => (L.follow = L.follow === sel ? null : sel)} className={`px-btn px-3 py-1.5 text-[13px] font-bold ${L.follow === sel ? 'active' : ''}`}>
                  {L.follow === sel ? '⭐ Следим (на карте метка)' : '☆ Следить за судьбой'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {members.map((p) => {
                  const u = unitOfPerson(game, p);
                  const par = p.parents.map((id) => L.people.get(id)?.name).filter(Boolean).join(' и ');
                  return (
                    <div key={p.id} className={`px-panel-dark flex items-center gap-2 p-2 ${p.alive ? '' : 'opacity-60'}`}>
                      {u ? <img src={portrait(u.look)} className="pix h-10 w-10 shrink-0" alt="" /> : <div className="grid h-10 w-10 shrink-0 place-items-center text-[22px]">{p.buried ? '🪦' : '💀'}</div>}
                      <div className="min-w-0 text-[13px]">
                        <div className="font-bold">
                          {p.name} <span title={TRAITS[p.trait].desc}>{TRAITS[p.trait].icon}</span> <span className="text-[#a08868]">{TRAITS[p.trait].name}</span>
                        </div>
                        <div className="text-[#c8b090]">
                          {p.alive ? { child: 'Ребёнок', worker: 'Житель', soldier: 'Воин', hunter: 'Охотник' }[p.role] : `✝ ${p.cause ?? 'умер'}`}
                          {par ? ` · дети ${par}` : ''}
                        </div>
                        {u && (
                          <button onClick={() => game.centerOn(u.x * 16, u.y * 12)} className="text-[12px] text-[#ffcf6a] underline">
                            показать на карте
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="mb-1 text-[14px] font-bold text-[#ffe9a8]">📜 Хроника рода</div>
                {events.length === 0 && <div className="text-[13px] text-[#a08868]">Пока тихо.</div>}
                {events.map((e, i) => (
                  <div key={i} className="text-[13px] text-[#e8d4a8]">
                    <span className="text-[#a08868]">день {dayOf(e.t)}</span> · {e.who}: {e.text}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ───── Кладбище ───── */
  const graveTab = () => {
    const cems = cemeteries(game);
    const fallen = L.fallen.map((id) => L.people.get(id)).filter(Boolean) as Person[];
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="px-inset p-3">
            <Bar label="🕯 Боевой дух от памяти" v={L.moraleBonus * 100} max={40} color="#b89aff" />
            <div className="mt-1 text-[13px] text-[#c8b090]">
              Кладбищ: {cems.length} (мест: {cems.length * GRAVES_PER_CEMETERY - L.graves.length} свободно). Жители приходят помянуть павших — каждый визит поднимает память.
            </div>
            {cems.length === 0 && <div className="mt-1 text-[13px] text-[#ffcf6a]">Постройте «Кладбище» (меню построек → Знания и вера, нужна технология «Обряды»).</div>}
          </div>
          <div className="px-inset p-3 text-[13px]">
            <div className="font-bold text-[#ffe9a8]">Правила</div>
            Погибшие в бою, от зверей, разбойников и голода записываются сюда. Похороны стоят 4 дерева и 3 золота; герои, павшие воинами, дают больше боевого духа.
          </div>
        </div>
        <div className="px-inset p-3">
          <div className="mb-2 text-[15px] font-bold text-[#ffe9a8]">⚰ Ждут погребения: {fallen.length}</div>
          {fallen.length === 0 && <div className="text-[13px] text-[#a08868]">Все павшие погребены.</div>}
          <div className="flex flex-col gap-2">
            {fallen.map((p) => (
              <div key={p.id} className="px-panel-dark flex items-center justify-between gap-2 p-2 text-[14px]">
                <div>
                  {p.hero ? '🎖 ' : '💀 '}
                  <b>{personName(game, p.id)}</b> — {p.cause}
                </div>
                <button onClick={() => act(buryFallen(game, p.id))} className="px-btn px-btn-green px-3 py-1 text-[13px] font-bold">
                  Похоронить
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-inset p-3">
          <div className="mb-2 text-[15px] font-bold text-[#ffe9a8]">🪦 Могилы: {L.graves.length}</div>
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {L.graves.map((gr) => (
              <div key={gr.id} className="text-[13px] text-[#e8d4a8]">
                {gr.hero ? '✝🎖' : '✝'} {gr.name} {L.families.get(gr.fam)?.name} — {gr.cause} <span className="text-[#a08868]">(день {dayOf(gr.t)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ───── Странники ───── */
  const guestsTab = () => {
    const vs = L.visitors;
    return (
      <div className="flex flex-col gap-3">
        {vs.length === 0 && (
          <div className="px-inset p-4 text-[14px] text-[#e8d4a8]">
            В деревне нет странников. Время от времени сюда забредают бродячий кузнец, ведьма-травница или странствующий рыцарь — у каждого свои мини-задания и услуги.
          </div>
        )}
        {vs.map((v) => {
          const info = VISITORS[v.kind];
          const q = v.quest;
          const pr = questProgress(game, v);
          return (
            <div key={v.id} className="px-inset flex flex-col gap-2 p-3">
              <div className="flex items-center gap-3">
                <img src={portrait(v.unit.look)} className="pix h-12 w-12" alt="" />
                <div>
                  <div className="text-[16px] font-bold text-[#ffe9a8]">
                    {info.icon} {v.name} — {info.name}
                  </div>
                  <div className="text-[12px] text-[#a08868]">{v.state === 'arrive' ? 'Идёт к стоянке…' : v.state === 'wait' ? `Остаётся ещё ~${Math.ceil(v.timer)}с` : 'Уходит'}</div>
                </div>
              </div>
              {q && !q.done && (
                <div className="px-panel-dark p-2.5 text-[14px]">
                  <div className="font-bold text-[#ffd27a]">📜 {q.def.title}</div>
                  <div className="text-[#e8d4a8]">{q.def.text}</div>
                  <div className="mt-1 text-[13px]">
                    {q.def.kind === 'bring' ? <Need need={q.def.need} g={game} /> : <span>Убито хищников: {q.accepted ? pr.have : 0}/{q.def.kill}</span>}
                    <span className="text-[#a08868]"> · Награда: {q.def.rewardText}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {!q.accepted ? (
                      <button onClick={() => acceptQuest(game, v.id)} className="px-btn px-btn-gold px-3 py-1.5 text-[13px] font-bold">
                        Принять задание
                      </button>
                    ) : (
                      <button disabled={!pr.ok} onClick={() => act(turnInQuest(game, v.id))} className="px-btn px-btn-green px-3 py-1.5 text-[13px] font-bold">
                        Сдать задание
                      </button>
                    )}
                  </div>
                </div>
              )}
              {q?.done && <div className="text-[13px] text-[#b8f0b8]">✔ Задание выполнено</div>}
              <div className="flex flex-wrap gap-2">
                {offersFor(v.kind).map((o) => (
                  <div key={o.id} className="px-panel-dark flex items-center gap-2 p-2 text-[13px]">
                    <div>
                      <div className="font-bold">{o.label}</div>
                      <div className="text-[#c8b090]">{o.desc}</div>
                      <Need need={o.cost} g={game} />
                    </div>
                    <button disabled={!!v.used[o.id] || !canAfford(game, o.cost)} onClick={() => act(buyOffer(game, v.id, o.id))} className="px-btn px-btn-gold px-3 py-1.5 text-[13px] font-bold">
                      {v.used[o.id] ? '✔' : 'Купить'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ───── Охота и ночь ───── */
  const huntTab = () => {
    const hs = hunters(game);
    const lodges = game.buildings.filter((b) => b.done && b.type === 'lodge').length;
    const wolves = L.animals.filter((a) => a.kind === 'wolf').length;
    const bears = L.animals.filter((a) => a.kind === 'bear').length;
    const deer = L.animals.filter((a) => a.kind === 'deer').length;
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="px-inset flex flex-col gap-2 p-3">
          <div className="text-[15px] font-bold text-[#ffe9a8]">🐺 Лес вокруг</div>
          <div className="text-[14px]">
            Волков: {wolves} · Медведей: {bears} · Оленей: {deer} · Убито хищников: {L.kills}
          </div>
          <div className="text-[12px] text-[#a08868]">Хищники нападают на лесорубов. Трусы убегают, храбрецы дерутся, а охотники и стража прогоняют зверя и приносят мясо.</div>
          <div className="mt-2 text-[15px] font-bold text-[#ffe9a8]">🏹 Охотники: {hs.length}/{lodges * 2}</div>
          {lodges === 0 && <div className="text-[13px] text-[#ffcf6a]">Постройте «Дом охотника» — каждый вмещает двух охотников.</div>}
          <button onClick={() => act(hireHunter(game))} className="px-btn px-btn-green self-start px-3 py-2 text-[13px] font-bold">
            Нанять охотника · 🪵6 🪙6 {bowOrSpear(game)}
          </button>
          {hs.map((u) => (
            <div key={u.id} className="px-panel-dark flex items-center gap-2 p-2 text-[13px]">
              <img src={portrait(u.look)} className="pix h-9 w-9" alt="" />
              <div className="flex-1">
                <b>{personName(game, u.id)}</b> {TRAITS[u.trait].icon}
                <div className="text-[#c8b090]">{u.gear?.weapon ? ITEMS[u.gear.weapon].name : 'голыми руками'}</div>
              </div>
              <button onClick={() => dismissHunter(game, u.id)} className="px-btn px-2 py-1 text-[12px]">
                Распустить
              </button>
            </div>
          ))}
        </div>
        <div className="px-inset flex flex-col gap-2 p-3">
          <div className="text-[15px] font-bold text-[#ffe9a8]">🌙 Ночь в деревне</div>
          <div className="text-[13px] text-[#c8b090]">
            Сейчас: {snap.life.night ? 'ночь — жители спят, горят факелы и окна' : 'день'} · Воров поймано: {L.caught} · Краж: {L.thefts} · На улицах: {L.raiders.length}
          </div>
          <div className="text-[12px] text-[#a08868]">Воры и разбойники выходят ночью. Держите стражу (казарма, воины в гарнизоне) и охотников — они ловят воров и бьют разбойников.</div>
          <div className="mt-1 text-[14px] font-bold text-[#ffe9a8]">Журнал событий</div>
          <div className="scroll-px max-h-[260px] overflow-y-auto pr-1">
            {L.events.length === 0 && <div className="text-[13px] text-[#a08868]">Пока спокойно.</div>}
            {L.events.map((e, i) => (
              <div key={i} className={`text-[13px] ${e.kind === 'warn' ? 'text-[#ff9a8a]' : e.kind === 'good' ? 'text-[#b8f0b8]' : 'text-[#e8d4a8]'}`}>
                <span className="text-[#a08868]">день {dayOf(e.t)}</span> · {e.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ───── Земли ───── */
  const landTab = () => {
    const mine = L.claims.filter((c) => c.owner === 0);
    const cost = claimCost(game);
    const byTown = game.towns.map((t) => ({ t, n: L.claims.filter((c) => c.owner === t.id).length })).filter((q) => q.n > 0);
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="px-inset flex flex-col gap-2 p-3">
          <div className="text-[15px] font-bold text-[#ffe9a8]">🏴 Ваши захваты: {mine.length}</div>
          <div className="text-[13px] text-[#c8b090]">Пустую землю у границы можно занять флагом (радиус 5). Угодья дают еду и золото, а чужие селения не смогут её занять.</div>
          <div className="text-[14px]">
            Цена следующего захвата: 🪙{cost.gold} 🪵{cost.wood} 🍖{cost.food}
          </div>
          <button
            onClick={() => {
              game.setTool('claim');
              onClose();
            }}
            className="px-btn px-btn-gold self-start px-3 py-2 text-[13px] font-bold"
          >
            🏴 Выбрать землю на карте [L]
          </button>
          <div className="text-[12px] text-[#a08868]">Строить на чужой земле нельзя. Боты тоже расширяются — поторопитесь!</div>
        </div>
        <div className="px-inset flex flex-col gap-1 p-3 text-[14px]">
          <div className="text-[15px] font-bold text-[#ffe9a8]">Соседи занимают землю</div>
          {byTown.length === 0 && <div className="text-[13px] text-[#a08868]">Пока никто не расширялся.</div>}
          {byTown.map(({ t, n }) => (
            <div key={t.id}>
              «{t.name}» — {n} участк.
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3" onClick={onClose}>
      <div className="px-panel flex max-h-[96vh] w-full max-w-[1180px] flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-pixel text-[14px] text-[#ffe9a8]">ЖИЗНЬ ДЕРЕВНИ</h2>
            <div className="mt-2 text-[14px] text-[#e8d4a8]">Мастерские, войско, роды, кладбище, странники и охота. [N] — закрыть.</div>
          </div>
          <button onClick={onClose} className="px-btn px-btn-red font-pixel px-4 py-3 text-[10px]">
            ЗАКРЫТЬ ✕
          </button>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-btn relative flex items-center gap-1.5 px-3 py-2 text-[14px] font-bold ${tab === t.id ? 'active' : ''}`}>
              <span className="text-[18px]">{t.icon}</span>
              {t.name}
              {!!t.badge && <span className="font-pixel absolute -top-2 -left-1.5 bg-[#c0392b] px-1 py-[3px] text-[8px] text-white">{t.badge}</span>}
            </button>
          ))}
        </div>
        {note && <div className="mb-2 text-[14px] font-bold text-[#ffb09a]">{note}</div>}
        <div className="scroll-px min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === 'prod' && prodTab()}
          {tab === 'army' && armyTab()}
          {tab === 'fam' && famTab()}
          {tab === 'grave' && graveTab()}
          {tab === 'guests' && guestsTab()}
          {tab === 'hunt' && huntTab()}
          {tab === 'land' && landTab()}
        </div>
      </div>
    </div>
  );
}

function bowOrSpear(g: Game) {
  for (const w of ['bow', 'spear', 'club']) if (itemCount(g, w) > 0) return `(+${ITEMS[w].icon})`;
  return '';
}
