import type { MonsterInstance } from '../types/monster';

export const MAX_PARTY_SIZE = 6;
export const BOX_COUNT = 8;
export const BOX_SLOTS = 30;

export class PartyManager {
  party: MonsterInstance[] = [];
  boxes: (MonsterInstance | null)[][] = [];

  constructor() {
    // Initialize empty boxes
    for (let i = 0; i < BOX_COUNT; i++) {
      this.boxes.push(new Array(BOX_SLOTS).fill(null));
    }
  }

  /** Add a monster — goes to party if room, otherwise first open box slot */
  addMonster(monster: MonsterInstance): { location: 'party' | 'box'; boxIndex?: number } {
    if (this.party.length < MAX_PARTY_SIZE) {
      this.party.push(monster);
      return { location: 'party' };
    }

    // Find first open box slot
    for (let b = 0; b < BOX_COUNT; b++) {
      for (let s = 0; s < BOX_SLOTS; s++) {
        if (this.boxes[b][s] === null) {
          this.boxes[b][s] = monster;
          return { location: 'box', boxIndex: b };
        }
      }
    }

    // All full — force into box 0 overflow (shouldn't happen in practice)
    this.boxes[0].push(monster);
    return { location: 'box', boxIndex: 0 };
  }

  /** Deposit party member into a box. Cannot remove last alive member. */
  deposit(partyIndex: number, boxIndex: number, slotIndex: number): boolean {
    if (partyIndex < 0 || partyIndex >= this.party.length) return false;
    if (this.party.length <= 1) return false;

    // Check: don't remove last alive monster
    const monster = this.party[partyIndex];
    const aliveCount = this.party.filter(m => m.currentHP > 0).length;
    if (monster.currentHP > 0 && aliveCount <= 1) return false;

    if (this.boxes[boxIndex][slotIndex] !== null) return false;

    this.boxes[boxIndex][slotIndex] = this.party.splice(partyIndex, 1)[0];
    return true;
  }

  /** Withdraw box monster to party. Party must have room. */
  withdraw(boxIndex: number, slotIndex: number): boolean {
    if (this.party.length >= MAX_PARTY_SIZE) return false;

    const monster = this.boxes[boxIndex][slotIndex];
    if (!monster) return false;

    this.boxes[boxIndex][slotIndex] = null;
    this.party.push(monster);
    return true;
  }

  /** Swap a party member with a box monster */
  swapPartyBox(partyIndex: number, boxIndex: number, slotIndex: number): boolean {
    if (partyIndex < 0 || partyIndex >= this.party.length) return false;

    const boxMonster = this.boxes[boxIndex][slotIndex];
    if (!boxMonster) return false;

    // Check: if the party monster is the last alive and the box monster is fainted, block it
    const partyMon = this.party[partyIndex];
    const aliveCount = this.party.filter(m => m.currentHP > 0).length;
    if (partyMon.currentHP > 0 && aliveCount <= 1 && boxMonster.currentHP <= 0) {
      return false;
    }

    this.boxes[boxIndex][slotIndex] = this.party[partyIndex];
    this.party[partyIndex] = boxMonster;
    return true;
  }

  /** Reorder party by swapping two slots */
  swapPartyOrder(indexA: number, indexB: number): void {
    if (indexA === indexB) return;
    if (indexA < 0 || indexA >= this.party.length) return;
    if (indexB < 0 || indexB >= this.party.length) return;
    [this.party[indexA], this.party[indexB]] = [this.party[indexB], this.party[indexA]];
  }

  getLeadMonster(): MonsterInstance | undefined {
    return this.getFirstAlive();
  }

  getFirstAlive(): MonsterInstance | undefined {
    return this.party.find(m => m.currentHP > 0);
  }

  getFirstAliveIndex(): number {
    return this.party.findIndex(m => m.currentHP > 0);
  }

  hasAliveMonster(): boolean {
    return this.party.some(m => m.currentHP > 0);
  }

  /** Mercy heal: restore all party to full HP */
  healAll(): void {
    for (const m of this.party) {
      m.currentHP = m.maxHP;
    }
  }

  /** Get total monster count (party + all boxes) */
  getTotalCount(): number {
    let count = this.party.length;
    for (const box of this.boxes) {
      count += box.filter(m => m !== null).length;
    }
    return count;
  }

  /** Serialize for saving */
  toJSON(): { party: MonsterInstance[]; boxes: (MonsterInstance | null)[][] } {
    return { party: this.party, boxes: this.boxes };
  }

  /** Load from saved data */
  static fromJSON(data: { party: MonsterInstance[]; boxes: (MonsterInstance | null)[][] }): PartyManager {
    const pm = new PartyManager();
    pm.party = data.party;
    pm.boxes = data.boxes;
    // Ensure all boxes have correct length
    while (pm.boxes.length < BOX_COUNT) {
      pm.boxes.push(new Array(BOX_SLOTS).fill(null));
    }
    return pm;
  }
}
