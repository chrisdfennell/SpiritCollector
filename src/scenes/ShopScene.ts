import Phaser from 'phaser';
import { InventoryManager } from '../core/InventoryManager';
import type { ItemData } from '../types/item';
import { GAME_WIDTH, GAME_HEIGHT } from '../types/common';

interface ShopSceneData {
  shopItems: number[];
}

export class ShopScene extends Phaser.Scene {
  private inventory!: InventoryManager;
  private itemDB: ItemData[] = [];
  private shopItemIds: number[] = [];
  private uiContainer!: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private escKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(data: ShopSceneData): void {
    this.inventory = this.game.registry.get('inventory') as InventoryManager;
    this.itemDB = (this.cache.json.get('items') ?? []) as ItemData[];
    this.shopItemIds = data.shopItems ?? [];

    this.escKey = this.input.keyboard!.addKey('ESC');
    this.sKey = this.input.keyboard!.addKey('S');

    // Dimmed background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    // Title
    this.add.text(GAME_WIDTH / 2, 16, 'Shop', {
      fontSize: '20px', color: '#e0e8f0', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Gold display
    this.goldText = this.add.text(GAME_WIDTH / 2, 38, '', {
      fontSize: '13px', color: '#f0d060', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.refreshGoldText();

    this.add.text(GAME_WIDTH / 2, 54, 'Press S or ESC to close', {
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
    this.renderItems();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) || Phaser.Input.Keyboard.JustDown(this.sKey)) {
      this.closeShop();
    }
  }

  private closeShop(): void {
    this.scene.stop();
    this.scene.resume('OverworldScene');
  }

  private refreshGoldText(): void {
    this.goldText.setText(`Gold: ${this.inventory.getGold()}G`);
  }

  private renderItems(): void {
    this.uiContainer.removeAll(true);

    const items = this.shopItemIds
      .map(id => this.itemDB.find(i => i.id === id))
      .filter((i): i is ItemData => i !== undefined && i.price > 0);

    const startY = 72;
    const slotH = 40;
    const slotW = GAME_WIDTH - 60;
    const startX = 30;

    if (items.length === 0) {
      const empty = this.add.text(GAME_WIDTH / 2, startY + 60, 'Nothing for sale here.', {
        fontSize: '13px', color: '#506070', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.uiContainer.add(empty);
      return;
    }

    items.slice(0, 8).forEach((item, i) => {
      const y = startY + i * (slotH + 4);
      const container = this.add.container(startX, y);
      const owned = this.inventory.getQuantity(item.id);
      const canAfford = this.inventory.getGold() >= item.price;

      const bg = this.add.rectangle(slotW / 2, slotH / 2, slotW, slotH, 0x202830);
      bg.setStrokeStyle(1, 0x405060);
      bg.setInteractive({ useHandCursor: true });

      const nameText = this.add.text(12, 6, item.name, {
        fontSize: '13px', color: '#e0e8f0', fontFamily: 'monospace',
      });

      const priceText = this.add.text(12, 22, `${item.price}G  (owned: ${owned})`, {
        fontSize: '10px', color: canAfford ? '#f0d060' : '#aa4444', fontFamily: 'monospace',
      });

      // Buy button
      const buyBtn = this.add.rectangle(slotW - 40, slotH / 2, 60, 28,
        canAfford ? 0x283848 : 0x222228);
      buyBtn.setStrokeStyle(1, canAfford ? 0x4090d0 : 0x333340);

      const buyLbl = this.add.text(slotW - 40, slotH / 2, 'Buy', {
        fontSize: '11px', color: canAfford ? '#80c0f0' : '#555', fontFamily: 'monospace',
      }).setOrigin(0.5);

      if (canAfford) {
        buyBtn.setInteractive({ useHandCursor: true });
        buyBtn.on('pointerover', () => { buyBtn.setFillStyle(0x384858); });
        buyBtn.on('pointerout', () => { buyBtn.setFillStyle(0x283848); });
        buyBtn.on('pointerdown', () => this.buyItem(item));
      }

      container.add([bg, nameText, priceText, buyBtn, buyLbl]);

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

  private buyItem(item: ItemData): void {
    if (!this.inventory.spendGold(item.price)) {
      this.statusText.setText('Not enough gold!');
      return;
    }

    this.inventory.addItem(item.id);
    this.statusText.setText(`Bought ${item.name}!`);
    this.refreshGoldText();
    this.renderItems();
  }
}
