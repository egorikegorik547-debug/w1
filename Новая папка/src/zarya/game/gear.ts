import type { Game, Unit } from './game';

/**
 * Снаряжение людей: улучшения реально меняют внешний вид.
 * Рисуется поверх спрайта человека (16×20, начало в левом верхнем углу).
 */
export function hasCart(g: Game, u: Unit): boolean {
  return u.carry.n > 0 && u.role === 'none' && (u.carry.type === 'wood' || u.carry.type === 'stone') && (g.done.has('wheel') || g.done.has('mine_carts'));
}
export function hasBasketLoad(g: Game, u: Unit): boolean {
  return u.carry.n > 0 && u.carry.type === 'food' && g.done.has('baskets') && u.role === 'none';
}

export function drawGear(ctx: CanvasRenderingContext2D, g: Game, u: Unit, ox: number, oy: number, dir: number, working: boolean) {
  const rc = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(ox + x, oy + y, w, h);
  };
  const d = g.done;
  const kid = u.child;
  const t = g.waterT;
  // ── особые сословия ──
  if (u.role === 'guard') {
    rc(5, 0, 6, 3, '#9aa0b0');
    rc(4, 2, 8, 1, '#6a7080');
    rc(7, -2, 2, 2, u.accent ?? '#c03030');
    const sx = dir === 3 ? 2 : 13;
    rc(sx, 1, 1, 17, '#8a6a3a');
    rc(sx - 1, -1, 3, 3, '#d8dce8');
    rc(dir === 3 ? 11 : 2, 9, 3, 5, u.accent ?? '#c03030');
    rc(dir === 3 ? 11 : 2, 9, 3, 1, '#e8e8f0');
    return;
  }
  if (u.role === 'folk') {
    rc(4, 12, 8, 1, u.accent ?? '#c8a04a');
    if (u.id % 3 === 0) rc(5, 1, 6, 1, u.accent ?? '#c8a04a');
    return;
  }
  if (u.status === 'slave') {
    rc(4, 8, 8, 4, '#6a6258');
    rc(5, 9, 1, 1, '#8a8478');
    rc(9, 11, 1, 1, '#4a463e');
    rc(6, 7, 4, 1, '#9a9aa6');
    rc(5, 19, 2, 1, '#8a8a96');
    rc(9, 19, 2, 1, '#8a8a96');
    rc(7, 19, 2, 1, '#5a5a66');
  } else if (u.status === 'serf') {
    rc(4, 8, 8, 5, '#7a6a4c');
    rc(4, 12, 8, 1, '#4a3a22');
    rc(5, 1, 6, 2, '#6a5a3a');
    rc(4, 2, 8, 1, '#4a3a22');
  }
  if (u.role === 'lord') {
    rc(5, 0, 6, 2, '#ffd45a');
    rc(5, -1, 1, 1, '#ffd45a');
    rc(7, -1, 2, 1, '#ffd45a');
    rc(10, -1, 1, 1, '#ffd45a');
    rc(7, 0, 1, 1, '#d83a3a');
    rc(dir === 2 ? 3 : dir === 3 ? 11 : 3, 7, 2, 9, '#7a2a8a');
    rc(4, 12, 8, 1, '#ffd45a');
    rc(4, 8, 8, 1, '#ffd45a');
    return;
  }
  if (kid) return;
  const bronze = d.has('bronze');
  const iron = d.has('iron');
  const steel = d.has('steel');
  const back = dir === 1 ? 4 : dir === 2 ? 2 : dir === 3 ? 10 : 11;
  // кожаные сапоги
  if (d.has('forest_paths')) {
    rc(5, 18, 3, 2, '#4a2e18');
    rc(9, 18, 3, 2, '#4a2e18');
    rc(5, 18, 3, 1, '#6a4524');
    rc(9, 18, 3, 1, '#6a4524');
  }
  // ткань и пояса
  if (d.has('weaving')) {
    rc(4, 12, 8, 1, '#c83a3a');
    rc(4, 13, 8, 1, '#8a2020');
    if (u.look.female) rc(5, 6, 6, 1, '#c83a3a');
  }
  // шкуры охотников
  if (d.has('hunting')) {
    rc(3, 7, 3, 2, '#e8e0d0');
    rc(10, 7, 3, 2, '#d8d0c0');
    rc(3, 9, 1, 1, '#a89878');
  }
  // кольчуга
  if (d.has('chainmail')) {
    for (let y = 8; y < 12; y++) for (let x = 5; x < 11; x++) if ((x + y) % 2 === 0) rc(x, y, 1, 1, '#aab0c0');
  }
  // корзина за спиной
  if (d.has('baskets')) {
    const bx = back;
    if (dir === 0) {
      rc(5, 7, 1, 4, '#8a6428');
      rc(10, 7, 1, 4, '#8a6428');
      rc(10, 4, 3, 3, '#c8964a');
      rc(10, 4, 3, 1, '#8a6428');
    } else {
      rc(bx, 6, 6, 6, '#c8964a');
      for (let i = 0; i < 6; i += 2) rc(bx + i, 6, 1, 6, '#8a6428');
      rc(bx, 8, 6, 1, '#8a6428');
      rc(bx, 11, 6, 1, '#6a4818');
      rc(bx, 5, 6, 1, '#8a6428');
    }
  }
  // кувшин
  if (d.has('pottery')) {
    const jx = dir === 3 ? 11 : 3;
    rc(jx, 12, 3, 4, '#b8683a');
    rc(jx + 1, 11, 1, 1, '#8a4a22');
    rc(jx, 13, 3, 1, '#d89060');
  }
  // топор на поясе
  if (d.has('hatchets') && !working) {
    const ax = dir === 3 ? 3 : 11;
    rc(ax, 12, 1, 4, '#6a4a22');
    rc(ax - (dir === 3 ? 1 : 0), 11, 3, 2, '#c8ccd8');
  }
  // кирка через плечо
  if (d.has('pickaxes') && !working) {
    for (let i = 0; i < 6; i++) rc(4 + i, 9 - i, 1, 1, '#7a5230');
    rc(8, 2, 5, 1, '#aab0c0');
    rc(12, 3, 1, 1, '#aab0c0');
    rc(8, 3, 1, 1, '#aab0c0');
  }
  // лук за спиной
  if (d.has('archery')) {
    const bx = dir === 3 ? 12 : 3;
    rc(bx, 4, 1, 9, '#8a6a3a');
    rc(bx + (dir === 3 ? -1 : 1), 5, 1, 7, '#ddd');
  }
  // сумка лекаря и свиток
  if (d.has('medicine')) rc(10, 13, 3, 3, '#3a8a3a');
  if (d.has('writing')) {
    rc(4, 13, 2, 4, '#f0e6c0');
    rc(4, 12, 2, 1, '#8a6a3a');
    rc(4, 17, 2, 1, '#8a6a3a');
  }
  // соломенная шляпа у земледельцев
  if (d.has('agri') && (u.task.type === 'gather' || u.task.type === 'corvee' || u.task.type === 'idle') && (u.look.acc ?? 0) === 0) {
    rc(3, 1, 10, 1, '#e0c060');
    rc(5, 0, 6, 2, '#e0c060');
    rc(5, 1, 6, 1, '#b89840');
  }
  // головные уборы по металлам
  if (steel) {
    rc(5, 0, 6, 3, '#c8d0e0');
    rc(4, 2, 8, 1, '#8a92a4');
    rc(7, -2, 2, 3, '#d83a3a');
    rc(5, 0, 2, 1, '#f0f4ff');
  } else if (iron) {
    rc(5, 0, 6, 3, '#9aa0b0');
    rc(4, 2, 8, 1, '#6a7080');
    rc(5, 0, 2, 1, '#c8ccd8');
  } else if (bronze) {
    rc(5, 1, 6, 1, '#d89a3a');
    rc(5, 2, 6, 1, '#a8681e');
  }
  // факел ночью
  if (d.has('fire') && g.nightK > 0.35) {
    const tx = dir === 3 ? 2 : 13;
    rc(tx, 8, 1, 5, '#6a4a22');
    const fl = Math.sin(t * 14 + u.id) > 0 ? 1 : 0;
    rc(tx - 1, 5 + fl, 3, 3, '#ff9a2a');
    rc(tx, 4 + fl, 1, 2, '#ffe680');
  }
}

/** тачка / вагонетка вместо ноши над головой */
export function drawCart(ctx: CanvasRenderingContext2D, g: Game, u: Unit, fx: number, fy: number) {
  const stone = u.carry.type === 'stone';
  const big = stone && g.done.has('mine_carts');
  const side = u.dir === 3 ? -1 : 1;
  const cx = Math.round(fx + side * (u.dir === 0 || u.dir === 1 ? 0 : 10));
  const cy = Math.round(fy + (u.dir === 0 ? 3 : u.dir === 1 ? -7 : 0));
  const w = big ? 9 : 7;
  const x0 = cx - Math.floor(w / 2);
  ctx.fillStyle = 'rgba(10,10,24,0.28)';
  ctx.fillRect(x0 + 1, cy, w, 1);
  ctx.fillStyle = big ? '#4a4a56' : '#7a5230';
  ctx.fillRect(x0, cy - 4, w, 3);
  ctx.fillStyle = big ? '#6a6a78' : '#a8794a';
  ctx.fillRect(x0, cy - 4, w, 1);
  if (stone) {
    ctx.fillStyle = '#959cae';
    ctx.fillRect(x0 + 1, cy - 6, w - 2, 2);
    ctx.fillStyle = '#c0c6d4';
    ctx.fillRect(x0 + 1, cy - 6, 2, 1);
  } else {
    ctx.fillStyle = '#8a5e36';
    ctx.fillRect(x0, cy - 6, w, 2);
    ctx.fillStyle = '#d8aa72';
    ctx.fillRect(x0 + w - 2, cy - 6, 2, 2);
  }
  ctx.fillStyle = '#222';
  ctx.fillRect(x0 + Math.floor(w / 2), cy - 2, 2, 2);
  if (big) {
    ctx.fillRect(x0, cy - 1, 2, 1);
    ctx.fillRect(x0 + w - 2, cy - 1, 2, 1);
  }
  ctx.fillStyle = '#6a4a22';
  ctx.fillRect(x0 - side * 2 + (side > 0 ? 0 : w - 1), cy - 4, 2, 1);
}
