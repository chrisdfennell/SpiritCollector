import Phaser from 'phaser';
import { BattleEngine } from '../battle/BattleEngine';
import { BattleAnimator } from '../battle/BattleAnimator';
import { PartyManager } from '../core/PartyManager';
import { InventoryManager } from '../core/InventoryManager';
import { applyXP, applyEvolution } from '../core/LevelManager';
import type { LevelUpResult } from '../core/LevelManager';
import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import type { Move } from '../types/move';
import type { ItemData } from '../types/item';
import type { TurnResult } from '../types/battle';
import { GAME_WIDTH, GAME_HEIGHT } from '../types/common';
import { MonsterSpriteRenderer, type BattleSprite } from '../rendering/MonsterSpriteRenderer';

interface BattleSceneData {
  party: MonsterInstance[];
  wildMonster?: MonsterInstance;
  trainerParty?: MonsterInstance[];
  trainerName?: string;
  defeatFlag?: string;
  reward?: { itemId: number; quantity: number }[];
}

export class BattleScene extends Phaser.Scene {
  private engine!: BattleEngine;
  private animator!: BattleAnimator;

  private playerSprite!: BattleSprite;
  private wildSprite!: BattleSprite;
  private playerHPBar!: Phaser.GameObjects.Rectangle;
  private wildHPBar!: Phaser.GameObjects.Rectangle;
  private playerHPText!: Phaser.GameObjects.Text;
  private wildHPText!: Phaser.GameObjects.Text;
  private playerNameText!: Phaser.GameObjects.Text;
  private playerLevelText!: Phaser.GameObjects.Text;
  private wildNameText!: Phaser.GameObjects.Text;
  private wildLevelText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  private uiContainer!: Phaser.GameObjects.Container;
  private monsterDB: MonsterSpecies[] = [];
  private moveDB: Move[] = [];
  private itemDB: ItemData[] = [];
  private isAnimating = false;
  private forceSwitch = false;

  private isTrainerBattle = false;
  private trainerName = '';
  private defeatFlag = '';
  private battleReward: { itemId: number; quantity: number }[] = [];

  private readonly HP_BAR_WIDTH = 140;
  private readonly BTN_PANEL_Y = GAME_HEIGHT * 0.84;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(data: BattleSceneData): void {
    this.monsterDB = this.cache.json.get('monsters') as MonsterSpecies[];
    this.moveDB = this.cache.json.get('moves') as Move[];
    this.itemDB = (this.cache.json.get('items') ?? []) as ItemData[];
    this.isAnimating = false;
    this.forceSwitch = false;

    this.isTrainerBattle = !!data.trainerParty;
    this.trainerName = data.trainerName ?? '';
    this.defeatFlag = data.defeatFlag ?? '';
    this.battleReward = data.reward ?? [];

    const opponentParty = data.trainerParty ?? [data.wildMonster!];

    this.engine = new BattleEngine(
      data.party,
      opponentParty,
      this.monsterDB,
      this.moveDB,
      this.isTrainerBattle,
    );

    this.animator = new BattleAnimator(this);

    this.drawBattleBackground();
    this.drawBattleUI();

    this.uiContainer = this.add.container(0, 0);
    this.showActionMenu();

    this.cameras.main.fadeIn(300, 0, 0, 0);

    const wildSpecies = this.engine.wildSpeciesData;
    if (this.isTrainerBattle) {
      this.showMessage(`${this.trainerName} wants to battle!`);
    } else {
      this.showMessage(`A wild ${wildSpecies.name} appeared!`);
    }
  }

  // ─── Background ───────────────────────────────────────────

  private drawBattleBackground(): void {
    const gfx = this.add.graphics();

    for (let i = 0; i < GAME_HEIGHT * 0.55; i += 2) {
      const t = i / (GAME_HEIGHT * 0.55);
      const r = Math.floor(0x40 + t * 0x30);
      const g = Math.floor(0x60 + t * 0x40);
      const b = Math.floor(0xa0 + t * 0x20);
      gfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      gfx.fillRect(0, i, GAME_WIDTH, 2);
    }

    gfx.fillStyle(0x5a9830);
    gfx.fillRect(0, GAME_HEIGHT * 0.55, GAME_WIDTH, GAME_HEIGHT * 0.2);

    gfx.fillStyle(0x4a8828, 0.6);
    for (let i = 0; i < GAME_WIDTH; i += 12) {
      const h = GAME_HEIGHT * 0.55;
      gfx.fillRect(i, h + 4, 2, 8);
      gfx.fillRect(i + 6, h + 8, 2, 6);
    }

    gfx.fillStyle(0x488020);
    gfx.fillEllipse(GAME_WIDTH * 0.72, GAME_HEIGHT * 0.38, 180, 30);
    gfx.fillStyle(0x3a6818, 0.6);
    gfx.fillEllipse(GAME_WIDTH * 0.72, GAME_HEIGHT * 0.39, 180, 20);

    gfx.fillStyle(0x488020);
    gfx.fillEllipse(GAME_WIDTH * 0.28, GAME_HEIGHT * 0.62, 200, 30);
    gfx.fillStyle(0x3a6818, 0.6);
    gfx.fillEllipse(GAME_WIDTH * 0.28, GAME_HEIGHT * 0.63, 200, 20);
  }

  // ─── Battle UI (static panels) ────────────────────────────

  private drawBattleUI(): void {
    const gfx = this.add.graphics();
    const wildSpecies = this.engine.wildSpeciesData;

    // Wild monster sprite
    const wildColor = parseInt(wildSpecies.placeholderColor.replace('#', ''), 16);
    this.wildSprite = MonsterSpriteRenderer.createSprite(
      this, this.engine.wildMonster.speciesId,
      GAME_WIDTH * 0.72, GAME_HEIGHT * 0.22, 72, 72, wildColor,
    );

    // Player monster sprite
    this.refreshPlayerSprite();

    // Wild info panel
    gfx.fillStyle(0x202830, 0.85);
    gfx.fillRoundedRect(12, 16, 240, 70, 8);
    gfx.lineStyle(2, 0x506880);
    gfx.strokeRoundedRect(12, 16, 240, 70, 8);

    this.wildNameText = this.add.text(22, 22, wildSpecies.name, {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.wildLevelText = this.add.text(22, 42, `Lv ${this.engine.wildMonster.level}`, {
      fontSize: '12px', color: '#a0b0c0', fontFamily: 'monospace',
    });

    gfx.fillStyle(0x101820);
    gfx.fillRoundedRect(24, 60, this.HP_BAR_WIDTH + 4, 14, 4);
    this.wildHPBar = this.add.rectangle(26, 63, this.HP_BAR_WIDTH, 8, 0x44cc44);
    this.wildHPBar.setOrigin(0, 0);

    this.wildHPText = this.add.text(this.HP_BAR_WIDTH + 34, 62, '', {
      fontSize: '11px', color: '#a0b0c0', fontFamily: 'monospace',
    });
    this.updateHPText(this.wildHPText, this.engine.wildMonster);

    // Player info panel
    const pInfoX = GAME_WIDTH - 250;
    const pInfoY = GAME_HEIGHT * 0.42;

    gfx.fillStyle(0x202830, 0.85);
    gfx.fillRoundedRect(pInfoX - 10, pInfoY, 248, 80, 8);
    gfx.lineStyle(2, 0x506880);
    gfx.strokeRoundedRect(pInfoX - 10, pInfoY, 248, 80, 8);

    this.playerNameText = this.add.text(pInfoX, pInfoY + 6, '', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.playerLevelText = this.add.text(pInfoX, pInfoY + 26, '', {
      fontSize: '12px', color: '#a0b0c0', fontFamily: 'monospace',
    });

    gfx.fillStyle(0x101820);
    gfx.fillRoundedRect(pInfoX + 2, pInfoY + 44, this.HP_BAR_WIDTH + 4, 14, 4);
    this.playerHPBar = this.add.rectangle(pInfoX + 4, pInfoY + 47, this.HP_BAR_WIDTH, 8, 0x44cc44);
    this.playerHPBar.setOrigin(0, 0);

    this.playerHPText = this.add.text(pInfoX + this.HP_BAR_WIDTH + 12, pInfoY + 45, '', {
      fontSize: '11px', color: '#a0b0c0', fontFamily: 'monospace',
    });

    this.refreshPlayerInfo();

    // Bottom panel background
    gfx.fillStyle(0x182028);
    gfx.fillRoundedRect(0, GAME_HEIGHT * 0.73, GAME_WIDTH, GAME_HEIGHT * 0.27 + 4, 0);
    gfx.lineStyle(2, 0x405060);
    gfx.strokeRect(0, GAME_HEIGHT * 0.73, GAME_WIDTH, 2);

    // Message box
    gfx.fillStyle(0x101820, 0.9);
    gfx.fillRoundedRect(12, GAME_HEIGHT * 0.745, GAME_WIDTH - 24, 48, 6);
    gfx.lineStyle(1, 0x405060);
    gfx.strokeRoundedRect(12, GAME_HEIGHT * 0.745, GAME_WIDTH - 24, 48, 6);

    this.messageText = this.add.text(24, GAME_HEIGHT * 0.755, '', {
      fontSize: '15px', color: '#e0e8f0', fontFamily: 'monospace',
      wordWrap: { width: GAME_WIDTH - 48 },
    });
  }

  // ─── Player/Wild sprite & info refresh ──────────────────────

  private refreshPlayerSprite(): void {
    if (this.playerSprite) this.playerSprite.destroy();
    const species = this.engine.activeSpecies;
    const color = parseInt(species.placeholderColor.replace('#', ''), 16);
    this.playerSprite = MonsterSpriteRenderer.createSprite(
      this, this.engine.activeMonster.speciesId,
      GAME_WIDTH * 0.28, GAME_HEIGHT * 0.48, 80, 80, color,
    );
  }

  private refreshPlayerInfo(): void {
    const species = this.engine.activeSpecies;
    const monster = this.engine.activeMonster;
    this.playerNameText.setText(species.name);
    this.playerLevelText.setText(`Lv ${monster.level}`);
    this.updateHPText(this.playerHPText, monster);

    const pct = Math.max(0, monster.currentHP / monster.maxHP);
    this.playerHPBar.displayWidth = pct * this.HP_BAR_WIDTH;
    if (pct > 0.5) this.playerHPBar.setFillStyle(0x44cc44);
    else if (pct > 0.2) this.playerHPBar.setFillStyle(0xcccc44);
    else this.playerHPBar.setFillStyle(0xcc4444);
  }

  private refreshWildSprite(): void {
    if (this.wildSprite) this.wildSprite.destroy();
    const species = this.engine.wildSpeciesData;
    const color = parseInt(species.placeholderColor.replace('#', ''), 16);
    this.wildSprite = MonsterSpriteRenderer.createSprite(
      this, this.engine.wildMonster.speciesId,
      GAME_WIDTH * 0.72, GAME_HEIGHT * 0.22, 72, 72, color,
    );
  }

  private refreshWildInfo(): void {
    const species = this.engine.wildSpeciesData;
    const monster = this.engine.wildMonster;
    this.wildNameText.setText(species.name);
    this.wildLevelText.setText(`Lv ${monster.level}`);
    this.updateHPText(this.wildHPText, monster);

    const pct = Math.max(0, monster.currentHP / monster.maxHP);
    this.wildHPBar.displayWidth = pct * this.HP_BAR_WIDTH;
    if (pct > 0.5) this.wildHPBar.setFillStyle(0x44cc44);
    else if (pct > 0.2) this.wildHPBar.setFillStyle(0xcccc44);
    else this.wildHPBar.setFillStyle(0xcc4444);
  }

  private updateHPText(text: Phaser.GameObjects.Text, monster: MonsterInstance): void {
    text.setText(`${Math.max(0, monster.currentHP)}/${monster.maxHP}`);
  }

  private showMessage(text: string): void {
    this.messageText.setText(text);
  }

  // ─── UI Modes ─────────────────────────────────────────────

  private clearUI(): void {
    this.uiContainer.removeAll(true);
  }

  private showActionMenu(): void {
    this.clearUI();

    const y = this.BTN_PANEL_Y;
    const buttons: { label: string; color: number; accent: number; cb: () => void }[] = [
      { label: 'Fight', color: 0x283848, accent: 0x4090d0, cb: () => this.showMoveMenu() },
      { label: 'Item', color: 0x382828, accent: 0xd04040, cb: () => this.showItemMenu() },
      { label: 'Switch', color: 0x283828, accent: 0x40b040, cb: () => this.showPartyMenu(false) },
    ];

    if (!this.isTrainerBattle) {
      buttons.push({ label: 'Run', color: 0x302028, accent: 0x805060, cb: () => this.onRun() });
    }

    const btnW = 150;
    const gap = 10;
    const totalW = buttons.length * btnW + (buttons.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    buttons.forEach((def, i) => {
      const x = startX + i * (btnW + gap) + btnW / 2;
      const c = this.createButton(x, y, btnW, 36, def.label, def.color, def.accent, def.cb);
      this.uiContainer.add(c);
    });
  }

  private showMoveMenu(): void {
    this.clearUI();

    const y = this.BTN_PANEL_Y;
    const moves = this.engine.getActiveMoves();

    const typeColors: Record<string, number> = {
      fire: 0xc03020, water: 0x3080c0, grass: 0x48a028, electric: 0xc0a020,
      normal: 0x808080, ice: 0x60b0d0, fighting: 0xa03020, poison: 0x8030a0, ground: 0xb08830,
      dragon: 0x7848c0,
    };

    const btnW = 140;
    const gap = 8;
    const backW = 70;
    const totalW = moves.length * (btnW + gap) + backW + gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    moves.forEach((move, i) => {
      const x = startX + i * (btnW + gap) + btnW / 2;
      const container = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, btnW, 36, 0x283040);
      bg.setStrokeStyle(1, 0x506880);
      bg.setInteractive({ useHandCursor: true });

      const accent = this.add.rectangle(-btnW / 2 + 3, 0, 4, 28, typeColors[move.type] ?? 0x808080);
      const label = this.add.text(4, -8, move.name, { fontSize: '13px', color: '#e0e8f0', fontFamily: 'monospace' });
      label.setOrigin(0.5, 0.5);
      const pwr = this.add.text(4, 8, `PWR ${move.power}`, { fontSize: '9px', color: '#708090', fontFamily: 'monospace' });
      pwr.setOrigin(0.5, 0.5);

      container.add([bg, accent, label, pwr]);

      bg.on('pointerover', () => { bg.setFillStyle(0x384858); bg.setStrokeStyle(2, 0x70a0c0); });
      bg.on('pointerout', () => { bg.setFillStyle(0x283040); bg.setStrokeStyle(1, 0x506880); });
      bg.on('pointerdown', () => this.onMoveSelected(move.id));

      this.uiContainer.add(container);
    });

    // Back button
    const bx = startX + moves.length * (btnW + gap) + backW / 2;
    const back = this.createButton(bx, y, backW, 36, 'Back', 0x282830, 0x606080, () => this.showActionMenu());
    this.uiContainer.add(back);
  }

  private showPartyMenu(forced: boolean): void {
    this.clearUI();

    this.forceSwitch = forced;

    const party = this.engine.party;
    const y = this.BTN_PANEL_Y - 60;

    // Title
    const title = this.add.text(GAME_WIDTH / 2, y - 20,
      forced ? 'Choose next spirit:' : 'Switch to:',
      { fontSize: '14px', color: '#e0e8f0', fontFamily: 'monospace' },
    );
    title.setOrigin(0.5);
    this.uiContainer.add(title);

    const slotW = 120;
    const gap = 6;
    const totalW = Math.min(party.length, 6) * (slotW + gap) - gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    party.forEach((mon, i) => {
      const species = this.monsterDB.find(m => m.id === mon.speciesId)!;
      const x = startX + i * (slotW + gap) + slotW / 2;
      const container = this.add.container(x, y + 20);

      const isActive = i === this.engine.activeIndex;
      const isFainted = mon.currentHP <= 0;
      const bgColor = isActive ? 0x304050 : isFainted ? 0x302020 : 0x202830;

      const bg = this.add.rectangle(0, 0, slotW, 60, bgColor);
      bg.setStrokeStyle(1, isActive ? 0x70a0c0 : 0x405060);

      const speciesColor = parseInt(species.placeholderColor.replace('#', ''), 16);
      const miniSprite = MonsterSpriteRenderer.createMiniSprite(
        this, mon.speciesId, -slotW / 2 + 14, -10, speciesColor,
      );

      const nameText = this.add.text(-slotW / 2 + 28, -16, species.name, {
        fontSize: '11px', color: isFainted ? '#666' : '#e0e8f0', fontFamily: 'monospace',
      });

      const hpText = this.add.text(-slotW / 2 + 28, -2, `${mon.currentHP}/${mon.maxHP}`, {
        fontSize: '9px', color: isFainted ? '#664444' : '#a0b0c0', fontFamily: 'monospace',
      });

      const lvText = this.add.text(-slotW / 2 + 28, 10, `Lv ${mon.level}`, {
        fontSize: '9px', color: '#708090', fontFamily: 'monospace',
      });

      // Mini HP bar
      const barBg = this.add.rectangle(-slotW / 2 + 8, 24, slotW - 16, 4, 0x101820);
      barBg.setOrigin(0, 0.5);
      const barW = (slotW - 16) * Math.max(0, mon.currentHP / mon.maxHP);
      const pct = mon.currentHP / mon.maxHP;
      const barColor = pct > 0.5 ? 0x44cc44 : pct > 0.2 ? 0xcccc44 : 0xcc4444;
      const bar = this.add.rectangle(-slotW / 2 + 8, 24, barW, 4, barColor);
      bar.setOrigin(0, 0.5);

      container.add([bg, miniSprite, nameText, hpText, lvText, barBg, bar]);

      // Only allow selecting alive, non-active monsters
      if (!isFainted && !isActive) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => { bg.setFillStyle(0x384858); bg.setStrokeStyle(2, 0x70a0c0); });
        bg.on('pointerout', () => { bg.setFillStyle(bgColor); bg.setStrokeStyle(1, 0x405060); });
        bg.on('pointerdown', () => this.onSwitchSelected(i));
      }

      this.uiContainer.add(container);
    });

    // Back button (only if not forced)
    if (!forced) {
      const back = this.createButton(GAME_WIDTH / 2, y + 70, 80, 30, 'Back', 0x282830, 0x606080,
        () => this.showActionMenu());
      this.uiContainer.add(back);
    }
  }

  // ─── Item Menu ────────────────────────────────────────────

  private showItemMenu(): void {
    this.clearUI();

    const inventory = this.game.registry.get('inventory') as InventoryManager | undefined;
    const allItems = inventory ? inventory.getAllItems() : [];

    // Filter: no key items, no capture items in trainer battles
    const usableItems = allItems.filter(({ itemId }) => {
      const item = this.itemDB.find(i => i.id === itemId);
      if (!item) return false;
      if (item.category === 'keyItem') return false;
      if (item.category === 'capture' && this.isTrainerBattle) return false;
      return true;
    });

    const y = this.BTN_PANEL_Y - 40;

    if (usableItems.length === 0) {
      const noItems = this.add.text(GAME_WIDTH / 2, y, 'No usable items!', {
        fontSize: '14px', color: '#a0b0c0', fontFamily: 'monospace',
      });
      noItems.setOrigin(0.5);
      this.uiContainer.add(noItems);
    } else {
      const slotW = 130;
      const gap = 6;
      const maxShow = Math.min(usableItems.length, 5);
      const totalW = maxShow * (slotW + gap) - gap;
      const startX = (GAME_WIDTH - totalW) / 2;

      usableItems.slice(0, 5).forEach(({ itemId, quantity }, i) => {
        const item = this.itemDB.find(it => it.id === itemId)!;
        const x = startX + i * (slotW + gap) + slotW / 2;
        const isCapture = item.category === 'capture';
        const accent = isCapture ? 0xd04040 : 0x40b0d0;

        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, slotW, 40, 0x202830);
        bg.setStrokeStyle(1, accent);
        bg.setInteractive({ useHandCursor: true });

        const label = this.add.text(0, -6, `${item.name} x${quantity}`, {
          fontSize: '11px', color: '#e0e8f0', fontFamily: 'monospace',
        });
        label.setOrigin(0.5);

        const desc = this.add.text(0, 10, item.description.slice(0, 30), {
          fontSize: '8px', color: '#708090', fontFamily: 'monospace',
        });
        desc.setOrigin(0.5);

        container.add([bg, label, desc]);

        bg.on('pointerover', () => { bg.setFillStyle(0x384858); bg.setStrokeStyle(2, accent); });
        bg.on('pointerout', () => { bg.setFillStyle(0x202830); bg.setStrokeStyle(1, accent); });
        bg.on('pointerdown', () => {
          if (isCapture) {
            this.onCaptureItemUsed(item);
          } else {
            this.showHealTargetMenu(item);
          }
        });

        this.uiContainer.add(container);
      });
    }

    // Back button
    const back = this.createButton(GAME_WIDTH / 2, this.BTN_PANEL_Y + 10, 80, 30, 'Back', 0x282830, 0x606080,
      () => this.showActionMenu());
    this.uiContainer.add(back);
  }

  private showHealTargetMenu(item: ItemData): void {
    this.clearUI();

    const party = this.engine.party;
    const y = this.BTN_PANEL_Y - 60;

    const title = this.add.text(GAME_WIDTH / 2, y - 20,
      `Use ${item.name} on:`,
      { fontSize: '14px', color: '#e0e8f0', fontFamily: 'monospace' },
    );
    title.setOrigin(0.5);
    this.uiContainer.add(title);

    const slotW = 120;
    const gap = 6;
    const totalW = Math.min(party.length, 6) * (slotW + gap) - gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    party.forEach((mon, i) => {
      const species = this.monsterDB.find(m => m.id === mon.speciesId)!;
      const x = startX + i * (slotW + gap) + slotW / 2;
      const container = this.add.container(x, y + 20);

      const isFainted = mon.currentHP <= 0;
      const isFullHP = mon.currentHP >= mon.maxHP;

      // healPercent can revive fainted; other heals only work on alive, non-full
      let canUse = false;
      if (item.effect.type === 'healPercent' && isFainted) {
        canUse = true;
      } else if (!isFainted && !isFullHP && item.category === 'healing') {
        canUse = true;
      }

      const bgColor = canUse ? 0x202830 : 0x1a1a20;
      const bg = this.add.rectangle(0, 0, slotW, 60, bgColor);
      bg.setStrokeStyle(1, canUse ? 0x40b0d0 : 0x303040);

      const speciesColor = parseInt(species.placeholderColor.replace('#', ''), 16);
      const miniSprite = MonsterSpriteRenderer.createMiniSprite(
        this, mon.speciesId, -slotW / 2 + 14, -10, speciesColor,
      );

      const nameText = this.add.text(-slotW / 2 + 28, -16, species.name, {
        fontSize: '11px', color: canUse ? '#e0e8f0' : '#555', fontFamily: 'monospace',
      });

      const hpText = this.add.text(-slotW / 2 + 28, -2, `${mon.currentHP}/${mon.maxHP}`, {
        fontSize: '9px', color: canUse ? '#a0b0c0' : '#444', fontFamily: 'monospace',
      });

      const lvText = this.add.text(-slotW / 2 + 28, 10, `Lv ${mon.level}`, {
        fontSize: '9px', color: '#708090', fontFamily: 'monospace',
      });

      container.add([bg, miniSprite, nameText, hpText, lvText]);

      if (canUse) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => { bg.setFillStyle(0x384858); bg.setStrokeStyle(2, 0x40b0d0); });
        bg.on('pointerout', () => { bg.setFillStyle(bgColor); bg.setStrokeStyle(1, 0x40b0d0); });
        bg.on('pointerdown', () => this.onHealItemUsed(item, i));
      }

      this.uiContainer.add(container);
    });

    const back = this.createButton(GAME_WIDTH / 2, y + 70, 80, 30, 'Back', 0x282830, 0x606080,
      () => this.showItemMenu());
    this.uiContainer.add(back);
  }

  // ─── Move Learning ────────────────────────────────────────

  private showForgetMoveMenu(newMoveId: number, monster: MonsterInstance): Promise<number | null> {
    return new Promise(resolve => {
      this.clearUI();

      const newMove = this.moveDB.find(m => m.id === newMoveId)!;
      const y = this.BTN_PANEL_Y - 50;

      const title = this.add.text(GAME_WIDTH / 2, y - 30,
        `Learn ${newMove.name}? Choose a move to forget:`,
        { fontSize: '13px', color: '#e0e8f0', fontFamily: 'monospace' },
      );
      title.setOrigin(0.5);
      this.uiContainer.add(title);

      const typeColors: Record<string, number> = {
        fire: 0xc03020, water: 0x3080c0, grass: 0x48a028, electric: 0xc0a020,
        normal: 0x808080, ice: 0x60b0d0, fighting: 0xa03020, poison: 0x8030a0, ground: 0xb08830,
        dragon: 0x7848c0,
      };

      // Show current 4 moves + "Don't Learn"
      const currentMoves = monster.moves.map((id, idx) => ({ moveId: id, slotIndex: idx }));
      const btnW = 110;
      const gap = 6;
      const totalItems = currentMoves.length + 1; // +1 for Don't Learn
      const totalW = totalItems * (btnW + gap) - gap;
      const startX = (GAME_WIDTH - totalW) / 2;

      // Show new move info at top
      const newInfo = this.add.text(GAME_WIDTH / 2, y - 12,
        `${newMove.name} — ${newMove.type} — PWR ${newMove.power}`,
        { fontSize: '10px', color: '#44ccff', fontFamily: 'monospace' },
      );
      newInfo.setOrigin(0.5);
      this.uiContainer.add(newInfo);

      currentMoves.forEach((entry, i) => {
        const move = this.moveDB.find(m => m.id === entry.moveId)!;
        const x = startX + i * (btnW + gap) + btnW / 2;
        const container = this.add.container(x, y + 16);

        const accent = typeColors[move.type] ?? 0x808080;
        const bg = this.add.rectangle(0, 0, btnW, 44, 0x202830);
        bg.setStrokeStyle(1, accent);
        bg.setInteractive({ useHandCursor: true });

        const label = this.add.text(0, -10, move.name, {
          fontSize: '11px', color: '#e0e8f0', fontFamily: 'monospace',
        });
        label.setOrigin(0.5);

        const info = this.add.text(0, 6, `PWR ${move.power}`, {
          fontSize: '8px', color: '#708090', fontFamily: 'monospace',
        });
        info.setOrigin(0.5);

        container.add([bg, label, info]);

        bg.on('pointerover', () => { bg.setFillStyle(0x384858); });
        bg.on('pointerout', () => { bg.setFillStyle(0x202830); });
        bg.on('pointerdown', () => {
          this.clearUI();
          resolve(entry.slotIndex);
        });

        this.uiContainer.add(container);
      });

      // Don't Learn button
      const dlX = startX + currentMoves.length * (btnW + gap) + btnW / 2;
      const dlBtn = this.createButton(dlX, y + 16, btnW, 44, "Don't Learn", 0x302020, 0x805050, () => {
        this.clearUI();
        resolve(null);
      });
      this.uiContainer.add(dlBtn);
    });
  }

  // ─── Button helper ────────────────────────────────────────

  private createButton(
    x: number, y: number, w: number, h: number,
    label: string, bgColor: number, accentColor: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, bgColor);
    bg.setStrokeStyle(1, accentColor);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontSize: '14px', color: '#e0e8f0', fontFamily: 'monospace',
    });
    text.setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerover', () => {
      bg.setFillStyle(Phaser.Display.Color.ValueToColor(bgColor).lighten(20).color);
      bg.setStrokeStyle(2, accentColor);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
      bg.setStrokeStyle(1, accentColor);
    });
    bg.on('pointerdown', onClick);

    return container;
  }

  private setUIEnabled(enabled: boolean): void {
    this.uiContainer.setAlpha(enabled ? 1 : 0.35);
    this.uiContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Container) {
        const bg = child.getAt(0);
        if (bg instanceof Phaser.GameObjects.Rectangle) {
          if (enabled) bg.setInteractive(); else bg.disableInteractive();
        }
      }
    });
  }

  // ─── Action handlers ──────────────────────────────────────

  private async onMoveSelected(moveId: number): Promise<void> {
    if (this.isAnimating || this.engine.isOver) return;
    this.isAnimating = true;
    this.setUIEnabled(false);

    const { turnResults } = this.engine.submitAction({ type: 'attack', moveId });

    for (const result of turnResults) {
      await this.playTurnResult(result);
      if (result.defenderFainted) {
        const isWildFainted = result.defenderName === this.engine.wildSpeciesData.name;
        const faintedSprite = isWildFainted ? this.wildSprite : this.playerSprite;
        await this.animator.animateFaint(faintedSprite);
        break;
      }
    }

    await this.afterTurn();
  }

  private async onCaptureItemUsed(item: ItemData): Promise<void> {
    if (this.isAnimating || this.engine.isOver) return;
    this.isAnimating = true;
    this.setUIEnabled(false);

    const inventory = this.game.registry.get('inventory') as InventoryManager;
    inventory.removeItem(item.id);

    const multiplier = item.effect.type === 'capture' ? item.effect.multiplier : 1.0;

    this.showMessage(`You used a ${item.name}!`);
    await this.delay(500);

    const { turnResults, catchResult } = this.engine.submitAction({ type: 'catch', catchMultiplier: multiplier });

    if (catchResult) {
      await this.animator.animateCatchAttempt(this.wildSprite, catchResult.shakes, catchResult.success);

      if (catchResult.success) {
        const wildSpecies = this.engine.wildSpeciesData;
        this.showMessage(`Gotcha! ${wildSpecies.name} was caught!`);

        const pm = this.game.registry.get('partyManager') as PartyManager;
        const result = pm.addMonster(this.engine.wildMonster);
        await this.delay(1500);

        if (result.location === 'box') {
          this.showMessage(`${wildSpecies.name} was sent to Box ${(result.boxIndex ?? 0) + 1}.`);
          await this.delay(1500);
        }

        this.returnToOverworld();
        return;
      } else {
        this.showMessage("Oh no! It broke free!");
        await this.delay(800);
      }
    }

    // Opponent attacks after failed catch
    for (const result of turnResults) {
      await this.playTurnResult(result);
      if (result.defenderFainted) {
        await this.animator.animateFaint(this.playerSprite);
        break;
      }
    }

    await this.afterTurn();
  }

  private async onHealItemUsed(item: ItemData, partyIndex: number): Promise<void> {
    if (this.isAnimating || this.engine.isOver) return;
    this.isAnimating = true;
    this.setUIEnabled(false);

    const inventory = this.game.registry.get('inventory') as InventoryManager;
    const monster = this.engine.party[partyIndex];
    const species = this.monsterDB.find(m => m.id === monster.speciesId)!;

    const prevHP = monster.currentHP;
    const applied = InventoryManager.applyHealingItem(item.effect, monster);

    if (!applied) {
      this.showMessage("It won't have any effect!");
      await this.delay(800);
      this.isAnimating = false;
      this.showItemMenu();
      this.setUIEnabled(true);
      return;
    }

    inventory.removeItem(item.id);

    this.showMessage(`Used ${item.name} on ${species.name}!`);
    await this.delay(600);

    // If the active monster was healed, animate its HP bar
    if (partyIndex === this.engine.activeIndex) {
      await this.animator.animateHPBar(
        this.playerHPBar, prevHP, monster.currentHP, monster.maxHP, this.HP_BAR_WIDTH,
      );
      this.updateHPText(this.playerHPText, monster);
    }

    // Opponent gets a free attack
    const { turnResults } = this.engine.submitAction({ type: 'item' });

    for (const result of turnResults) {
      await this.playTurnResult(result);
      if (result.defenderFainted) {
        await this.animator.animateFaint(this.playerSprite);
        break;
      }
    }

    await this.afterTurn();
  }

  private async onSwitchSelected(index: number): Promise<void> {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.setUIEnabled(false);

    const species = this.monsterDB.find(m => m.id === this.engine.party[index].speciesId)!;

    if (this.forceSwitch) {
      // Forced switch after faint — no wild attack penalty
      this.engine.forceSwitch(index);
      this.showMessage(`Go, ${species.name}!`);
      this.refreshPlayerSprite();
      this.refreshPlayerInfo();
      await this.delay(800);

      this.isAnimating = false;
      this.forceSwitch = false;
      this.showActionMenu();
      this.setUIEnabled(true);
      return;
    }

    // Voluntary switch — costs a turn
    this.showMessage(`Come back! Go, ${species.name}!`);
    await this.delay(600);

    const { turnResults } = this.engine.submitAction({ type: 'switch', switchToIndex: index });

    this.refreshPlayerSprite();
    this.refreshPlayerInfo();
    await this.delay(400);

    for (const result of turnResults) {
      await this.playTurnResult(result);
      if (result.defenderFainted) {
        await this.animator.animateFaint(this.playerSprite);
        break;
      }
    }

    await this.afterTurn();
  }

  private async onRun(): Promise<void> {
    if (this.isAnimating || this.engine.isOver) return;
    this.isAnimating = true;
    this.setUIEnabled(false);

    this.engine.submitAction({ type: 'run' });
    this.showMessage('Got away safely!');

    await this.delay(1200);
    this.returnToOverworld();
  }

  // ─── Turn resolution ──────────────────────────────────────

  private async afterTurn(): Promise<void> {
    if (this.engine.opponentNeedsSwitch) {
      // Trainer's mon fainted — award XP, then send next
      await this.handleOpponentFainted();
    } else if (this.engine.isOver) {
      await this.showBattleEnd();
    } else if (this.engine.needsSwitch) {
      // Active fainted but party has alive members — force switch
      this.isAnimating = false;
      this.showPartyMenu(true);
    } else {
      this.isAnimating = false;
      this.showActionMenu();
      this.setUIEnabled(true);
    }
  }

  private async handleOpponentFainted(): Promise<void> {
    const xp = this.engine.xpGained;
    const gold = this.engine.goldReward;
    const monster = this.engine.activeMonster;
    const activeSpecies = this.engine.activeSpecies;

    this.showMessage(`${activeSpecies.name} gained ${xp} XP!`);
    await this.delay(1200);

    if (gold > 0) {
      const inventory = this.game.registry.get('inventory') as InventoryManager | undefined;
      if (inventory) inventory.addGold(gold);
      this.showMessage(`Got ${gold}G for winning!`);
      await this.delay(1000);
    }

    const levelResults = applyXP(monster, xp, activeSpecies, this.monsterDB);
    if (levelResults.length > 0) {
      await this.processLevelUpResults(levelResults, monster);
    }

    // Advance to next opponent
    this.engine.advanceOpponent();
    this.refreshWildSprite();
    this.refreshWildInfo();

    const nextSpecies = this.engine.wildSpeciesData;
    this.showMessage(`${this.trainerName} sent out ${nextSpecies.name}!`);
    await this.delay(1200);

    this.isAnimating = false;
    this.showActionMenu();
    this.setUIEnabled(true);
  }

  private async processLevelUpResults(results: LevelUpResult[], monster: MonsterInstance): Promise<void> {
    for (const result of results) {
      const species = this.monsterDB.find(m => m.id === monster.speciesId)!;

      this.showMessage(`${species.name} grew to level ${result.newLevel}!`);
      this.refreshPlayerInfo();
      await this.delay(1500);

      // Handle new moves
      for (const newMoveId of result.newMoves) {
        const move = this.moveDB.find(m => m.id === newMoveId)!;

        if (monster.moves.length < 4) {
          monster.moves.push(newMoveId);
          this.showMessage(`${species.name} learned ${move.name}!`);
          await this.delay(1500);
        } else {
          this.showMessage(`${species.name} wants to learn ${move.name}...`);
          await this.delay(1000);
          this.showMessage(`But ${species.name} already knows 4 moves.`);
          await this.delay(1000);

          const slotIndex = await this.showForgetMoveMenu(newMoveId, monster);

          if (slotIndex !== null) {
            const forgotMove = this.moveDB.find(m => m.id === monster.moves[slotIndex])!;
            monster.moves[slotIndex] = newMoveId;
            this.showMessage(`${species.name} forgot ${forgotMove.name} and learned ${move.name}!`);
            await this.delay(1500);
          } else {
            this.showMessage(`${species.name} did not learn ${move.name}.`);
            await this.delay(1200);
          }
        }
      }

      // Handle evolution
      if (result.evolution) {
        const oldName = species.name;
        const evoSpecies = this.monsterDB.find(m => m.id === result.evolution!.speciesId)!;
        const newColor = parseInt(evoSpecies.placeholderColor.replace('#', ''), 16);

        this.showMessage(`What? ${oldName} is evolving!`);
        await this.delay(1200);

        await this.animator.animateEvolution(this.playerSprite, newColor);

        applyEvolution(monster, result.evolution.speciesId, this.monsterDB);

        this.refreshPlayerSprite();
        this.refreshPlayerInfo();

        this.showMessage(`Congratulations! ${oldName} evolved into ${evoSpecies.name}!`);
        await this.delay(2000);
      }
    }
  }

  private async playTurnResult(result: TurnResult): Promise<void> {
    const wildName = this.engine.wildSpeciesData.name;
    const isWildAttacking = result.attackerName === wildName;
    const attackerSprite = isWildAttacking ? this.wildSprite : this.playerSprite;
    const defenderSprite = isWildAttacking ? this.playerSprite : this.wildSprite;
    const defenderHPBar = isWildAttacking ? this.playerHPBar : this.wildHPBar;
    const defenderHPText = isWildAttacking ? this.playerHPText : this.wildHPText;
    const defenderMonster = isWildAttacking ? this.engine.activeMonster : this.engine.wildMonster;

    this.showMessage(`${result.attackerName} used ${result.moveName}!`);
    await this.delay(600);

    if (result.missed) {
      this.showMessage(`${result.attackerName}'s attack missed!`);
      await this.delay(800);
      return;
    }

    await this.animator.animateAttack(attackerSprite, defenderSprite);

    const prevHP = result.defenderRemainingHP + result.damage;
    await this.animator.animateHPBar(
      defenderHPBar, prevHP, result.defenderRemainingHP,
      defenderMonster.maxHP, this.HP_BAR_WIDTH,
    );
    this.updateHPText(defenderHPText, defenderMonster);

    if (result.effectiveness > 1) {
      this.showMessage("It's super effective!");
      await this.delay(800);
    } else if (result.effectiveness > 0 && result.effectiveness < 1) {
      this.showMessage("It's not very effective...");
      await this.delay(800);
    } else if (result.effectiveness === 0) {
      this.showMessage("It had no effect.");
      await this.delay(800);
    }

    if (result.isCritical) {
      this.showMessage('A critical hit!');
      await this.delay(800);
    }
  }

  private async showBattleEnd(): Promise<void> {
    if (this.engine.winner === 'player' && !this.engine.caught) {
      // Award XP for the last defeated opponent
      const xp = this.engine.xpGained;
      const monster = this.engine.activeMonster;
      const activeSpecies = this.engine.activeSpecies;

      if (this.isTrainerBattle) {
        this.showMessage(`You defeated ${this.trainerName}!`);
      } else {
        const wildName = this.engine.wildSpeciesData.name;
        this.showMessage(`${wildName} fainted! You win!`);
      }
      await this.delay(1500);

      if (xp > 0) {
        this.showMessage(`${activeSpecies.name} gained ${xp} XP!`);
        await this.delay(1200);

        const levelResults = applyXP(monster, xp, activeSpecies, this.monsterDB);
        if (levelResults.length > 0) {
          await this.processLevelUpResults(levelResults, monster);
        }
      }

      // Award gold
      const gold = this.engine.goldReward;
      if (gold > 0) {
        const inventory = this.game.registry.get('inventory') as InventoryManager | undefined;
        if (inventory) inventory.addGold(gold);
        this.showMessage(`Got ${gold}G for winning!`);
        await this.delay(1000);
      }

      // Trainer defeat: set flag and give rewards
      if (this.isTrainerBattle && this.defeatFlag) {
        const flags = this.game.registry.get('flagManager') as
          { set: (flag: string, value: boolean) => void } | undefined;
        if (flags) {
          flags.set(this.defeatFlag, true);
        }

        if (this.battleReward.length > 0) {
          const inventory = this.game.registry.get('inventory') as InventoryManager | undefined;
          if (inventory) {
            for (const r of this.battleReward) {
              inventory.addItem(r.itemId, r.quantity);
              const itemData = this.itemDB.find(it => it.id === r.itemId);
              if (itemData) {
                this.showMessage(`Received ${itemData.name} x${r.quantity}!`);
                await this.delay(1200);
              }
            }
          }
        }
      }
    } else if (this.engine.winner === 'wild') {
      this.showMessage('All your spirits fainted...');
    }

    await this.delay(2000);
    this.returnToOverworld();
  }

  private returnToOverworld(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('OverworldScene');
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.time.delayedCall(ms, () => resolve());
    });
  }
}
