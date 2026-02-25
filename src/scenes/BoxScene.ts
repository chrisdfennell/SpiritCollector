import Phaser from 'phaser';
import { PartyManager, MAX_PARTY_SIZE, BOX_COUNT, BOX_SLOTS } from '../core/PartyManager';
import { SaveManager } from '../core/SaveManager';
import { FlagManager } from '../core/FlagManager';
import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import { GAME_WIDTH, GAME_HEIGHT } from '../types/common';
import { MonsterSpriteRenderer } from '../rendering/MonsterSpriteRenderer';

type Selection = { source: 'party'; index: number } | { source: 'box'; boxIndex: number; slotIndex: number } | null;

const BOX_COLS = 6;
const BOX_ROWS = 5;

export class BoxScene extends Phaser.Scene {
  private pm!: PartyManager;
  private monsterDB: MonsterSpecies[] = [];
  private currentBox = 0;
  private selection: Selection = null;
  private uiContainer!: Phaser.GameObjects.Container;
  private infoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private escKey!: Phaser.Input.Keyboard.Key;
  private pKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'BoxScene' });
  }

  create(): void {
    this.pm = this.game.registry.get('partyManager') as PartyManager;
    this.monsterDB = this.cache.json.get('monsters') as MonsterSpecies[];
    this.selection = null;
    this.currentBox = 0;

    this.escKey = this.input.keyboard!.addKey('ESC');
    this.pKey = this.input.keyboard!.addKey('P');

    // Dimmed background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    // Title
    this.add.text(GAME_WIDTH / 2, 16, 'Spirit Box', {
      fontSize: '20px', color: '#e0e8f0', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 38, 'Press P or ESC to close', {
      fontSize: '10px', color: '#607080', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Status text (shows feedback)
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, '', {
      fontSize: '12px', color: '#c0d0e0', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Info panel at bottom
    const infoBg = this.add.graphics();
    infoBg.fillStyle(0x182028, 0.9);
    infoBg.fillRoundedRect(10, GAME_HEIGHT - 90, GAME_WIDTH - 20, 65, 6);
    infoBg.lineStyle(1, 0x405060);
    infoBg.strokeRoundedRect(10, GAME_HEIGHT - 90, GAME_WIDTH - 20, 65, 6);

    this.infoText = this.add.text(24, GAME_HEIGHT - 82, 'Click a spirit to select it.', {
      fontSize: '12px', color: '#a0b0c0', fontFamily: 'monospace',
      wordWrap: { width: GAME_WIDTH - 48 },
    });

    this.uiContainer = this.add.container(0, 0);
    this.renderAll();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) || Phaser.Input.Keyboard.JustDown(this.pKey)) {
      this.closeBox();
    }
  }

  private closeBox(): void {
    const flags = this.game.registry.get('flagManager');
    const inventory = this.game.registry.get('inventory');
    SaveManager.save(this.pm, flags, inventory, '', { x: 0, y: 0 });
    this.scene.stop();
    this.scene.resume('OverworldScene');
  }

  private renderAll(): void {
    this.uiContainer.removeAll(true);
    this.renderParty();
    this.renderBox();
    this.renderBoxNav();
  }

  // ─── Party column (left side) ─────────────────────────────

  private renderParty(): void {
    const startX = 20;
    const startY = 58;
    const slotH = 48;
    const slotW = 170;

    this.add.text(startX, startY - 14, 'Party', {
      fontSize: '12px', color: '#a0b0c0', fontFamily: 'monospace',
    });

    for (let i = 0; i < MAX_PARTY_SIZE; i++) {
      const y = startY + i * (slotH + 4);
      const mon = this.pm.party[i] as MonsterInstance | undefined;
      const isSelected = this.selection?.source === 'party' && this.selection.index === i;

      const container = this.add.container(startX, y);

      const bgColor = isSelected ? 0x384858 : mon ? 0x202830 : 0x181c22;
      const bg = this.add.rectangle(slotW / 2, slotH / 2, slotW, slotH, bgColor);
      bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0x70a0c0 : 0x405060);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onPartyClick(i));

      container.add(bg);

      if (mon) {
        const species = this.monsterDB.find(m => m.id === mon.speciesId)!;
        const color = parseInt(species.placeholderColor.replace('#', ''), 16);
        const isFainted = mon.currentHP <= 0;

        container.add(MonsterSpriteRenderer.createSprite(this, mon.speciesId, 16, slotH / 2, 20, 20, color));
        container.add(this.add.text(32, 6, species.name, {
          fontSize: '12px', color: isFainted ? '#666' : '#e0e8f0', fontFamily: 'monospace',
        }));
        container.add(this.add.text(32, 22, `Lv ${mon.level}  HP ${mon.currentHP}/${mon.maxHP}`, {
          fontSize: '9px', color: isFainted ? '#664444' : '#a0b0c0', fontFamily: 'monospace',
        }));

        // HP bar
        const barW = 100;
        const pct = Math.max(0, mon.currentHP / mon.maxHP);
        const barColor = pct > 0.5 ? 0x44cc44 : pct > 0.2 ? 0xcccc44 : 0xcc4444;
        container.add(this.add.rectangle(32, 38, barW, 4, 0x101820).setOrigin(0, 0.5));
        container.add(this.add.rectangle(32, 38, barW * pct, 4, barColor).setOrigin(0, 0.5));
      } else {
        container.add(this.add.text(slotW / 2, slotH / 2, '- empty -', {
          fontSize: '10px', color: '#404850', fontFamily: 'monospace',
        }).setOrigin(0.5));
      }

      this.uiContainer.add(container);
    }
  }

  // ─── Box grid (right side) ────────────────────────────────

  private renderBox(): void {
    const gridX = 210;
    const gridY = 72;
    const cellSize = 52;
    const gap = 4;

    for (let r = 0; r < BOX_ROWS; r++) {
      for (let c = 0; c < BOX_COLS; c++) {
        const slotIndex = r * BOX_COLS + c;
        if (slotIndex >= BOX_SLOTS) break;

        const x = gridX + c * (cellSize + gap);
        const y = gridY + r * (cellSize + gap);
        const mon = this.pm.boxes[this.currentBox][slotIndex];
        const isSelected = this.selection?.source === 'box'
          && this.selection.boxIndex === this.currentBox
          && this.selection.slotIndex === slotIndex;

        const container = this.add.container(x, y);

        const bgColor = isSelected ? 0x384858 : mon ? 0x202830 : 0x181c22;
        const bg = this.add.rectangle(cellSize / 2, cellSize / 2, cellSize, cellSize, bgColor);
        bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0x70a0c0 : 0x303840);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.onBoxClick(this.currentBox, slotIndex));

        container.add(bg);

        if (mon) {
          const species = this.monsterDB.find(m => m.id === mon.speciesId)!;
          const color = parseInt(species.placeholderColor.replace('#', ''), 16);

          container.add(MonsterSpriteRenderer.createSprite(this, mon.speciesId, cellSize / 2, 16, 24, 24, color));
          container.add(this.add.text(cellSize / 2, 36, species.name.slice(0, 7), {
            fontSize: '8px', color: '#c0d0e0', fontFamily: 'monospace',
          }).setOrigin(0.5));
          container.add(this.add.text(cellSize / 2, 46, `Lv${mon.level}`, {
            fontSize: '7px', color: '#708090', fontFamily: 'monospace',
          }).setOrigin(0.5));
        }

        this.uiContainer.add(container);
      }
    }
  }

  // ─── Box navigation ───────────────────────────────────────

  private renderBoxNav(): void {
    const navY = 56;
    const navX = 210 + (6 * 56) / 2;

    // Left arrow
    const leftBtn = this.add.text(navX - 60, navY, '<', {
      fontSize: '16px', color: '#a0b0c0', fontFamily: 'monospace',
      backgroundColor: '#283040', padding: { x: 6, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    leftBtn.on('pointerdown', () => {
      this.currentBox = (this.currentBox - 1 + BOX_COUNT) % BOX_COUNT;
      this.selection = null;
      this.renderAll();
    });

    // Box label
    this.add.text(navX, navY, `Box ${this.currentBox + 1}`, {
      fontSize: '13px', color: '#e0e8f0', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Right arrow
    const rightBtn = this.add.text(navX + 60, navY, '>', {
      fontSize: '16px', color: '#a0b0c0', fontFamily: 'monospace',
      backgroundColor: '#283040', padding: { x: 6, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rightBtn.on('pointerdown', () => {
      this.currentBox = (this.currentBox + 1) % BOX_COUNT;
      this.selection = null;
      this.renderAll();
    });

    // These are not inside uiContainer since they're static nav
  }

  // ─── Click handlers ───────────────────────────────────────

  private onPartyClick(index: number): void {
    const mon = this.pm.party[index];
    if (!mon && !this.selection) return;

    // If nothing selected, select this party slot
    if (!this.selection) {
      this.selection = { source: 'party', index };
      this.showMonsterInfo(mon);
      this.statusText.setText('Now click a box slot to deposit, or another party slot to swap.');
      this.renderAll();
      return;
    }

    // If a party slot is already selected
    if (this.selection.source === 'party') {
      if (this.selection.index === index) {
        // Deselect
        this.selection = null;
        this.infoText.setText('Click a spirit to select it.');
        this.statusText.setText('');
        this.renderAll();
        return;
      }
      // Swap two party members
      this.pm.swapPartyOrder(this.selection.index, index);
      this.selection = null;
      this.statusText.setText('Party order swapped!');
      this.renderAll();
      return;
    }

    // If a box slot is selected, withdraw to party or swap
    if (this.selection.source === 'box') {
      const boxMon = this.pm.boxes[this.selection.boxIndex][this.selection.slotIndex];
      if (boxMon && mon) {
        // Swap party ↔ box
        const ok = this.pm.swapPartyBox(index, this.selection.boxIndex, this.selection.slotIndex);
        this.statusText.setText(ok ? 'Swapped!' : "Can't remove last alive spirit.");
      } else if (boxMon && !mon) {
        // Withdraw to empty party slot — shouldn't happen since party array is packed, but handle it
        const ok = this.pm.withdraw(this.selection.boxIndex, this.selection.slotIndex);
        this.statusText.setText(ok ? 'Withdrawn to party!' : 'Party is full.');
      }
      this.selection = null;
      this.renderAll();
    }
  }

  private onBoxClick(boxIndex: number, slotIndex: number): void {
    const mon = this.pm.boxes[boxIndex][slotIndex];

    // If nothing selected
    if (!this.selection) {
      if (mon) {
        this.selection = { source: 'box', boxIndex, slotIndex };
        this.showMonsterInfo(mon);
        this.statusText.setText('Now click a party slot to withdraw, or another box slot.');
        this.renderAll();
      }
      return;
    }

    // If a box slot is already selected
    if (this.selection.source === 'box') {
      if (this.selection.boxIndex === boxIndex && this.selection.slotIndex === slotIndex) {
        this.selection = null;
        this.infoText.setText('Click a spirit to select it.');
        this.statusText.setText('');
        this.renderAll();
        return;
      }
      // Could do box-to-box swap but keep it simple for now
      this.selection = null;
      this.statusText.setText('');
      this.renderAll();
      return;
    }

    // If a party slot is selected, deposit to this box slot
    if (this.selection.source === 'party') {
      if (mon) {
        // Swap party ↔ box
        const ok = this.pm.swapPartyBox(this.selection.index, boxIndex, slotIndex);
        this.statusText.setText(ok ? 'Swapped!' : "Can't remove last alive spirit.");
      } else {
        // Deposit to empty box slot
        const ok = this.pm.deposit(this.selection.index, boxIndex, slotIndex);
        this.statusText.setText(ok ? 'Deposited!' : "Can't deposit (last alive spirit or invalid).");
      }
      this.selection = null;
      this.renderAll();
    }
  }

  private showMonsterInfo(mon: MonsterInstance): void {
    if (!mon) return;
    const species = this.monsterDB.find(m => m.id === mon.speciesId)!;
    const moveDB = this.cache.json.get('moves') as { id: number; name: string }[];
    const moveNames = mon.moves.map(id => {
      const move = moveDB.find(m => m.id === id);
      return move ? move.name : '???';
    }).join(', ');

    this.infoText.setText(
      `${species.name} Lv${mon.level}  HP ${mon.currentHP}/${mon.maxHP}  ` +
      `Type: ${species.types.join('/')}  Moves: ${moveNames}`
    );
  }
}
