
import { useState } from 'react';
import { VolumePanel } from './MainMenu';
import { UI_SCALE_MAX, UI_SCALE_MIN } from './uiScale';

export const DEV_CODE = 'devel05';

interface Props {
  uiScale: number;
  setUiScale: (v: number) => void;
  vols: { m: number; s: number };
  setVols: (m: number, s: number) => void;
  devMode: boolean;
  onDevCode: (on: boolean) => void;
  onClose: () => void;
}

export function SettingsModal({ uiScale, setUiScale, vols, setVols, devMode, onDevCode, onClose }: Props) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = () => {
    const c = code.trim().toLowerCase();
    if (!c) return;
    if (c === DEV_CODE) {
      onDevCode(true);
      setMsg({ ok: true, text: 'Режим разработчика включён! Кнопка 🛠 появится в игре (или клавиша ` — тильда).' });
    } else setMsg({ ok: false, text: 'Неверный код.' });
    setCode('');
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="px-panel scroll-px flex max-h-[92vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-[14px] text-[#ffe9a8]">⚙ НАСТРОЙКИ</h2>
          <button onClick={onClose} className="px-btn px-btn-red font-pixel px-3 py-2 text-[10px]">
            ✕
          </button>
        </div>

        <VolumePanel vols={vols} setVols={setVols} />

        <section className="px-panel-dark flex flex-col gap-2.5 p-4">
          <div className="font-pixel text-[8px] text-[#ffcf6a]">🖥 РАЗМЕР ИНТЕРФЕЙСА</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={UI_SCALE_MIN * 100}
              max={UI_SCALE_MAX * 100}
              step={5}
              value={Math.round(uiScale * 100)}
              onChange={(e) => setUiScale(Number(e.target.value) / 100)}
              className="px-range min-w-0 flex-1"
            />
            <span className="font-pixel w-[44px] text-right text-[8px] text-[#ffcf6a]">{Math.round(uiScale * 100)}%</span>
          </div>
          <div className="text-[14px] text-[#c8b088]">
            Скрыть или показать интерфейс в игре — кнопка 👁 сверху или клавиша <b className="text-[#ffe9a8]">H</b>.
          </div>
        </section>

        <section className="px-panel-dark flex flex-col gap-2 p-4">
          <div className="text-[12px] font-bold tracking-widest text-[#ffcf6a]">🔑 СЕКРЕТНЫЙ КОД</div>
          <div className="text-[14px] text-[#c8b088]">Если вы знаете код — введите его, чтобы открыть скрытые возможности.</div>
          <form
            className="flex items-stretch gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setMsg(null);
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="Введите код…"
              className="px-inset min-w-0 flex-1 px-3 py-2.5 text-[18px] tracking-widest text-[#ffe9a8] outline-none"
            />
            <button type="submit" className="px-btn px-btn-gold px-4 text-[14px] font-bold">
              ОК
            </button>
          </form>
          {msg && <div className="text-[14px]" style={{ color: msg.ok ? '#8aff9a' : '#ff9a8a' }}>{msg.text}</div>}
          {devMode && (
            <div className="flex items-center justify-between gap-2 border-t border-[#5a3e26] pt-2">
              <span className="text-[14px] text-[#8aff9a]">🛠 Режим разработчика активен</span>
              <button onClick={() => (onDevCode(false), setMsg({ ok: true, text: 'Режим разработчика выключен.' }))} className="px-btn px-2.5 py-1.5 text-[13px] font-bold">
                Выключить
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
