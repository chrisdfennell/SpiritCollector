import type { ItemEffect } from '../types/item';
import type { MonsterInstance } from '../types/monster';

export class InventoryManager {
  private items: Map<number, number> = new Map();
  private gold: number = 0;

  getGold(): number {
    return this.gold;
  }

  addGold(amount: number): void {
    this.gold += amount;
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  addItem(itemId: number, quantity: number = 1): void {
    this.items.set(itemId, (this.items.get(itemId) || 0) + quantity);
  }

  removeItem(itemId: number, quantity: number = 1): boolean {
    const current = this.items.get(itemId) || 0;
    if (current < quantity) return false;
    const newQty = current - quantity;
    if (newQty === 0) this.items.delete(itemId);
    else this.items.set(itemId, newQty);
    return true;
  }

  getQuantity(itemId: number): number {
    return this.items.get(itemId) || 0;
  }

  hasItem(itemId: number): boolean {
    return this.getQuantity(itemId) > 0;
  }

  getAllItems(): { itemId: number; quantity: number }[] {
    return Array.from(this.items.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));
  }

  /** Apply a healing item effect to a monster. Returns true if used. */
  static applyHealingItem(effect: ItemEffect, monster: MonsterInstance): boolean {
    switch (effect.type) {
      case 'heal': {
        if (monster.currentHP <= 0) return false;
        if (monster.currentHP >= monster.maxHP) return false;
        monster.currentHP = Math.min(monster.maxHP, monster.currentHP + effect.amount);
        return true;
      }
      case 'healPercent': {
        const amount = Math.max(1, Math.floor(monster.maxHP * effect.percent / 100));
        if (monster.currentHP <= 0) {
          // Revive from fainted
          monster.currentHP = amount;
        } else {
          if (monster.currentHP >= monster.maxHP) return false;
          monster.currentHP = Math.min(monster.maxHP, monster.currentHP + amount);
        }
        return true;
      }
      case 'fullHeal': {
        if (monster.currentHP <= 0) return false;
        if (monster.currentHP >= monster.maxHP) return false;
        monster.currentHP = monster.maxHP;
        return true;
      }
      default:
        return false;
    }
  }

  toJSON(): { items: Record<string, number>; gold: number } {
    const items: Record<string, number> = {};
    for (const [id, qty] of this.items) {
      items[String(id)] = qty;
    }
    return { items, gold: this.gold };
  }

  static fromJSON(data: Record<string, number> | { items: Record<string, number>; gold: number }): InventoryManager {
    const inv = new InventoryManager();
    if ('items' in data && 'gold' in data) {
      // New format with gold
      for (const [id, qty] of Object.entries(data.items)) {
        inv.items.set(Number(id), qty);
      }
      inv.gold = data.gold;
    } else {
      // Legacy format: flat Record<string, number>
      for (const [id, qty] of Object.entries(data)) {
        inv.items.set(Number(id), qty);
      }
    }
    return inv;
  }
}
