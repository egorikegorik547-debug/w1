
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BUILDINGS } from '../game/data';
import type { Game, Snapshot } from '../game/game';
import { RANKS, SPECS } from '../game/meta';
import { useUiScale } from './uiScale';
import { BRANCHES, BRANCH_BY_ID, TECHS as ALL_TECHS, TECH_BY_ID, techsFor, type BranchId, type TechDef } from '../game/techs';

const COLW = 112;
const ROWH = 82;
const PAD = 38;
const X0 = 470;
const HUB_X = 170;
const DONE = '#d23fe0';
const AVAIL = '#ffb347';
const PX = 'polygon(0 6px, 3px 6px, 3px 3px, 6px 3px, 6px 0, calc(100% - 6px) 0, calc(100% - 6px) 3px, calc(100% - 3px) 3px, calc(100% - 3px) 6px, 100% 6px, 100% calc(100% - 6px), calc(100% - 3px) calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) calc(100% - 3px), calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 3px), 3px calc(100% - 3px), 3px calc(100% - 6px), 0 calc(100% - 6px))';
const PX_IN = 'polygon(0 4px, 2px 4px, 2px 2px, 4px 2px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 2px, calc(100% - 2px) 2px, calc(100% - 2px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 2px) calc(100% - 4px), calc(100% - 2px) calc(100% - 2px), calc(100% - 4px) calc(100% - 2px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 2px), 2px calc(100% - 2px), 2px calc(100% - 4px), 0 calc(100% - 4px))';
const stepPath = (ax: number, ay: number, bx: number, by: number) => {
  const mx = Math.round((ax + bx) / 2 / 4) * 4;
  return `M${Math.round(ax)} ${Math.round(ay)} H${mx} V${Math.round(by)} H${Math.round(bx)}`;
};

interface Lane {
  id: BranchId;
  y: number;
  h: number;
  yc: number;
}

function makeLayout(TECHS: TechDef[]) {
  const pos: Record<string, { x: number; y: number }> = {};
  const lanes: Lane[] = [];
  let y = 30;
  let maxCol = 0;
  for (const t of TECHS) maxCol = Math.max(maxCol, t.col);
  for (const br of BRANCHES) {
    const ts = TECHS.filter((t) => t.branch === br.id).sort((a, b) => a.col - b.col);
    const rows: Record<string, number> = {};
    const occ = new Set<string>();
    let mn = 0;
    let mx = 0;
    for (const t of ts) {
      const par = t.req.map((r) => rows[r]).filter((v) => v !== undefined);
      const want = par.length ? Math.round(par.reduce((a, b) => a + b, 0) / par.length) : 0;
      let r = want;
      for (let k = 0; k < 24; k++) {
        const off = k === 0 ? 0 : k % 2 ? (k + 1) / 2 : -k / 2;
        if (!occ.has(`${t.col},${want + off}`)) {
          r = want + off;
          break;
        }
      }
      occ.add(`${t.col},${r}`);
      rows[t.id] = r;
      mn = Math.min(mn, r);
      mx = Math.max(mx, r);
    }
    const h = Math.max(230, (mx - mn + 1) * ROWH + PAD * 2);
    const top = y;
    for (const t of ts) pos[t.id] = { x: X0 + t.col * COLW, y: top + h / 2 + (rows[t.id] - (mn + mx) / 2) * ROWH };
    lanes.push({ id: br.id, y: top, h, yc: top + h / 2 });
    y += h;
  }
  const width = X0 + (maxCol + 1) * COLW + 520;
  return { pos, lanes, width, height: y + 30, maxCol };
}
void ALL_TECHS;

const isBig = (t: TechDef) => t.cost >= 700 || Object.values(BUILDINGS).some((b) => b.req === t.id) || !!t.extra;

export function TechTree({ game, snap, onClose }: { game: Game; snap: Snapshot; onClose: () => void }) {
  const done = useMemo(() => new Set(snap.done), [snap.done]);
  const boxRef = useRef<HTMLDivElement>(null);
  // интерфейс уменьшен через CSS zoom — координаты мыши нужно привести к масштабу содержимого
  const uiZ = useUiScale();
  const zRef = useRef(uiZ);
  zRef.current = uiZ;
  const [view, setView] = useState({ x: 0, y: 0, k: 0.6 });
  const [anim, setAnim] = useState(false);
  const [hov, setHov] = useState<string | null>(null);
  const [branch, setBranch] = useState<BranchId | 'all'>('all');
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);
  const spec = SPECS[snap.specId];
  const TECHS = useMemo(() => techsFor(snap.specId), [snap.specId]);
  const LAYOUT = useMemo(() => makeLayout(TECHS), [TECHS]);
  const { pos, lanes, width, height } = LAYOUT;
  const hubY = height / 2;

  const fitAll = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const k = Math.min(1.1, Math.max(0.3, Math.min(el.clientWidth / width, el.clientHeight / height) * 1.0));
    setAnim(true);
    setView({ k, x: (el.clientWidth - width * k) / 2, y: (el.clientHeight - height * k) / 2 });
  }, [width, height]);

  const focusLane = useCallback(
    (id: BranchId) => {
      const el = boxRef.current;
      if (!el) return;
      const lane = lanes.find((l) => l.id === id)!;
      const k = Math.min(1.0, Math.max(0.55, el.clientHeight / (lane.h + 260)));
      setAnim(true);
      setView({ k, x: 30 - (HUB_X - 60) * k, y: el.clientHeight / 2 - lane.yc * k });
    },
    [lanes],
  );

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const k = Math.min(0.85, Math.max(0.5, el.clientHeight / 900));
    // старт: вид на хаб и первые узлы — ближе к скриншоту
    setView({ k, x: 20 - (HUB_X - 80) * k, y: el.clientHeight / 2 - hubY * k });
  }, [hubY]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / zRef.current;
      const my = (e.clientY - r.top) / zRef.current;
      setAnim(false);
      setView((v) => {
        const k = Math.max(0.28, Math.min(1.5, v.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const f = k / v.k;
        return { k, x: mx - (mx - v.x) * f, y: my - (my - v.y) * f };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyQ' && e.code !== 'KeyE') return;
      const order: (BranchId | 'all')[] = ['all', ...BRANCHES.map((b) => b.id)];
      const i = order.indexOf(branch);
      const n = order[(i + (e.code === 'KeyE' ? 1 : -1) + order.length) % order.length];
      setBranch(n);
      if (n === 'all') fitAll();
      else focusLane(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [branch, fitAll, focusLane]);

  const edges = useMemo(() => {
    const out: { a: string; b: string; cross: boolean }[] = [];
    for (const t of TECHS) for (const r of t.req) out.push({ a: r, b: t.id, cross: TECH_BY_ID[r].branch !== t.branch });
    return out;
  }, [TECHS]);

  const hubTargets = useMemo(() => TECHS.filter((t) => t.req.length === 0), [TECHS]);
  const ht = hov ? TECH_BY_ID[hov] : null;
  const shown = ht ?? (snap.research ? TECH_BY_ID[snap.research.id] : null);

  const stat = (id: BranchId) => {
    const all = TECHS.filter((t) => t.branch === id);
    return { n: all.filter((t) => done.has(t.id)).length, total: all.length };
  };

  return (
    <div className="absolute inset-0 z-30 select-none overflow-hidden text-white" style={{ fontFamily: '"Pixelify Sans","Press Start 2P",monospace', background: '#140d08', imageRendering: 'pixelated' }}>
      {/* фон: пиксельная сетка */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 30% 40%, #2a1c12 0%, #1a110a 60%, #0e0805 100%)' }} />
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(#ffffff0a 2px, transparent 2px), linear-gradient(90deg, #ffffff0a 2px, transparent 2px)', backgroundSize: '16px 16px' }} />
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(#00000030 50%, transparent 50%)', backgroundSize: '4px 4px' }} />

      {/* полотно дерева */}
      <div
        ref={boxRef}
        className="absolute inset-x-0 top-[74px] bottom-[84px] cursor-grab overflow-hidden active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('[data-node]')) {
            drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
            return;
          }
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !(e.buttons & 1)) return;
          const dx = (e.clientX - d.sx) / uiZ;
          const dy = (e.clientY - d.sy) / uiZ;
          if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
          if (d.moved) {
            setAnim(false);
            setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
          }
        }}
        onPointerUp={() => {
          setTimeout(() => (drag.current = null), 0);
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: '0 0', transition: anim ? 'transform 0.5s cubic-bezier(.2,.8,.2,1)' : 'none' }}>
          {/* полосы веток */}
          {lanes.map((l, i) => {
            const br = BRANCH_BY_ID[l.id];
            const st = stat(l.id);
            const disc = spec.discount[l.id] ?? 1;
            const active = branch === l.id;
            return (
              <div key={l.id}>
                <div className="absolute" style={{ left: 0, top: l.y, width, height: l.h, background: i % 2 ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.12)', borderTop: '1px solid rgba(255,255,255,0.05)', outline: active ? `1px solid ${br.color}55` : 'none' }} />
                <div
                  className="absolute overflow-hidden"
                  style={{ left: X0 + (TECHS.reduce((m, t) => Math.max(m, t.col), 0) + 1) * COLW + 20, top: l.y + 18, width: 440, height: l.h - 36, background: `linear-gradient(90deg, transparent 0%, ${br.color}22 55%, ${br.color}3a 100%)`, borderRight: `3px solid ${br.color}` }}
                >
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-[0.16]" style={{ fontSize: 190, lineHeight: 1 }}>
                    {br.icon}
                  </div>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-right">
                    <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2, color: '#e9e9ee', textTransform: 'uppercase', lineHeight: 1 }}>{br.name}</div>
                    <div style={{ fontSize: 18, color: '#9a9aa6', marginTop: 4 }}>{br.sub}</div>
                    <div style={{ fontSize: 17, marginTop: 10, color: br.color, fontWeight: 600 }}>
                      Изучено {st.n}/{st.total}
                      {disc !== 1 && <span style={{ color: disc < 1 ? '#7dff8c' : '#ff8a7a', marginLeft: 12 }}>цена {disc < 1 ? '−' : '+'}{Math.abs(Math.round((1 - disc) * 100))}%</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* линии */}
          <svg className="pointer-events-none absolute left-0 top-0" width={width} height={height}>
            {hubTargets.map((t) => {
              const p = pos[t.id];
              const on = done.has(t.id);
              return <path key={`h${t.id}`} d={stepPath(HUB_X + 70, hubY, p.x, p.y)} fill="none" shapeRendering="crispEdges" strokeLinejoin="miter" stroke={on ? DONE : '#6a5a48'} strokeWidth={on ? 6 : 4} opacity={on ? 1 : 0.8} />;
            })}
            {edges.map((e, i) => {
              const a = pos[e.a];
              const b = pos[e.b];
              const both = done.has(e.a) && done.has(e.b);
              const open = done.has(e.a) && !done.has(e.b);
              const hot = hov === e.a || hov === e.b;
              const stroke = hot ? '#ffffff' : both ? DONE : open ? AVAIL : '#5a4a3a';
              return <path key={i} d={stepPath(a.x, a.y, b.x, b.y)} fill="none" shapeRendering="crispEdges" strokeLinejoin="miter" stroke={stroke} strokeWidth={hot ? 6 : both ? 6 : 4} strokeDasharray={e.cross && !both ? '8 8' : undefined} opacity={hot ? 1 : e.cross && !both && !open ? 0.3 : both ? 1 : 0.75} />;
            })}
          </svg>

          {/* хаб */}
          <div className="absolute flex items-center justify-center" style={{ left: HUB_X - 70, top: hubY - 70, width: 140, height: 140, background: 'repeating-conic-gradient(#3b2a14 0 25%, #2a1c0e 0 50%) 0 0/16px 16px', clipPath: PX, padding: 8 }}>
            <div className="flex h-full w-full items-center justify-center" style={{ background: '#1a0f06', clipPath: PX_IN, boxShadow: 'inset 0 0 0 4px #f3a22c' }}>
              <div style={{ fontSize: 62, filter: 'drop-shadow(0 4px 0 #000)' }}>{spec.icon}</div>
            </div>
          </div>
          <div className="pointer-events-none absolute" style={{ left: HUB_X - 80, top: hubY - 80, width: 160, height: 160, border: '4px dashed #f3a22c88' }} />
          <div className="absolute text-center" style={{ left: HUB_X - 140, top: hubY + 88, width: 280 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#ffd9a0', textTransform: 'uppercase', letterSpacing: 1, textShadow: '3px 3px 0 #000' }}>{spec.name}</div>
            <div style={{ fontSize: 17, color: '#9a9aa6' }}>Древо знаний «{snap.name}»</div>
          </div>

          {/* узлы */}
          {TECHS.map((t) => {
            const p = pos[t.id];
            const isDone = done.has(t.id);
            const avail = !isDone && t.req.every((r) => done.has(r));
            const active = snap.research?.id === t.id;
            const big = isBig(t);
            const size = big ? 66 : 48;
            const cost = snap.costs[t.id] ?? t.cost;
            const prog = isDone ? cost : snap.progress[t.id] ?? 0;
            const pct = Math.min(100, (prog / cost) * 100);
            const ring = isDone ? DONE : active ? 'transparent' : avail ? AVAIL : '#5b5b63';
            const br = BRANCH_BY_ID[t.branch];
            return (
              <div key={t.id} className="absolute" style={{ left: p.x - size / 2, top: p.y - size / 2, width: size, height: size }}>
                <button
                  data-node
                  onMouseEnter={() => setHov(t.id)}
                  onMouseLeave={() => setHov((h) => (h === t.id ? null : h))}
                  onClick={() => {
                    if (drag.current?.moved) return;
                    setHov(t.id);
                    if (avail && !active) game.startResearch(t.id);
                  }}
                  className={`absolute inset-0 ${avail && !active ? 'tt-pulse-px' : ''}`}
                  style={{
                    padding: 4,
                    background: active ? '#ffd24a' : ring === 'transparent' ? '#ffd24a' : ring,
                    clipPath: PX,
                    filter: isDone ? `drop-shadow(0 0 4px ${DONE})` : active ? 'drop-shadow(0 0 6px #ffd24a)' : avail ? `drop-shadow(0 0 5px ${AVAIL}aa)` : 'none',
                    cursor: avail && !active ? 'pointer' : 'default',
                  }}
                >
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden" style={{ clipPath: PX_IN, background: isDone ? `linear-gradient(${br.color}66, #24122c)` : avail || active ? 'linear-gradient(#4a3524, #2a1c12)' : 'linear-gradient(#2c241e, #17120e)', boxShadow: 'inset 0 -4px 0 #0006, inset 0 3px 0 #ffffff22' }}>
                    {active && <div className="absolute inset-x-0 bottom-0" style={{ height: `${pct}%`, background: 'repeating-linear-gradient(0deg, #ffd24acc 0 4px, #ffb347cc 4px 8px)' }} />}
                    <span className="relative" style={{ fontSize: size * 0.44, lineHeight: 1, filter: isDone || avail || active ? 'drop-shadow(0 2px 0 #000)' : 'grayscale(1) brightness(0.8)', opacity: isDone || avail || active ? 1 : 0.5 }}>{t.icon}</span>
                  </div>
                </button>
                {isDone && (
                  <span className="pointer-events-none absolute z-10 flex items-center justify-center" style={{ right: -4, top: -4, width: 16, height: 16, background: DONE, boxShadow: '0 0 0 2px #000', fontSize: 9, fontFamily: '"Press Start 2P",monospace', color: '#fff' }}>✓</span>
                )}
                {big && (
                  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center" style={{ top: size + 5, fontSize: 14, fontWeight: 600, color: isDone ? '#e7a6f0' : avail ? '#ffd9a0' : '#8a7a68', textShadow: '2px 2px 0 #000, -1px -1px 0 #000' }}>
                    {t.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* верхняя панель */}
      <div className="absolute inset-x-0 top-0 h-[72px]" style={{ background: 'linear-gradient(#3b291c, #2b1d14)', boxShadow: '0 4px 0 #0f0906, inset 0 -4px 0 #8a6038, inset 0 -8px 0 #1d130c' }}>
        <div className="flex h-full items-center justify-between gap-4 px-6">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-[#8a6038] bg-[#1a110a] text-[26px]">{spec.icon}</div>
            <div className="leading-tight">
              <div style={{ fontSize: 22, fontWeight: 700 }}>{snap.name}</div>
              <div style={{ fontSize: 14, color: '#b8b8c4' }}>
                {RANKS[snap.tierIdx].name.toUpperCase()} · {spec.name.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-hidden">
            <Key k="Q" />
            <Tab active={branch === 'all'} onClick={() => { setBranch('all'); fitAll(); }}>
              ВСЕ
            </Tab>
            {BRANCHES.map((b) => (
              <Tab key={b.id} active={branch === b.id} color={b.color} onClick={() => { setBranch(b.id); focusLane(b.id); }}>
                <span className="mr-1">{b.icon}</span>
                <span className="hidden 2xl:inline">{b.name.toUpperCase()}</span>
              </Tab>
            ))}
            <Key k="E" />
          </div>
          <button onClick={onClose} className="flex shrink-0 items-center justify-end gap-2" style={{ fontSize: 18, fontWeight: 600, color: '#f3a22c' }}>
            ЗАКРЫТЬ <Key k="ESC" />
          </button>
        </div>
      </div>

      {/* нижняя панель */}
      <div className="absolute inset-x-0 bottom-0 h-[84px]" style={{ background: 'linear-gradient(#2b1d14, #1f150e)', boxShadow: '0 -4px 0 #0f0906, inset 0 4px 0 #8a6038, inset 0 8px 0 #1d130c' }}>
        <div className="flex h-full items-center justify-between gap-6 px-8">
          <div className="flex items-center gap-4">
            <div style={{ fontSize: 44, lineHeight: 1 }}>💡</div>
            <div className="leading-none">
              <div style={{ fontSize: 44, fontWeight: 700, color: '#f3a22c', letterSpacing: 2 }}>{String(snap.know).padStart(2, '0')}</div>
              <div style={{ fontSize: 15, color: '#9a9aa6', marginTop: 2 }}>Знания · +{snap.knowRate.toFixed(1)}/с · изучено {snap.done.length}/{TECHS.length}</div>
            </div>
          </div>
          <div className="hidden flex-1 items-center justify-center gap-6 md:flex" style={{ fontSize: 15, color: '#9a9aa6' }}>
            <span>
              <b className="text-white">Колесо</b> — масштаб
            </span>
            <span>
              <b className="text-white">Перетаскивание</b> — двигать
            </span>
            <span>
              <b className="text-white">Клик</b> — изучить
            </span>
            <span className="flex items-center gap-2">
              <i className="inline-block h-3 w-3" style={{ background: DONE, boxShadow: '0 0 0 2px #000' }} /> изучено
              <i className="ml-2 inline-block h-3 w-3" style={{ background: AVAIL, boxShadow: '0 0 0 2px #000' }} /> доступно
              <i className="ml-2 inline-block h-3 w-3 bg-[#5b5b63]" style={{ boxShadow: '0 0 0 2px #000' }} /> закрыто
            </span>
          </div>
          <div className="flex min-w-[240px] items-center justify-end gap-3 text-right">
            {snap.research ? (
              <div>
                <div style={{ fontSize: 14, color: '#9a9aa6' }}>ИЗУЧАЕТСЯ</div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{TECH_BY_ID[snap.research.id].name}</div>
                <div className="mt-1 h-3 w-[220px] bg-[#0f0906]" style={{ boxShadow: '0 0 0 2px #000, inset 0 0 0 2px #5a3e26' }}>
                  <div className="h-full" style={{ width: `${Math.min(100, (snap.research.progress / snap.research.cost) * 100)}%`, background: 'repeating-linear-gradient(90deg,#f3a22c 0 6px,#ffd24a 6px 10px)' }} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 16, color: '#ffd9a0' }}>Выберите технологию для изучения</div>
            )}
          </div>
        </div>
      </div>

      {/* подсказка */}
      {shown && <Tooltip t={shown} snap={snap} done={done} />}
    </div>
  );
}

function Key({ k }: { k: string }) {
  return <span className="mx-1 bg-[#1a110a] px-1.5 text-[11px] font-bold leading-[18px] text-[#ffe9a8]" style={{ boxShadow: '0 0 0 2px #8a6038, 0 3px 0 2px #0f0906', fontFamily: '"Press Start 2P",monospace' }}>{k}</span>;
}

function Tab({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="whitespace-nowrap px-2.5 py-1 transition-colors" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, color: active ? '#fff' : '#a89070', background: active ? '#4a321e' : 'transparent', boxShadow: active ? `inset 0 -4px 0 ${color ?? '#f3a22c'}, 0 0 0 2px #0f0906` : 'none', textShadow: '2px 2px 0 #000' }}>
      {children}
    </button>
  );
}

function Tooltip({ t, snap, done }: { t: TechDef; snap: Snapshot; done: Set<string> }) {
  const br = BRANCH_BY_ID[t.branch];
  const cost = snap.costs[t.id] ?? t.cost;
  const isDone = done.has(t.id);
  const prog = isDone ? cost : snap.progress[t.id] ?? 0;
  const avail = !isDone && t.req.every((r) => done.has(r));
  const disc = SPECS[snap.specId].discount[t.branch] ?? 1;
  return (
    <div className="pointer-events-none absolute right-6 top-[92px] z-10 w-[340px] p-4" style={{ background: 'linear-gradient(#3b291c, #251912)', boxShadow: `0 0 0 3px #0f0906, inset 0 0 0 3px #8a6038, inset 0 0 0 6px #1d130c, 0 6px 0 3px #0008`, padding: 18 }}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center border-4 text-[30px]" style={{ borderColor: isDone ? DONE : avail ? AVAIL : '#5b5b63', background: '#1a110a' }}>
          {t.icon}
        </div>
        <div className="leading-tight">
          <div style={{ fontSize: 24, fontWeight: 700 }}>{t.name}</div>
          <div style={{ fontSize: 14, color: br.color, fontWeight: 600 }}>
            {br.icon} {br.name.toUpperCase()}
          </div>
        </div>
      </div>
      <div className="mt-3" style={{ fontSize: 16, color: '#b8b8c4', lineHeight: 1.2 }}>
        {t.desc}
      </div>
      <div className="mt-3 border-t border-white/10 pt-2" style={{ fontSize: 16, color: '#9affaa', lineHeight: 1.25, fontWeight: 600 }}>
        {t.effect.split(' · ').map((e) => (
          <div key={e}>◆ {e}</div>
        ))}
      </div>
      {t.life && (
        <div className="mt-2" style={{ fontSize: 15, color: '#ffd98a', lineHeight: 1.2 }}>
          👁 Изменит жизнь: {t.life}
        </div>
      )}
      {t.spec && (
        <div className="mt-2" style={{ fontSize: 14, color: '#c9a0ff', fontWeight: 700 }}>
          ★ Уникальное улучшение вашей специализации
        </div>
      )}
      {t.req.length > 0 && (
        <div className="mt-3" style={{ fontSize: 14, color: '#9a9aa6' }}>
          Требуется:{' '}
          {t.req.map((r) => (
            <span key={r} className="mr-2 whitespace-nowrap" style={{ color: done.has(r) ? '#7dff8c' : '#ff8a7a' }}>
              {done.has(r) ? '✔' : '✖'} {TECH_BY_ID[r].name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between" style={{ fontSize: 17, fontWeight: 700 }}>
        <span style={{ color: '#f3a22c' }}>
          💡 {Math.floor(prog)}/{cost}
          {disc !== 1 && (
            <span style={{ fontSize: 13, marginLeft: 8, color: disc < 1 ? '#7dff8c' : '#ff8a7a' }}>
              (было {t.cost})
            </span>
          )}
        </span>
        <span style={{ color: isDone ? DONE : avail ? AVAIL : '#7a7a84' }}>{isDone ? 'ИЗУЧЕНО' : avail ? 'КЛИК — ИЗУЧИТЬ' : 'ЗАКРЫТО'}</span>
      </div>
    </div>
  );
}
