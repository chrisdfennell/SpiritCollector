import { TileType } from '../types/common';
import type { EncounterZone, EncounterEntry } from '../types/map';

export function checkEncounter(tileType: TileType, zone: EncounterZone | null): boolean {
  if (!zone) return false;
  return tileType === TileType.TALL_GRASS && Math.random() < zone.encounterRate;
}

export function selectEncounter(zone: EncounterZone): EncounterEntry {
  const totalWeight = zone.pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of zone.pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return zone.pool[zone.pool.length - 1];
}
