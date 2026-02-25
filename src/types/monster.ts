export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export type MonsterType =
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'normal'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'dragon';

import type { Rarity } from './map';

/** Database definition — lives in monsters.json */
export interface MonsterSpecies {
  id: number;
  name: string;
  types: MonsterType[];
  baseStats: BaseStats;
  movepool: { learnLevel: number; moveId: number }[];
  /** Placeholder color used until real sprites exist */
  placeholderColor: string;
  rarity: Rarity;
  baseExpYield: number;
  evolvesTo?: { speciesId: number; level: number };
}

/** A concrete instance the player or wild encounter owns */
export interface MonsterInstance {
  uid: string;
  speciesId: number;
  nickname?: string;
  level: number;
  currentHP: number;
  maxHP: number;
  stats: BaseStats;
  moves: number[]; // move IDs, max 4
  experience: number;
}
