
import { BIOME_MINI, BIOME_NAME } from '../game/data';
import { DIFFS, DIFF_ORDER, SOCIAL, type Difficulty } from '../game/social';
import { MAP_SIZES, MAP_TYPES, SETTLEMENT_DEFAULTS, SPECS, SPEC_ORDER, type MapSize, type MapType, type SpecId } from '../game/meta';

export interface Setup {
  name: string;
  spec: SpecId;
  size: MapSize;
  type: MapType;
  seed: string;
  diff: Difficulty;
}

export function randomName() {
  return SETTLEMENT_DEFAULTS[Math.floor(Math.random() * SETTLEMENT_DEFAULTS.length)];
}

interface Props {
  step: 'main' | 'setup';
  setStep: (s: 'main' | 'setup') => void;
  setup: Setup;
  setSetup: (s: Setup) => void;
  onSize: (s: MapSize) => void;
  onType: (t: MapType) => void;
  onStart: () => void;
  onReroll: () => void;
  onHelp: () => void;
  busy: boolean;
  audioOn: boolean;
  onUnlock: () => void;
  onSettings: () => void;
  devMode: boolean;
}

export function VolumePanel({ vols, setVols, compact }: { vols: { m: number; s: number }; setVols: (m: number, s: number) => void; compact?: boolean }) {
  const Row = ({ label, v, on }: { label: string; v: number; on: (n: number) => void }) => (
    <div className="flex items-center gap-3">
      <span className="font-pixel w-[110px] text-[8px] text-[#e8d4a8]">{label}</span>
      <input type="range" min={0} max={100} value={Math.round(v * 100)} onChange={(e) => on(Number(e.target.value) / 100)} className="px-range min-w-0 flex-1" />
      <span className="font-pixel w-[34px] text-right text-[8px] text-[#ffcf6a]">{Math.round(v * 100)}</span>
    </div>
  );
  return (
    <div className={`flex flex-col gap-2.5 ${compact ? '' : 'px-panel-dark p-4'}`}>
      {!compact && <div className="font-pixel text-[8px] text-[#ffcf6a]">🔊 ЗВУК</div>}
      <Row label="МУЗЫКА" v={vols.m} on={(n) => setVols(n, vols.s)} />
      <Row label="ЭФФЕКТЫ" v={vols.s} on={(n) => setVols(vols.m, n)} />
    </div>
  );
}

function MapIcon({ type }: { type: MapType }) {
  const blobs: Record<MapType, [number, number, number][]> = {
    continent: [[32, 24, 19], [14, 40, 4], [52, 10, 3]],
    continents: [[16, 16, 11], [46, 18, 10], [30, 42, 10]],
    archipelago: [[12, 14, 6], [26, 22, 7], [42, 12, 5], [50, 30, 7], [20, 38, 6], [36, 42, 5], [8, 32, 4]],
    islands: [[14, 14, 5], [46, 22, 6], [24, 40, 5]],
  };
  return (
    <svg viewBox="0 0 64 52" className="h-[52px] w-[64px] shrink-0" style={{ imageRendering: 'pixelated', boxShadow: '0 0 0 2px #0f0906' }}>
      <rect width="64" height="52" fill="#1d6aa6" />
      {blobs[type].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r + 1.6} fill="#ecdca6" />
          <circle cx={x} cy={y} r={r} fill="#5fb046" />
          {r > 7 && <circle cx={x + 2} cy={y - 1} r={r * 0.45} fill="#468a39" />}
        </g>
      ))}
    </svg>
  );
}

export function MainMenu(p: Props) {
  const { setup, setSetup } = p;
  return (
    <div className="absolute inset-0 flex items-stretch bg-gradient-to-r from-[#0b0806f2] via-[#0b080677] to-transparent">
      {!p.audioOn && (
        <button onClick={p.onUnlock} className="px-btn px-btn-gold font-pixel pulse-px absolute top-4 right-4 z-10 px-4 py-3 text-[9px]">
          🔊 НАЖМИТЕ — ВКЛЮЧИТЬ МУЗЫКУ
        </button>
      )}

      {p.step === 'main' ? (
        <div className="flex w-full max-w-[640px] flex-col justify-center gap-7 p-6 pl-8 sm:pl-16">
          <div className="fade-up space-y-5">
            <div className="font-pixel text-[10px] tracking-[0.35em] text-[#ffcf6a]">★ СТРАТЕГИЯ ВЫЖИВАНИЯ ★</div>
            <h1 className="px-title text-[34px] leading-[1.25] sm:text-[52px]">
              ЗАРЯ
              <br />
              ПЛЕМЕНИ
            </h1>
            <p className="max-w-[480px] text-[17px] leading-snug text-[#f3e3c0]">
              Выберите специализацию, назовите селение и ведите его от хутора до великой державы: 120 технологий, торговля и заводы, войны, союзы и государственный строй.
            </p>
          </div>
          <div className="fade-up flex flex-col gap-4" style={{ animationDelay: '0.15s' }}>
            <button onClick={() => p.setStep('setup')} disabled={p.busy} className="px-btn px-btn-green font-pixel flex w-[320px] items-center justify-center gap-3 px-5 py-4 text-[14px] text-white">
              <span>▶</span> НОВАЯ ИГРА
            </button>
            <button onClick={p.onHelp} disabled={p.busy} className="px-btn font-pixel flex w-[320px] items-center justify-center gap-3 px-5 py-3 text-[11px]">
              <span>?</span> КАК ИГРАТЬ
            </button>
          </div>
          <div className="fade-up w-[320px]" style={{ animationDelay: '0.3s' }}>
            <button onClick={p.onSettings} className="px-btn font-pixel flex w-full items-center justify-center gap-3 px-5 py-3 text-[11px]">
              <span>⚙</span> НАСТРОЙКИ
              {p.devMode && <span className="text-[8px] text-[#7dff8c]">🛠 DEV</span>}
            </button>
          </div>
          <div className="fade-up flex max-w-[560px] flex-wrap gap-x-4 gap-y-2" style={{ animationDelay: '0.45s' }}>
            {[3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-[#e8d4a8]">
                <span className="inline-block h-3 w-3" style={{ background: BIOME_MINI[i], boxShadow: '0 0 0 2px #0f0906' }} />
                {BIOME_NAME[i]}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="scroll-px flex h-full w-full max-w-[860px] flex-col gap-5 overflow-y-auto bg-[#0b0806d8] p-5 pl-6 sm:pl-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="px-title text-[18px] sm:text-[24px]">НОВАЯ ИГРА</h2>
            <button onClick={() => p.setStep('main')} className="px-btn font-pixel px-3 py-2 text-[9px]">
              ← НАЗАД
            </button>
          </div>

          <section className="px-panel-dark flex flex-col gap-2 p-4">
            <div className="font-pixel text-[8px] text-[#ffcf6a]">1 · НАЗВАНИЕ ПОСЕЛЕНИЯ</div>
            <div className="flex items-stretch gap-2">
              <input
                value={setup.name}
                maxLength={24}
                onChange={(e) => setSetup({ ...setup, name: e.target.value })}
                placeholder="Введите название…"
                className="px-inset min-w-0 flex-1 px-3 py-3 text-[20px] text-[#ffe9a8] outline-none"
              />
              <button onClick={() => setSetup({ ...setup, name: randomName() })} className="px-btn font-pixel px-3 text-[10px]" title="Случайное название">
                🎲
              </button>
            </div>
          </section>

          <section className="px-panel-dark flex flex-col gap-3 p-4">
            <div className="font-pixel text-[8px] text-[#ffcf6a]">2 · РАЗМЕР КАРТЫ</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MAP_SIZES.map((s) => (
                <button key={s.id} disabled={p.busy} onClick={() => p.onSize(s.id)} className={`px-card px-3 py-3 ${setup.size === s.id ? 'sel' : ''}`}>
                  <div className="font-pixel text-[10px] text-[#ffe9a8]">{s.name.toUpperCase()}</div>
                  <div className="mt-1.5 text-[14px] text-[#e8d4a8]">
                    {s.n}×{s.n} · соседей: {s.towns}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="px-panel-dark flex flex-col gap-3 p-4">
            <div className="font-pixel text-[8px] text-[#ffcf6a]">3 · ТИП КАРТЫ</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MAP_TYPES.map((t) => (
                <button key={t.id} disabled={p.busy} onClick={() => p.onType(t.id)} className={`px-card flex items-center gap-3 p-3 ${setup.type === t.id ? 'sel' : ''}`}>
                  <MapIcon type={t.id} />
                  <div>
                    <div className="font-pixel text-[9px] text-[#ffe9a8]">
                      {t.icon} {t.name.toUpperCase()}
                    </div>
                    <div className="mt-1.5 text-[13px] leading-tight text-[#e8d4a8]">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="px-panel-dark flex flex-col gap-3 p-4">
            <div className="font-pixel text-[8px] text-[#ffcf6a]">4 · СПЕЦИАЛИЗАЦИЯ СЕЛЕНИЯ</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {SPEC_ORDER.map((id) => {
                const s = SPECS[id];
                return (
                  <button key={id} onClick={() => setSetup({ ...setup, spec: id })} className={`px-card p-3 ${setup.spec === id ? 'sel' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="px-inset flex h-11 w-11 shrink-0 items-center justify-center text-[24px]" style={{ boxShadow: `inset 0 0 0 2px ${s.color}` }}>
                        {s.icon}
                      </span>
                      <div className="font-pixel text-[10px]" style={{ color: s.color }}>
                        {s.name.toUpperCase()}
                      </div>
                    </div>
                    <div className="mt-2 text-[13px] leading-tight text-[#e8d4a8]">{s.desc}</div>
                    <div className="mt-1.5 text-[12px] leading-tight text-[#c9a0ff]">
                      ⛓ {SOCIAL[id].note}
                    </div>
                    <div className="mt-1 text-[12px] leading-tight text-[#ffd98a]">🏗 30 особых построек · ★ 12 уникальных улучшений</div>
                    <div className="mt-2 flex flex-col gap-0.5 text-[12px] leading-tight">
                      {s.strong.map((x) => (
                        <span key={x} className="text-[#9affaa]">
                          ＋ {x}
                        </span>
                      ))}
                      {s.weak.map((x) => (
                        <span key={x} className="text-[#ff9a8a]">
                          － {x}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="px-panel-dark flex flex-col gap-3 p-4">
            <div className="font-pixel text-[8px] text-[#ffcf6a]">5 · СЛОЖНОСТЬ ИГРЫ</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DIFF_ORDER.map((id) => {
                const d = DIFFS[id];
                return (
                  <button key={id} onClick={() => setSetup({ ...setup, diff: id })} className={`px-card p-3 ${setup.diff === id ? 'sel' : ''}`}>
                    <div className="font-pixel text-[10px] text-[#ffe9a8]">
                      {d.icon} {d.name.toUpperCase()}
                    </div>
                    <div className="mt-1.5 text-[13px] leading-tight text-[#e8d4a8]">{d.desc}</div>
                    <div className="mt-1.5 flex flex-col gap-0.5 text-[12px] leading-tight text-[#c8b088]">
                      {d.lines.map((l) => (
                        <span key={l}>• {l}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="px-panel-dark flex flex-col gap-2 p-4">
            <div className="font-pixel text-[8px] text-[#ffcf6a]">ЗЕРНО МИРА</div>
            <div className="flex items-stretch gap-2">
              <input
                value={setup.seed}
                onChange={(e) => setSetup({ ...setup, seed: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                className="px-inset font-pixel min-w-0 flex-1 px-3 py-2 text-[11px] text-[#ffe9a8] outline-none"
                inputMode="numeric"
              />
              <button onClick={p.onReroll} disabled={p.busy} className="px-btn font-pixel px-3 text-[10px]" title="Новый случайный мир">
                🎲
              </button>
            </div>
            <div className="text-[13px] text-[#c8b088]">Справа — предпросмотр вашего мира. Он меняется вместе с настройками.</div>
          </section>

          <button onClick={p.onStart} disabled={p.busy} className="px-btn px-btn-green font-pixel mb-6 flex items-center justify-center gap-3 px-5 py-4 text-[14px] text-white">
            <span>▶</span> НАЧАТЬ ИГРУ
          </button>
        </div>
      )}
    </div>
  );
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  const Key = ({ k }: { k: string }) => <span className="px-btn font-pixel mx-0.5 inline-block px-2 py-1 text-[9px]">{k}</span>;
  const Row = ({ k, t }: { k: React.ReactNode; t: string }) => (
    <div className="flex items-start gap-3 py-1.5">
      <div className="w-[170px] shrink-0">{k}</div>
      <div className="text-[15px] text-[#f3e3c0]">{t}</div>
    </div>
  );
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-4" onClick={onClose}>
      <div className="px-panel scroll-px max-h-[92vh] w-full max-w-[780px] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-pixel text-[14px] text-[#ffe9a8]">КАК ИГРАТЬ</h2>
          <button onClick={onClose} className="px-btn px-btn-red font-pixel px-3 py-2 text-[10px]">
            ✕
          </button>
        </div>
        <p className="mb-3 text-[16px] text-[#e8d4a8]">
          Вы ведёте небольшое селение. Собирайте ресурсы, изучайте технологии — и расширяйтесь: торгуйте, воюйте, присоединяйте соседей и создайте государство.
        </p>
        <div className="px-inset p-3">
          <Row k={<><Key k="ЛКМ" /> / рамка</>} t="Выбрать человека или нескольких. Клик по чужому селению — открыть дипломатию." />
          <Row k={<><Key k="K" /> <Key k="O" /></>} t="K — «Двор»: налоги, барщина и оброк, помещики, крепостные и рабы (по специализации), указы, наместники, перенос столицы. O — границы селений и государства." />
          <Row k={<Key k="ПКМ" />} t="Приказ: по дереву — рубить, по кусту — собирать ягоды, по камню — добывать, по стройке — строить, по земле — идти." />
          <Row k={<><Key k="Q" /> <Key k="E" /> <Key k="R" /></>} t="Сначала ВЫБЕРИТЕ людей (клик, рамка, G — все, F — свободные), затем приказ: Q — рубить, E — ягоды, R — камень, обведя цели рамкой. X — стоп." />
          <Row k={<><Key k="B" /> Строить</>} t="Выберите здание, ЛКМ — поставить. Здания открываются технологиями." />
          <Row k={<><Key k="T" /> Знания</>} t="Дерево из 120 технологий, 9 веток. Колесо — масштаб, перетаскивание — сдвиг." />
          <Row k={<><Key k="M" /> Экономика</>} t="Баланс ресурсов, налоги, рынок и цепочка производства: сырьё → товары → инструменты, здания и армия." />
          <Row k={<><Key k="J" /> Авто</>} t="Автоматически раздать свободным людям работу. Вручную — панель «Работа племени» слева внизу (+/−)." />
          <Row k={<><Key k="N" /> Жизнь</>} t="Мастерские и кузницы (заказ предметов, оружие открывается технологиями), войско и снаряжение, династии жителей, кладбище, странники и охота." />
          <Row k={<><Key k="L" /> Земли</>} t="Захват пустых земель у своих границ. Боты тоже занимают землю, строить на чужой нельзя." />
          <Row k={<><Key k="V" /> Война</>} t="Мир и война: обучение воинов, дипломатия, походы, форма правления." />
          <Row k={<><Key k="W A S D" /></>} t="Камера (также стрелки, средняя кнопка мыши, миникарта)." />
          <Row k={<><Key k="G" /> <Key k="F" /> <Key k="X" /></>} t="Выбрать всех · выбрать свободных · остановить." />
          <Row k={<><Key k="Пробел" /> <Key k="1" /><Key k="2" /><Key k="3" /></>} t="Пауза и скорость игры." />
        </div>
        <div className="mt-3 space-y-2 text-[15px] text-[#e8d4a8]">
          <p>
            <b className="text-[#ffcf6a]">Специализация</b> даёт скидку на технологии «родных» веток и бонусы, но замедляет остальные. Воины — единственные, кто умеет <b>разорять</b> чужие селения.
          </p>
          <p>
            <b className="text-[#ffcf6a]">Война:</b> постройте казарму (технология «Копья»), обучите воинов и отправьте их в поход. Победа в бою даёт <b>захват</b> селения; дипломатия — <b>мирное присоединение</b> за золото.
          </p>
          <p>
            <b className="text-[#ffcf6a]">Государство:</b> когда вы объединяете несколько селений, образуется государство — выберите монархию (абсолютную или конституционную) или республику (парламентскую или президентскую). Следите за лояльностью провинций.
          </p>
          <p>
            <b className="text-[#ffcf6a]">Экономика:</b> свободные жители работают в цехах (мастерская, литейная, завод) и делают <b>товары</b>. Товары дают +20% к скорости работ, нужны для зданий и воинов и продаются на рынке. За содержание зданий и армии платится золото, налоги влияют на рождаемость и лояльность. Лимит складов — по каждому ресурсу.
          </p>
          <p>
            <b className="text-[#ffcf6a]">Заводчане</b> — новая специализация: выпуск товаров +50%, завод доступен уже с «Железом».
          </p>
          <p>
            <b className="text-[#ffcf6a]">Рост:</b> хутор → деревня → посёлок → село → городок → город → крупный город → мегаполис.
          </p>
        </div>
      </div>
    </div>
  );
}
