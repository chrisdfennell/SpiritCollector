import type { MonsterType } from '../types/monster';

/**
 * Type effectiveness chart.
 * chart[attackType][defenderType] = multiplier
 * Missing entries default to 1.0 (neutral).
 */
const chart: Partial<Record<MonsterType, Partial<Record<MonsterType, number>>>> = {
  fire: {
    grass: 2,
    water: 0.5,
    fire: 0.5,
    ice: 2,
  },
  water: {
    fire: 2,
    grass: 0.5,
    water: 0.5,
    ground: 2,
  },
  grass: {
    water: 2,
    fire: 0.5,
    grass: 0.5,
    ground: 2,
  },
  electric: {
    water: 2,
    grass: 0.5,
    electric: 0.5,
    ground: 0,
  },
  ice: {
    grass: 2,
    fire: 0.5,
    water: 0.5,
    ice: 0.5,
    dragon: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
  },
  fighting: {
    normal: 2,
    ice: 2,
    dragon: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
  },
  normal: {},
  dragon: {
    dragon: 2,
  },
};

/** Returns the combined type effectiveness multiplier for an attack against defender types */
export function getTypeEffectiveness(attackType: MonsterType, defenderTypes: MonsterType[]): number {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const attackChart = chart[attackType];
    const eff = attackChart?.[defType];
    if (eff !== undefined) {
      multiplier *= eff;
    }
  }
  return multiplier;
}
