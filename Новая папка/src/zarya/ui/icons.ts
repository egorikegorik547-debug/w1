import { buildIcons } from '../game/sprites';
import type { Game } from '../game/game';
import type { BuildingId } from '../game/data';

let cache: Record<string, string> | null = null;
export function icons(): Record<string, string> {
  if (!cache) cache = buildIcons();
  return cache;
}

const bcache = new Map<string, string>();
export function buildingIcon(game: Game, id: BuildingId): string {
  const hit = bcache.get(id);
  if (hit) return hit;
  const url = game.bspr.cv[id].toDataURL();
  bcache.set(id, url);
  return url;
}
