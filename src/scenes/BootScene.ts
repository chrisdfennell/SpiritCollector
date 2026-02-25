import Phaser from 'phaser';
import { PartyManager } from '../core/PartyManager';
import { FlagManager } from '../core/FlagManager';
import { InventoryManager } from '../core/InventoryManager';
import { SaveManager } from '../core/SaveManager';
import { MonsterSpriteRenderer } from '../rendering/MonsterSpriteRenderer';
import type { Position } from '../types/common';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.json('monsters', 'data/monsters.json');
    this.load.json('moves', 'data/moves.json');
    this.load.json('npcs', 'data/npcs.json');
    this.load.json('encounters', 'data/encounters.json');
    this.load.json('items', 'data/items.json');
    this.load.json('map_home', 'data/maps/home.json');
    this.load.json('map_town', 'data/maps/town.json');
    this.load.json('map_sanctuary', 'data/maps/sanctuary.json');
    this.load.json('map_wild_steppe', 'data/maps/wild_steppe.json');
    this.load.json('map_forest_path', 'data/maps/forest_path.json');
    this.load.json('map_desert_pass', 'data/maps/desert_pass.json');
    this.load.json('map_tundra_ridge', 'data/maps/tundra_ridge.json');
    this.load.json('map_lake_shore', 'data/maps/lake_shore.json');
    this.load.json('map_waystation', 'data/maps/waystation.json');
    this.load.json('map_lakeside_village', 'data/maps/lakeside_village.json');
    this.load.json('map_town_clinic', 'data/maps/town_clinic.json');
    this.load.json('map_town_shop', 'data/maps/town_shop.json');
    this.load.json('map_waystation_clinic', 'data/maps/waystation_clinic.json');
    this.load.json('map_waystation_shop', 'data/maps/waystation_shop.json');
    this.load.json('map_lakeside_clinic', 'data/maps/lakeside_clinic.json');
    this.load.json('map_lakeside_shop', 'data/maps/lakeside_shop.json');

    // New expansion maps
    this.load.json('map_volcanic_trail', 'data/maps/volcanic_trail.json');
    this.load.json('map_swamp_depths', 'data/maps/swamp_depths.json');
    this.load.json('map_coastal_road', 'data/maps/coastal_road.json');
    this.load.json('map_mountain_pass', 'data/maps/mountain_pass.json');
    this.load.json('map_crystal_caves', 'data/maps/crystal_caves.json');
    this.load.json('map_ashen_peak', 'data/maps/ashen_peak.json');
    this.load.json('map_ember_town', 'data/maps/ember_town.json');
    this.load.json('map_bogmire_village', 'data/maps/bogmire_village.json');
    this.load.json('map_summit_outpost', 'data/maps/summit_outpost.json');
    this.load.json('map_port_breeze', 'data/maps/port_breeze.json');
    this.load.json('map_ember_clinic', 'data/maps/ember_clinic.json');
    this.load.json('map_ember_shop', 'data/maps/ember_shop.json');
    this.load.json('map_bogmire_clinic', 'data/maps/bogmire_clinic.json');
    this.load.json('map_bogmire_shop', 'data/maps/bogmire_shop.json');
    this.load.json('map_summit_clinic', 'data/maps/summit_clinic.json');
    this.load.json('map_summit_shop', 'data/maps/summit_shop.json');
    this.load.json('map_port_clinic', 'data/maps/port_clinic.json');
    this.load.json('map_port_shop', 'data/maps/port_shop.json');

    // Monster SVG sprites
    MonsterSpriteRenderer.preloadAllTextures(this);
  }

  create(): void {
    const { width, height } = this.scale;

    const text = this.add.text(width / 2, height / 2, 'Spirit Collectors', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    text.setOrigin(0.5);

    let pm: PartyManager;
    let flags: FlagManager;
    let inventory: InventoryManager;
    let startMap = 'home';
    let startPos: Position | null = null;

    const saveData = SaveManager.load();
    if (saveData) {
      pm = saveData.partyManager;
      flags = saveData.flagManager;
      inventory = saveData.inventoryManager;
      startMap = saveData.currentMap;
      startPos = saveData.playerPosition;
    } else {
      pm = new PartyManager();
      flags = new FlagManager();
      inventory = new InventoryManager();

      // Starter items for new game
      inventory.addItem(1, 5);   // 5x Minor Salve
      inventory.addItem(8, 10);  // 10x Spirit Orb
    }

    this.game.registry.set('partyManager', pm);
    this.game.registry.set('flagManager', flags);
    this.game.registry.set('inventory', inventory);

    this.time.delayedCall(1000, () => {
      this.scene.start('OverworldScene', { mapId: startMap, playerPos: startPos });
    });
  }
}
