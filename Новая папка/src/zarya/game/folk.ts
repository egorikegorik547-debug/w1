import { B, TH, TW } from './data';
import type { Game, Unit } from './game';
import { SPECS } from './meta';
import type { Town } from './towns';

function mkFolk(g: Game, t: Town, role: 'folk' | 'guard'): Unit {
  const a = Math.random() * Math.PI * 2;
  const r = 1.5 + Math.random() * 4;
  const u = g.newUnit(t.x + 0.5 + Math.cos(a) * r, t.y + 1.5 + Math.sin(a) * r * 0.7, false);
  u.role = role;
  u.accent = SPECS[t.spec].color;
  if (role === 'guard') {
    u.look.female = false;
    u.look.style = 0;
    u.look.outfit = 0;
    u.look.beard = Math.random() < 0.5;
  }
  u.wander = Math.random() * 3;
  return u;
}

function validTile(g: Game, x: number, y: number) {
  const w = g.world;
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 1 || ty < 1 || tx >= w.w - 1 || ty >= w.h - 1) return false;
  const i = ty * w.w + tx;
  return !w.blocked[i] && w.biome[i] > B.WATER;
}

/** Живые жители в чужих (и ваших присоединённых) селениях: ходят, стоят, патрулируют */
export function updateFolk(g: Game, dt: number) {
  for (const t of g.towns) {
    const folkWant = Math.min(14, Math.max(2, Math.round(t.pop * 0.55)));
    const guardWant = Math.min(6, Math.floor(t.soldiers / 2.2));
    const have = t.folk.filter((u) => u.role === 'folk').length;
    const haveG = t.folk.filter((u) => u.role === 'guard').length;
    if (have < folkWant) t.folk.push(mkFolk(g, t, 'folk'));
    else if (have > folkWant) t.folk.splice(t.folk.findIndex((u) => u.role === 'folk'), 1);
    if (haveG < guardWant) t.folk.push(mkFolk(g, t, 'guard'));
    else if (haveG > guardWant) t.folk.splice(t.folk.findIndex((u) => u.role === 'guard'), 1);
    for (const u of t.folk) {
      const speed = u.role === 'guard' ? 1.0 : 1.5;
      if (u.path.length === 0 && u.wander > 0) {
        u.wander -= dt;
        u.moving = false;
        u.phase = 'goto';
        if (u.role === 'folk' && u.wander < 1.4 && u.wander > 0 && (u.id + Math.floor(u.wander * 2)) % 7 === 0) {
          u.phase = 'work';
          u.swing += dt * 1.2;
        }
        continue;
      }
      if (u.path.length === 0) {
        // новая цель вокруг центра селения
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = 1 + Math.random() * (u.role === 'guard' ? 6.5 : 5);
          const tx = t.x + 0.5 + Math.cos(a) * r;
          const ty = t.y + 1.5 + Math.sin(a) * r * 0.75;
          if (validTile(g, tx, ty)) {
            u.path = [{ x: Math.floor(tx), y: Math.floor(ty) }];
            break;
          }
        }
        u.wander = 1.5 + Math.random() * 5;
        if (u.path.length === 0) continue;
      }
      const n = u.path[0];
      const tx = n.x + 0.5;
      const ty = n.y + 0.5;
      const dx = tx - u.x;
      const dy = ty - u.y;
      const dist = Math.hypot(dx, dy);
      const step = speed * dt;
      if (dist <= step) {
        u.x = tx;
        u.y = ty;
        u.path.shift();
        u.moving = false;
        continue;
      }
      const nx = u.x + (dx / dist) * step;
      const ny = u.y + (dy / dist) * step;
      if (!validTile(g, nx, ny)) {
        u.path = [];
        u.moving = false;
        continue;
      }
      u.x = nx;
      u.y = ny;
      if (Math.abs(dx) > Math.abs(dy) * 0.9) {
        u.dir = dx > 0 ? 2 : 3;
        u.fx = u.dir;
      } else u.dir = dy > 0 ? 0 : 1;
      u.anim += dt * speed * 1.7;
      u.moving = true;
      u.phase = 'goto';
    }
  }
}

export { TH, TW };
