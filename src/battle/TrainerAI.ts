import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import type { Move } from '../types/move';
import { calculateDamage } from './DamageCalculator';

export class TrainerAI {
  /**
   * Evaluate all available moves and pick the one with the highest
   * expected damage, considering type effectiveness, STAB, and accuracy.
   */
  static chooseBestMove(
    attacker: MonsterInstance,
    attackerSpecies: MonsterSpecies,
    defender: MonsterInstance,
    defenderSpecies: MonsterSpecies,
    moveDB: Move[],
  ): number {
    let bestMoveId = attacker.moves[0];
    let bestExpectedDamage = -1;

    for (const moveId of attacker.moves) {
      const move = moveDB.find(m => m.id === moveId);
      if (!move) continue;

      // Calculate damage (includes type effectiveness, STAB, etc.)
      const { damage } = calculateDamage(
        attacker, defender, move, attackerSpecies, defenderSpecies,
      );

      // Weight by accuracy for expected damage
      const expectedDamage = damage * (move.accuracy / 100);

      if (expectedDamage > bestExpectedDamage) {
        bestExpectedDamage = expectedDamage;
        bestMoveId = moveId;
      }
    }

    return bestMoveId;
  }
}
