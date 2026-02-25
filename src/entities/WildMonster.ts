import type { MonsterInstance, MonsterSpecies, BaseStats } from '../types/monster';
import type { Move } from '../types/move';

let uidCounter = 0;
function generateUid(): string {
  return `mon_${Date.now()}_${uidCounter++}`;
}

export class WildMonster {
  /** Generate a wild monster instance from species data */
  static generate(
    speciesId: number,
    level: number,
    monsterDB: MonsterSpecies[],
    moveDB: Move[],
  ): MonsterInstance {
    const species = monsterDB.find(m => m.id === speciesId);
    if (!species) throw new Error(`Unknown species ID: ${speciesId}`);

    const stats = WildMonster.computeStats(species.baseStats, level);
    const hp = WildMonster.computeHP(species.baseStats.hp, level);

    // Pick up to 4 moves the monster can learn at this level
    const learnableMoves = species.movepool
      .filter(entry => entry.learnLevel <= level)
      .sort((a, b) => b.learnLevel - a.learnLevel) // latest learned first
      .slice(0, 4)
      .map(entry => entry.moveId);

    return {
      uid: generateUid(),
      speciesId,
      level,
      currentHP: hp,
      maxHP: hp,
      stats: { ...stats, hp },
      moves: learnableMoves,
      experience: 0,
    };
  }

  /** Generate a random wild encounter from the full database */
  static generateRandom(
    level: number,
    monsterDB: MonsterSpecies[],
    moveDB: Move[],
  ): MonsterInstance {
    const species = monsterDB[Math.floor(Math.random() * monsterDB.length)];
    return WildMonster.generate(species.id, level, monsterDB, moveDB);
  }

  static computeStats(base: BaseStats, level: number): BaseStats {
    return {
      hp: WildMonster.computeHP(base.hp, level),
      atk: WildMonster.computeStat(base.atk, level),
      def: WildMonster.computeStat(base.def, level),
      spAtk: WildMonster.computeStat(base.spAtk, level),
      spDef: WildMonster.computeStat(base.spDef, level),
      speed: WildMonster.computeStat(base.speed, level),
    };
  }

  static computeHP(baseHP: number, level: number): number {
    return Math.floor(((baseHP * 2) * level) / 100 + level + 10);
  }

  static computeStat(baseStat: number, level: number): number {
    return Math.floor(((baseStat * 2) * level) / 100 + 5);
  }
}
