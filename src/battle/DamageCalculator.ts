import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import type { Move } from '../types/move';
import { getTypeEffectiveness } from '../utils/TypeChart';
import { CRIT_CHANCE, CRIT_MULTIPLIER, STAB_MULTIPLIER } from '../utils/Constants';

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  effectiveness: number;
}

/**
 * Pure damage calculation with no Phaser dependency.
 *
 * Formula:
 *   Damage = ((2*Level/5 + 2) * Power * (A/D) / 50 + 2) * Modifier
 *
 * Where Modifier = STAB * TypeEffectiveness * CritMultiplier
 */
export function calculateDamage(
  attacker: MonsterInstance,
  defender: MonsterInstance,
  move: Move,
  attackerSpecies: MonsterSpecies,
  defenderSpecies: MonsterSpecies,
): DamageResult {
  if (move.power === 0) {
    return { damage: 0, isCritical: false, effectiveness: 1 };
  }

  // Pick attack and defense stats based on move category
  const A = move.category === 'physical' ? attacker.stats.atk : attacker.stats.spAtk;
  const D = move.category === 'physical' ? defender.stats.def : defender.stats.spDef;

  // Base damage formula
  const levelFactor = (2 * attacker.level) / 5 + 2;
  let baseDamage = (levelFactor * move.power * (A / D)) / 50 + 2;

  // STAB (Same Type Attack Bonus)
  const stab = attackerSpecies.types.includes(move.type) ? STAB_MULTIPLIER : 1;

  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type, defenderSpecies.types);

  // Critical hit
  const isCritical = Math.random() < CRIT_CHANCE;
  const critMultiplier = isCritical ? CRIT_MULTIPLIER : 1;

  // Random factor (0.85 to 1.00)
  const random = 0.85 + Math.random() * 0.15;

  // Final damage
  const modifier = stab * effectiveness * critMultiplier * random;
  let damage = Math.floor(baseDamage * modifier);

  // Minimum 1 damage if the move has power and isn't immune
  if (effectiveness > 0 && damage < 1) {
    damage = 1;
  }

  return { damage, isCritical, effectiveness };
}
