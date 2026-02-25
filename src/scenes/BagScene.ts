import Phaser from 'phaser';
import { InventoryManager } from '../core/InventoryManager';
import { PartyManager } from '../core/PartyManager';
import type { ItemData, ItemCategory } from '../types/item';
import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import { GAME_WIDTH, GAME_HEIGHT } from '../types/common';
import { MonsterSpriteRenderer } from '../rendering/MonsterSpriteRenderer';

const TABS: { label: string; category: ItemCategory }[] = [
  { label: 'Healing', category: 'healing' },
  { label: 'Capture', category: 'capture' },
  { label: 'Key Items', category: 'keyItem' },
];

export class BagScene extends Phaser.Scene {
  private inventory!: InventoryManager;
  private itemDB: ItemData[] = [];
  private monsterDB: MonsterSpecies[] = [];
  private activeTab = 0;
  private uiContainer!: Phaser.GameObjects.Container;
  private infoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private escKey!: Phaser.Input.Keyboard.Key;
  private bKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'BagScene' });
  }

  create(): void {
    this.inventory = this.game.registry.get('inventory') as InventoryManager;
    this.itemDB = (this.cache.json.get('items') ?? []) as ItemData[];
    this.monsterDB = this.cache.json.get('monsters') as MonsterSpecies[];
    this.activeTab = 0;

    this.escKey = this.input.keyboard!.addKey('ESC');
    this.bKey = this.input.keyboard!.addKey('B');

    // Dimmed background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    // Title
    this.add.text(GAME_WIDTH / 2, 16, 'Bag', {
      fontSize: '20px', color: '#e0e8f0', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH - 16, 16, `Gold: ${this.inventory.getGold()}G`, {
      fontSize: '13px', color: '#f0d060', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    this.add.text(GAME_WIDTH / 2, 38, 'Press B or ESC to close', {
      fontSize: '10px', color: '#607080', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Status text
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, '', {
      fontSize: '12px', color: '#c0d0e0', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Info panel
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x182028, 0.9);
    infoBg.fillRoundedRect(10, GAME_HEIGHT - 90, GAME_WIDTH - 20, 65, 6);
    infoBg.lineStyle(1, 0x405060);
    infoBg.strokeRoundedRect(10, GAME_HEIGHT - 90, GAME_WIDTH - 20, 65, 6);

    this.infoText = this.add.text(24, GAME_HEIGHT - 82, 'Select an item to see details.', {
      fontSize: '12px', color: '#a0b0c0', fontFamily: 'monospace',
      wordWrap: { width: GAME_WIDTH - 48 },
    });

    this.uiContainer = this.add.container(0, 0);
    this.renderTabs();
    this.renderItems();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) || Phaser.Input.Keyboard.JustDown(this.bKey)) {
      this.closeBag();
    }
  }

  private closeBag(): void {
    this.scene.stop();
    this.scene.resume('OverworldScene');
  }

  private renderTabs(): void {
    const tabY = 56;
    const tabW = 100;
    const gap = 8;
    const totalW = TABS.length * tabW + (TABS.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    TABS.forEach((tab, i) => {
      const x = startX + i * (tabW + gap) + tabW / 2;
      const isActive = i === this.activeTab;

      const bg = this.add.rectangle(x, tabY, tabW, 28,
        isActive ? 0x384858 : 0x202830);
      bg.setStrokeStyle(isActive ? 2 : 1, isActive ? 0x70a0c0 : 0x405060);
      bg.setInteractive({ useHandCursor: true });

      const label = this.add.text(x, tabY, tab.label, {
        fontSize: '12px', color: isActive ? '#ffffff' : '#808898', fontFamily: 'monospace',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        this.activeTab = i;
        this.uiContainer.removeAll(true);
        this.renderTabs();
        this.renderItems();
        this.infoText.setText('Select an item to see details.');
        this.statusText.setText('');
      });

      this.uiContainer.add([bg, label]);
    });
  }

  private renderItems(): void {
    const category = TABS[this.activeTab].category;
    const allItems = this.inventory.getAllItems();

    const filteredItems = allItems.filter(({ itemId }) => {
      const item = this.itemDB.find(i => i.id === itemId);
      return item && item.category === category;
    });

    const startY = 82;
    const slotH = 40;
    const slotW = GAME_WIDTH - 60;
    const startX = 30;

    if (filteredItems.length === 0) {
      const empty = this.add.text(GAME_WIDTH / 2, startY + 60, 'No items in this category.', {
        fontSize: '13px', color: '#506070', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.uiContainer.add(empty);
      return;
    }

    filteredItems.slice(0, 8).forEach(({ itemId, quantity }, i) => {
      const item = this.itemDB.find(it => it.id === itemId)!;
      const y = startY + i * (slotH + 4);
      const container = this.add.container(startX, y);

      const bg = this.add.rectangle(slotW / 2, slotH / 2, slotW, slotH, 0x202830);
      bg.setStrokeStyle(1, 0x405060);
      bg.setInteractive({ useHandCursor: true });

      const nameText = this.add.text(12, 6, item.name, {
        fontSize: '13px', color: '#e0e8f0', fontFamily: 'monospace',
      });

      const qtyText = this.add.text(12, 22, `x${quantity}`, {
        fontSize: '10px', color: '#a0b0c0', fontFamily: 'monospace',
      });

      container.add([bg, nameText, qtyText]);

      // Use button for healing items
      if (category === 'healing') {
        const useBtn = this.add.rectangle(slotW - 40, slotH / 2, 60, 28, 0x283848);
        useBtn.setStrokeStyle(1, 0x4090d0);
        useBtn.setInteractive({ useHandCursor: true });

        const useLbl = this.add.text(slotW - 40, slotH / 2, 'Use', {
          fontSize: '11px', color: '#80c0f0', fontFamily: 'monospace',
        }).setOrigin(0.5);

        useBtn.on('pointerover', () => { useBtn.setFillStyle(0x384858); });
        useBtn.on('pointerout', () => { useBtn.setFillStyle(0x283848); });
        useBtn.on('pointerdown', () => this.showPartyForHeal(item));

        container.add([useBtn, useLbl]);
      }

      bg.on('pointerover', () => {
        bg.setFillStyle(0x283848);
        bg.setStrokeStyle(2, 0x506880);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x202830);
        bg.setStrokeStyle(1, 0x405060);
      });
      bg.on('pointerdown', () => {
        this.infoText.setText(`${item.name}: ${item.description}`);
      });

      this.uiContainer.add(container);
    });
  }

  private showPartyForHeal(item: ItemData): void {
    this.uiContainer.removeAll(true);

    const pm = this.game.registry.get('partyManager') as PartyManager;
    const party = pm.party;

    const title = this.add.text(GAME_WIDTH / 2, 60,
      `Use ${item.name} on:`,
      { fontSize: '14px', color: '#e0e8f0', fontFamily: 'monospace' },
    ).setOrigin(0.5);
    this.uiContainer.add(title);

    const startY = 86;
    const slotH = 48;
    const slotW = GAME_WIDTH - 60;
    const startX = 30;

    party.forEach((mon, i) => {
      const species = this.monsterDB.find(m => m.id === mon.speciesId)!;
      const y = startY + i * (slotH + 4);
      const container = this.add.container(startX, y);

      const isFainted = mon.currentHP <= 0;
      const isFullHP = mon.currentHP >= mon.maxHP;

      let canUse = false;
      if (item.effect.type === 'healPercent' && isFainted) {
        canUse = true;
      } else if (!isFainted && !isFullHP && item.category === 'healing') {
        canUse = true;
      }

      const bgColor = canUse ? 0x202830 : 0x1a1a20;
      const bg = this.add.rectangle(slotW / 2, slotH / 2, slotW, slotH, bgColor);
      bg.setStrokeStyle(1, canUse ? 0x40b0d0 : 0x303040);

      const color = parseInt(species.placeholderColor.replace('#', ''), 16);
      const miniSprite = MonsterSpriteRenderer.createSprite(this, mon.speciesId, 16, slotH / 2, 20, 20, color);

      const nameText = this.add.text(36, 8, species.name, {
        fontSize: '12px', color: canUse ? '#e0e8f0' : '#555', fontFamily: 'monospace',
      });

      const hpText = this.add.text(36, 24, `HP ${mon.currentHP}/${mon.maxHP}  Lv ${mon.level}`, {
        fontSize: '9px', color: canUse ? '#a0b0c0' : '#444', fontFamily: 'monospace',
      });

      container.add([bg, miniSprite, nameText, hpText]);

      if (canUse) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => { bg.setFillStyle(0x384858); bg.setStrokeStyle(2, 0x40b0d0); });
        bg.on('pointerout', () => { bg.setFillStyle(bgColor); bg.setStrokeStyle(1, 0x40b0d0); });
        bg.on('pointerdown', () => this.useHealItem(item, mon, species.name));
      }

      this.uiContainer.add(container);
    });

    // Back button
    const backX = GAME_WIDTH / 2;
    const backY = startY + Math.min(party.length, 6) * (slotH + 4) + 10;
    const backContainer = this.add.container(backX, backY);
    const backBg = this.add.rectangle(0, 0, 80, 30, 0x282830);
    backBg.setStrokeStyle(1, 0x606080);
    backBg.setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(0, 0, 'Back', {
      fontSize: '12px', color: '#a0b0c0', fontFamily: 'monospace',
    }).setOrigin(0.5);
    backContainer.add([backBg, backLbl]);
    backBg.on('pointerdown', () => {
      this.uiContainer.removeAll(true);
      this.renderTabs();
      this.renderItems();
    });
    this.uiContainer.add(backContainer);
  }

  private useHealItem(item: ItemData, monster: MonsterInstance, speciesName: string): void {
    const applied = InventoryManager.applyHealingItem(item.effect, monster);
    if (!applied) {
      this.statusText.setText("It won't have any effect!");
      return;
    }

    this.inventory.removeItem(item.id);
    this.statusText.setText(`Used ${item.name} on ${speciesName}! HP: ${monster.currentHP}/${monster.maxHP}`);
    this.infoText.setText(`${speciesName}'s HP was restored.`);

    // Re-render to show updated quantities and HP
    this.uiContainer.removeAll(true);
    this.renderTabs();
    this.renderItems();
  }
}
