import Phaser from 'phaser';
import { FlagManager } from './FlagManager';
import { InventoryManager } from './InventoryManager';
import { PartyManager } from './PartyManager';
import { SaveManager } from './SaveManager';
import { WildMonster } from '../entities/WildMonster';
import type { MonsterSpecies } from '../types/monster';
import type { Move } from '../types/move';

export class EventHandler {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  handleEvent(eventId: string, eventData?: Record<string, unknown>): void {
    switch (eventId) {
      case 'chooseStarter':
        this.handleChooseStarter(eventData);
        break;
      case 'healParty':
        this.handleHealParty();
        break;
      case 'openShop':
        this.handleOpenShop(eventData);
        break;
    }
  }

  private handleHealParty(): void {
    const pm = this.scene.game.registry.get('partyManager') as PartyManager;
    pm.healAll();
  }

  private handleOpenShop(data?: Record<string, unknown>): void {
    const shopItems = (data?.shopItems ?? []) as number[];
    this.scene.scene.pause('OverworldScene');
    this.scene.scene.launch('ShopScene', { shopItems });
  }

  private handleChooseStarter(data?: Record<string, unknown>): void {
    const speciesId = data?.speciesId as number;
    if (!speciesId) return;

    const pm = this.scene.game.registry.get('partyManager') as PartyManager;
    const flags = this.scene.game.registry.get('flagManager') as FlagManager;
    const monsterDB = this.scene.cache.json.get('monsters') as MonsterSpecies[];
    const moveDB = this.scene.cache.json.get('moves') as Move[];

    const starter = WildMonster.generate(speciesId, 5, monsterDB, moveDB);
    const species = monsterDB.find(m => m.id === speciesId)!;
    starter.nickname = species.name;
    pm.addMonster(starter);

    flags.set('hasFirstSpirit', true);

    const inventory = this.scene.game.registry.get('inventory') as InventoryManager;
    SaveManager.save(pm, flags, inventory, 'town', { x: 0, y: 0 });
  }
}
