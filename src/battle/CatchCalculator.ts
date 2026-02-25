import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import type { CatchResult } from '../types/battle';

/**
 * Pure catch probability calculation. No Phaser imports.
 *
 * Formula:
 *   hpFactor   = (3*maxHP - 2*currentHP) / (3*maxHP)
 *   catchRate  = (600 - baseStatTotal) / 600   (clamped 0.1 – 0.9)
 *   rawChance  = hpFactor * catchRate
 *   shakeProb  = rawChance^(1/3)
 *
 * Each of the 3 shakes is an independent check against shakeProb.
 * All 3 pass = caught. Fail at shake N = N shakes then break free.
 */
export function calculateCatch(
  wildMonster: MonsterInstance,
  wildSpecies: MonsterSpecies,
  catchMultiplier: number = 1.0,
): CatchResult {
  const { currentHP, maxHP } = wildMonster;
  const base = wildSpecies.baseStats;
  const baseStatTotal = base.hp + base.atk + base.def + base.spAtk + base.spDef + base.speed;

  // HP factor: lower HP = higher chance (0.33 at full HP, 1.0 at 1 HP)
  const hpFactor = (3 * maxHP - 2 * currentHP) / (3 * maxHP);

  // Species catch rate: weaker monsters (lower BST) are easier
  const catchRate = Math.max(0.1, Math.min(0.9, (600 - baseStatTotal) / 600));

  // Raw chance (0 to ~0.9), scaled by catch multiplier
  const rawChance = Math.min(1, hpFactor * catchRate * catchMultiplier);

  // Each shake is an independent check with probability = rawChance^(1/3)
  const shakeProb = Math.pow(rawChance, 1 / 3);

  let shakes = 0;
  for (let i = 0; i < 3; i++) {
    if (Math.random() < shakeProb) {
      shakes++;
    } else {
      break;
    }
  }

  return {
    success: shakes === 3,
    shakes,
  };
}
