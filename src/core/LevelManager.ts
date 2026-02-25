import type { MonsterInstance, MonsterSpecies, BaseStats } from '../types/monster';
import { WildMonster } from '../entities/WildMonster';

export const MAX_LEVEL = 50;

/** Total XP needed to reach a given level (cubic curve) */
export function xpForLevel(level: number): number {
  return level * level * level;
}

/** XP gained from defeating a monster */
export function calculateXPGain(baseExpYield: number, enemyLevel: number): number {
  return Math.floor(baseExpYield * enemyLevel / 7);
}

export interface LevelUpResult {
  newLevel: number;
  newStats: BaseStats;
  newMaxHP: number;
  hpIncrease: number;
  newMoves: number[];
  evolution: { speciesId: number; speciesName: string } | null;
}

/**
 * Apply XP to a monster, mutating it in place.
 * Returns an array of LevelUpResults (one per level gained).
 */
export function applyXP(
  monster: MonsterInstance,
  xpGained: number,
  species: MonsterSpecies,
  monsterDB: MonsterSpecies[],
): LevelUpResult[] {
  const results: LevelUpResult[] = [];

  monster.experience += xpGained;

  while (monster.level < MAX_LEVEL && monster.experience >= xpForLevel(monster.level + 1)) {
    const oldMaxHP = monster.maxHP;
    monster.level++;

    // Recalculate stats with current species base stats
    const currentSpecies = monsterDB.find(m => m.id === monster.speciesId) || species;
    const newStats = WildMonster.computeStats(currentSpecies.baseStats, monster.level);
    const newMaxHP = WildMonster.computeHP(currentSpecies.baseStats.hp, monster.level);

    monster.stats = { ...newStats, hp: newMaxHP };
    monster.maxHP = newMaxHP;

    // Heal the HP delta so the monster doesn't lose health on level-up
    const hpIncrease = newMaxHP - oldMaxHP;
    monster.currentHP = Math.min(monster.maxHP, monster.currentHP + hpIncrease);

    // Check for new moves at this level
    const newMoves = currentSpecies.movepool
      .filter(entry => entry.learnLevel === monster.level)
      .map(entry => entry.moveId)
      // Filter out moves the monster already knows
      .filter(moveId => !monster.moves.includes(moveId));

    // Check for evolution
    let evolution: LevelUpResult['evolution'] = null;
    if (currentSpecies.evolvesTo && monster.level >= currentSpecies.evolvesTo.level) {
      const evoSpecies = monsterDB.find(m => m.id === currentSpecies.evolvesTo!.speciesId);
      if (evoSpecies) {
        evolution = { speciesId: evoSpecies.id, speciesName: evoSpecies.name };
      }
    }

    results.push({
      newLevel: monster.level,
      newStats,
      newMaxHP,
      hpIncrease,
      newMoves,
      evolution,
    });
  }

  return results;
}

/**
 * Apply evolution to a monster, mutating it in place.
 * Updates speciesId and recalculates stats with new base stats.
 */
export function applyEvolution(
  monster: MonsterInstance,
  newSpeciesId: number,
  monsterDB: MonsterSpecies[],
): void {
  const newSpecies = monsterDB.find(m => m.id === newSpeciesId);
  if (!newSpecies) return;

  const oldMaxHP = monster.maxHP;

  monster.speciesId = newSpeciesId;

  // Recalculate stats with new species base stats
  const newStats = WildMonster.computeStats(newSpecies.baseStats, monster.level);
  const newMaxHP = WildMonster.computeHP(newSpecies.baseStats.hp, monster.level);

  monster.stats = { ...newStats, hp: newMaxHP };
  monster.maxHP = newMaxHP;

  // Add the HP delta
  const hpIncrease = newMaxHP - oldMaxHP;
  monster.currentHP = Math.min(monster.maxHP, monster.currentHP + hpIncrease);
}
