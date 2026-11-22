
import { useEffect, useRef, useState } from 'react';
import { BUILDINGS, BUILD_ORDER, RES_INFO, type AllRes, type BuildingId } from '../game/data';
import * as dev from '../game/dev';
import type { DevFlags, Game, Snapshot } from '../game/game';
import { GOVS, GOV_ORDER, SPECS, SPEC_ORDER } from '../game/meta';
import { TECHS } from '../game/techs';

type Tab = 'res' | 'people' | 'tech' | 'world' | 'cheats' | 'info';
const TABS: { id: Tab; icon: string; name: string }[] = [
  { id: 'res', icon: '💰', name: 'Ресурсы' },
  { id: 'people', icon: '👥', name: 'Люди' },
  { id: 'tech', icon: '💡', name: 'Наука' },
  { id: 'world', icon: '🌍', name: 'Мир' },
  { id: 'cheats', icon: '🎮', name: 'Читы' },
  { id: 'info', icon: 'ℹ️', name: 'Инфо' },
];

const FLAGS: { k: keyof DevFlags; name: string; hint: string }[] = [
  { k: 'infinite', name: 'Бесконечные ресурсы', hint: 'Все запасы держатся на 9999' },
  { k: 'freeBuild', name: 'Бесплатные постройки', hint: 'Здания ничего не стоят' },
  { k: 'instaBuild', name: 'Мгновенная стройка', hint: 'Здания строятся сразу' },
  { k: 'instaResearch', name: 'Мгновенные технологии', hint: 'Изучение завершается сразу' },
  { k: 'noHunger', name: 'Нет голода', hint: 'Еда не расходуется' },
  { k: 'noRaids', name: 'Нет набегов', hint: 'Соседи не нападают' },
  { k: 'noCap', name: 'Без лимита складов', hint: 'Ресурсы не обрезаются' },
  { k: 'superWork', name: 'Супер-работники ×3', hint: 'Рубка, добыча и стройка втрое быстрее' },
  { k: 'alwaysDay', name: 'Вечный день', hint: 'Ночь не наступает' },
  { k: 'godArmy', name: 'Армия ×20', hint: 'Сила атаки и обороны ×20' },
];

function Btn({ children, onClick, tone }: { children: React.ReactNode; onClick: () => void; tone?: 'green' | 'red' | 'gold' }) {
  return (
    <button onClick={onClick} className={`px-btn ${tone === 'green' ? 'px-btn-green text-white' : tone === 'red' ? 'px-btn-red' : tone === 'gold' ? 'px-btn-gold' : ''} px-2 py-1 text-[12px] font-bold`}>
      {children}
    </button>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-inset flex flex-col gap-1.5 p-2">
      <div className="text-[11px] font-bold tracking-widest text-[#ffcf6a] uppercase">{title}</div>
      {children}
    </div>
  );
}

export function DevPanel({ game, snap, onClose }: { game: Game; snap: Snapshot; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('res');
  const [fps, setFps] = useState(0);
  const [bType, setBType] = useState<BuildingId>('house');
  const frames = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      frames.current++;
      if (t - last >= 500) {
        setFps(Math.round((frames.current * 1000) / (t - last)));
        frames.current = 0;
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const flag = (k: keyof DevFlags, v: boolean | number) => {
    (game.dev as unknown as Record<string, boolean | number>)[k] = v;
    game.emit(true);
  };

  const resKeys: AllRes[] = ['wood', 'stone', 'food', 'goods', 'gold', 'know'];

  return (
    <div className="px-panel pointer-events-auto absolute top-[88px] right-2 bottom-[215px] z-20 flex w-[min(390px,94vw)] flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[11px] text-[#7dff8c]">🛠 DEV</span>
        <span className="text-[12px] text-[#a08868]">FPS {fps}</span>
        <button onClick={onClose} className="px-btn px-btn-red px-2 py-0.5 text-[13px] font-bold">
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-btn px-2 py-1 text-[12px] font-bold ${tab === t.id ? 'active' : ''}`}>
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      <div className="scroll-px flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {tab === 'res' && (
          <>
            {resKeys.map((k) => (
              <Sec key={k} title={`${RES_INFO[k].icon} ${RES_INFO[k].name} · ${k === 'know' ? snap.know : snap.res[k]}`}>
                <div className="flex flex-wrap gap-1">
                  {[10, 100, 1000, 10000].map((n) => (
                    <Btn key={n} onClick={() => dev.devGive(game, k, n)}>
                      +{n}
                    </Btn>
                  ))}
                  <Btn onClick={() => dev.devGive(game, k, -100)} tone="red">
                    −100
                  </Btn>
                  <Btn onClick={() => dev.devGive(game, k, -(k === 'know' ? snap.know : snap.res[k]))} tone="red">
                    =0
                  </Btn>
                </div>
              </Sec>
            ))}
            <Sec title="Все ресурсы сразу">
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devGiveAll(game, 500)} tone="green">
                  Всем +500
                </Btn>
                <Btn onClick={() => dev.devGiveAll(game, 5000)} tone="green">
                  Всем +5000
                </Btn>
                <Btn onClick={() => dev.devSetAll(game, 0)} tone="red">
                  Обнулить
                </Btn>
              </div>
            </Sec>
            <Sec title="Цены рынка">
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devPrices(game, 0.5)}>×0.5</Btn>
                <Btn onClick={() => dev.devPrices(game, 1)}>Норма</Btn>
                <Btn onClick={() => dev.devPrices(game, 2)}>×2</Btn>
                <Btn onClick={() => ((game.tax = 0), game.emit(true))}>Налог 0</Btn>
                <Btn onClick={() => ((game.tax = 2), game.emit(true))}>Налог выс.</Btn>
              </div>
            </Sec>
          </>
        )}

        {tab === 'people' && (
          <>
            <Sec title={`Население · ${snap.pop} (дети ${snap.kids}) · свободных ${snap.idleCount}`}>
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devSpawn(game, 1)} tone="green">+1 чел.</Btn>
                <Btn onClick={() => dev.devSpawn(game, 5)} tone="green">+5</Btn>
                <Btn onClick={() => dev.devSpawn(game, 20)} tone="green">+20</Btn>
                <Btn onClick={() => dev.devSpawn(game, 5, true)}>+5 детей</Btn>
                <Btn onClick={() => dev.devGrowKids(game)}>Вырастить детей</Btn>
                <Btn onClick={() => dev.devKillIdle(game)} tone="red">Убрать 5 свободных</Btn>
              </div>
            </Sec>
            <Sec title="Жильё и здания">
              <div className="flex flex-wrap gap-1">
                <select value={bType} onChange={(e) => setBType(e.target.value as BuildingId)} className="px-inset px-1 py-1 text-[13px] text-[#ffe9a8]">
                  {BUILD_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {BUILDINGS[id].name}
                    </option>
                  ))}
                </select>
                <Btn onClick={() => dev.devHousing(game, bType, 1)}>+1</Btn>
                <Btn onClick={() => dev.devHousing(game, bType, 5)}>+5</Btn>
                <Btn onClick={() => dev.devHousing(game, bType, 15)}>+15</Btn>
                <Btn onClick={() => dev.devFinishBuildings(game)} tone="green">Достроить все</Btn>
                <Btn onClick={() => dev.devClearBuildings(game)} tone="red">Снести всё</Btn>
              </div>
            </Sec>
            <Sec title={`Армия · ${snap.army} (лимит ${snap.armyCap})`}>
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devArmy(game, 5)} tone="green">+5</Btn>
                <Btn onClick={() => dev.devArmy(game, 25)} tone="green">+25</Btn>
                <Btn onClick={() => dev.devArmy(game, -snap.army)} tone="red">Распустить</Btn>
              </div>
            </Sec>
            <Sec title="Специализация">
              <div className="flex flex-wrap gap-1">
                {SPEC_ORDER.map((id) => (
                  <button key={id} onClick={() => dev.devSetSpec(game, id)} className={`px-btn px-2 py-1 text-[12px] font-bold ${snap.specId === id ? 'active' : ''}`}>
                    {SPECS[id].icon} {SPECS[id].name}
                  </button>
                ))}
              </div>
            </Sec>
            <Sec title="Форма правления">
              <div className="flex flex-wrap gap-1">
                {GOV_ORDER.map((id) => (
                  <button key={id} onClick={() => dev.devSetGov(game, id)} className={`px-btn px-2 py-1 text-[12px] font-bold ${snap.gov === id ? 'active' : ''}`}>
                    {GOVS[id].icon} {GOVS[id].rulerTitle}
                  </button>
                ))}
              </div>
            </Sec>
          </>
        )}

        {tab === 'tech' && (
          <>
            <Sec title={`Технологии · ${snap.done.length}/${TECHS.length}`}>
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devUnlockAllTech(game)} tone="green">Изучить все</Btn>
                <Btn onClick={() => dev.devFinishResearch(game)}>Завершить текущую</Btn>
                <Btn onClick={() => dev.devResetTech(game)} tone="red">Сбросить</Btn>
              </div>
            </Sec>
            <Sec title="Скорость изучения">
              <div className="flex flex-wrap gap-1">
                {[1, 5, 20, 100].map((n) => (
                  <button key={n} onClick={() => flag('researchMult', n)} className={`px-btn px-2 py-1 text-[12px] font-bold ${snap.dev.researchMult === n ? 'active' : ''}`}>
                    ×{n}
                  </button>
                ))}
              </div>
            </Sec>
            <Sec title="Цели">
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devCompleteQuests(game)}>Отметить все цели</Btn>
              </div>
            </Sec>
          </>
        )}

        {tab === 'world' && (
          <>
            <Sec title={`Время · день ${snap.day}`}>
              <div className="flex flex-wrap gap-1">
                {[
                  ['🌅 6:00', 6],
                  ['☀️ 12:00', 12],
                  ['🌇 18:00', 18],
                  ['🌙 0:00', 0],
                ].map(([l, h]) => (
                  <Btn key={l as string} onClick={() => dev.devSetHour(game, h as number)}>
                    {l}
                  </Btn>
                ))}
                <Btn onClick={() => dev.devSkipDays(game, 1)}>+1 день</Btn>
                <Btn onClick={() => dev.devSkipDays(game, 5)}>+5 дней</Btn>
              </div>
            </Sec>
            <Sec title="Скорость симуляции">
              <div className="flex flex-wrap gap-1">
                {[1, 4, 8, 16].map((n) => (
                  <button key={n} onClick={() => flag('speedMult', n)} className={`px-btn px-2 py-1 text-[12px] font-bold ${snap.dev.speedMult === n ? 'active' : ''}`}>
                    ×{n}
                  </button>
                ))}
              </div>
            </Sec>
            <Sec title={`Селения (${snap.towns.length}) · ваших ${snap.provinces}`}>
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devAnnexAll(game)} tone="green">Присоединить всех</Btn>
                <Btn onClick={() => dev.devAttitude(game, 100)}>Отношение 100</Btn>
                <Btn onClick={() => dev.devAttitude(game, 0)} tone="red">Отношение 0</Btn>
                <Btn onClick={() => dev.devRaid(game)} tone="red">Набег на вас</Btn>
              </div>
            </Sec>
            <Sec title="Карта">
              <div className="flex flex-wrap gap-1">
                <Btn onClick={() => dev.devCenterCamp(game)}>К стоянке</Btn>
                <Btn onClick={() => dev.devRegrow(game)}>Отрастить ягоды</Btn>
                <Btn onClick={() => game.setZoom(2)}>Зум 2</Btn>
                <Btn onClick={() => game.setZoom(3)}>Зум 3</Btn>
                <Btn onClick={() => game.setZoom(5)}>Зум 5</Btn>
              </div>
            </Sec>
          </>
        )}

        {tab === 'cheats' && (
          <>
            {FLAGS.map((f) => {
              const on = !!snap.dev[f.k];
              return (
                <button key={f.k} onClick={() => flag(f.k, !on)} title={f.hint} className={`px-card flex items-center gap-3 px-3 py-2 ${on ? 'sel' : ''}`}>
                  <span className={`flex h-5 w-9 items-center px-0.5 ${on ? 'justify-end bg-[#3a9a3a]' : 'justify-start bg-[#2a1d14]'}`} style={{ boxShadow: '0 0 0 2px #0f0906' }}>
                    <span className="h-4 w-4 bg-[#fff3d0]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-[#ffe9a8]">{f.name}</span>
                    <span className="block text-[12px] text-[#a08868]">{f.hint}</span>
                  </span>
                </button>
              );
            })}
          </>
        )}

        {tab === 'info' && (
          <>
            <Sec title="Состояние игры">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-[#e8d4a8]">
                <span>FPS: {fps}</span>
                <span>Время: {Math.floor(game.time)} с</span>
                <span>Юниты: {game.units.length}</span>
                <span>Здания: {game.buildings.length}</span>
                <span>Частицы: {game.particles.length}</span>
                <span>Селения: {game.towns.length}</span>
                <span>Карта: {game.world?.w}×{game.world?.h}</span>
                <span>Лимит склада: {snap.cap}</span>
                <span>Работы: 🪓{snap.workers.chop} 🫐{snap.workers.gather} ⛏{snap.workers.mine}</span>
                <span>Цеха: {snap.jobs.staffed}/{snap.jobs.total}</span>
              </div>
            </Sec>
            <Sec title="Модификаторы (итого)">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px] text-[#e8d4a8]">
                {Object.entries(game.mods).map(([k, v]) => (
                  <span key={k}>
                    {k}: <b className="text-[#ffe27a]">{Number.isInteger(v) ? v : v.toFixed(2)}</b>
                  </span>
                ))}
              </div>
            </Sec>
          </>
        )}
      </div>
    </div>
  );
}
