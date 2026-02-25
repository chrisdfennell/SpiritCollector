import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import type { Move } from '../types/move';
import type { BattleAction, TurnResult, CatchResult } from '../types/battle';
import { calculateDamage } from './DamageCalculator';
import { calculateCatch } from './CatchCalculator';
import { TrainerAI } from './TrainerAI';
import { calculateXPGain } from '../core/LevelManager';

export class BattleEngine {
  party: MonsterInstance[];
  opponentParty: MonsterInstance[];
  opponentIndex: number;
  activeIndex: number;
  isTrainerBattle: boolean;

  private monsterDB: MonsterSpecies[];
  private moveDB: Move[];
  private _isOver = false;
  private _winner: 'player' | 'wild' | null = null;
  private _caught = false;
  private _needsSwitch = false;
  private _opponentNeedsSwitch = false;
  private _xpGained = 0;
  private _goldReward = 0;

  constructor(
    party: MonsterInstance[],
    opponentParty: MonsterInstance[],
    monsterDB: MonsterSpecies[],
    moveDB: Move[],
    isTrainerBattle = false,
  ) {
    this.party = party;
    this.opponentParty = opponentParty;
    this.opponentIndex = 0;
    this.monsterDB = monsterDB;
    this.moveDB = moveDB;
    this.isTrainerBattle = isTrainerBattle;

    // Start with first alive party member
    this.activeIndex = party.findIndex(m => m.currentHP > 0);
    if (this.activeIndex < 0) this.activeIndex = 0;
  }

  /** Backward-compatible alias for the current opponent */
  get wildMonster(): MonsterInstance {
    return this.opponentParty[this.opponentIndex];
  }

  get activeMonster(): MonsterInstance {
    return this.party[this.activeIndex];
  }

  get activeSpecies(): MonsterSpecies {
    return this.monsterDB.find(m => m.id === this.activeMonster.speciesId)!;
  }

  get wildSpeciesData(): MonsterSpecies {
    return this.monsterDB.find(m => m.id === this.wildMonster.speciesId)!;
  }

  getMove(moveId: number): Move | undefined {
    return this.moveDB.find(m => m.id === moveId);
  }

  getActiveMoves(): Move[] {
    return this.activeMonster.moves
      .map(id => this.getMove(id))
      .filter((m): m is Move => m !== undefined);
  }

  get isOver(): boolean { return this._isOver; }
  get winner(): 'player' | 'wild' | null { return this._winner; }
  get caught(): boolean { return this._caught; }
  get needsSwitch(): boolean { return this._needsSwitch; }
  get opponentNeedsSwitch(): boolean { return this._opponentNeedsSwitch; }
  get xpGained(): number { return this._xpGained; }
  get goldReward(): number { return this._goldReward; }

  /** Submit the player's chosen action */
  submitAction(action: BattleAction): { turnResults: TurnResult[], catchResult?: CatchResult } {
    if (this._isOver) return { turnResults: [] };

    switch (action.type) {
      case 'run':
        if (this.isTrainerBattle) return { turnResults: [] }; // Can't run from trainers
        this._isOver = true;
        this._winner = null;
        return { turnResults: [] };

      case 'catch':
        if (this.isTrainerBattle) return { turnResults: [] }; // Can't catch trainer mons
        return this.handleCatch(action.catchMultiplier);

      case 'switch':
        return this.handleSwitch(action.switchToIndex!);

      case 'item':
        // Item used externally (healing applied by scene) — opponent gets free attack
        return this.handleItemTurn();

      case 'attack':
        return { turnResults: this.handleAttack(action.moveId!) };
    }
  }

  /** Forced switch after active monster faints */
  forceSwitch(newIndex: number): void {
    if (newIndex < 0 || newIndex >= this.party.length) return;
    if (this.party[newIndex].currentHP <= 0) return;
    this.activeIndex = newIndex;
    this._needsSwitch = false;
  }

  /** Advance to the next alive opponent (trainer battles) */
  advanceOpponent(): void {
    const nextAlive = this.opponentParty.findIndex((m, i) => i > this.opponentIndex && m.currentHP > 0);
    if (nextAlive >= 0) {
      this.opponentIndex = nextAlive;
    } else {
      // Search from the beginning
      const fromStart = this.opponentParty.findIndex(m => m.currentHP > 0);
      if (fromStart >= 0) {
        this.opponentIndex = fromStart;
      }
    }
    this._opponentNeedsSwitch = false;
  }

  private handleAttack(moveId: number): TurnResult[] {
    const results: TurnResult[] = [];
    const playerFirst = this.activeMonster.stats.speed >= this.wildMonster.stats.speed;

    if (playerFirst) {
      results.push(this.executeAttack(
        this.activeMonster, this.activeSpecies,
        this.wildMonster, this.wildSpeciesData,
        moveId,
      ));
      if (!this.checkFaint()) {
        results.push(this.executeOpponentAttack());
        this.checkFaint();
      }
    } else {
      results.push(this.executeOpponentAttack());
      if (!this.checkFaint()) {
        results.push(this.executeAttack(
          this.activeMonster, this.activeSpecies,
          this.wildMonster, this.wildSpeciesData,
          moveId,
        ));
        this.checkFaint();
      }
    }

    return results;
  }

  private handleCatch(catchMultiplier?: number): { turnResults: TurnResult[], catchResult: CatchResult } {
    const catchResult = calculateCatch(this.wildMonster, this.wildSpeciesData, catchMultiplier);

    if (catchResult.success) {
      this._isOver = true;
      this._winner = 'player';
      this._caught = true;
      return { turnResults: [], catchResult };
    }

    // Failed catch — opponent gets a free attack
    const turnResults: TurnResult[] = [];
    turnResults.push(this.executeOpponentAttack());
    this.checkFaint();

    return { turnResults, catchResult };
  }

  private handleSwitch(newIndex: number): { turnResults: TurnResult[] } {
    if (newIndex < 0 || newIndex >= this.party.length) return { turnResults: [] };
    if (this.party[newIndex].currentHP <= 0) return { turnResults: [] };
    if (newIndex === this.activeIndex) return { turnResults: [] };

    this.activeIndex = newIndex;

    // Opponent gets a free attack after voluntary switch
    const turnResults: TurnResult[] = [];
    turnResults.push(this.executeOpponentAttack());
    this.checkFaint();

    return { turnResults };
  }

  private handleItemTurn(): { turnResults: TurnResult[] } {
    // Item usage is handled by the scene; engine just processes the opponent's free attack
    const turnResults: TurnResult[] = [];
    turnResults.push(this.executeOpponentAttack());
    this.checkFaint();
    return { turnResults };
  }

  private executeAttack(
    attacker: MonsterInstance,
    attackerSpecies: MonsterSpecies,
    defender: MonsterInstance,
    defenderSpecies: MonsterSpecies,
    moveId: number,
  ): TurnResult {
    const move = this.getMove(moveId)!;

    const hit = Math.random() * 100 < move.accuracy;
    if (!hit) {
      return {
        attackerName: attackerSpecies.name,
        defenderName: defenderSpecies.name,
        moveName: move.name,
        damage: 0,
        isCritical: false,
        effectiveness: 1,
        defenderRemainingHP: defender.currentHP,
        defenderFainted: false,
        missed: true,
      };
    }

    const { damage, isCritical, effectiveness } = calculateDamage(
      attacker, defender, move, attackerSpecies, defenderSpecies,
    );

    defender.currentHP = Math.max(0, defender.currentHP - damage);

    return {
      attackerName: attackerSpecies.name,
      defenderName: defenderSpecies.name,
      moveName: move.name,
      damage,
      isCritical,
      effectiveness,
      defenderRemainingHP: defender.currentHP,
      defenderFainted: defender.currentHP <= 0,
      missed: false,
    };
  }

  private executeOpponentAttack(): TurnResult {
    let moveId: number;

    if (this.isTrainerBattle) {
      moveId = TrainerAI.chooseBestMove(
        this.wildMonster, this.wildSpeciesData,
        this.activeMonster, this.activeSpecies,
        this.moveDB,
      );
    } else {
      const moves = this.wildMonster.moves;
      moveId = moves[Math.floor(Math.random() * moves.length)];
    }

    return this.executeAttack(
      this.wildMonster, this.wildSpeciesData,
      this.activeMonster, this.activeSpecies,
      moveId,
    );
  }

  private checkFaint(): boolean {
    if (this.wildMonster.currentHP <= 0) {
      // Calculate XP and gold for this defeated opponent
      const oppSpecies = this.wildSpeciesData;
      this._xpGained = calculateXPGain(oppSpecies.baseExpYield, this.wildMonster.level);
      this._goldReward = Math.floor(this.wildMonster.level * (this.isTrainerBattle ? 15 : 8));

      if (this.isTrainerBattle) {
        // Check if trainer has more alive opponents
        const hasMoreAlive = this.opponentParty.some((m, i) => i !== this.opponentIndex && m.currentHP > 0);
        if (hasMoreAlive) {
          this._opponentNeedsSwitch = true;
          return true;
        }
      }

      this._isOver = true;
      this._winner = 'player';
      return true;
    }
    if (this.activeMonster.currentHP <= 0) {
      const hasAlive = this.party.some(m => m.currentHP > 0);
      if (!hasAlive) {
        this._isOver = true;
        this._winner = 'wild';
        return true;
      }
      this._needsSwitch = true;
      return true;
    }
    return false;
  }
}
