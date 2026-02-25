import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types/common';
import type { NPCDialogueEntry, NPCChoice } from '../types/map';

const BOX_HEIGHT = 120;
const BOX_MARGIN = 8;
const BOX_PADDING = 16;
const TYPEWRITER_SPEED = 25; // ms per character

export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private choiceContainer!: Phaser.GameObjects.Container;

  private isVisible = false;
  private currentLines: string[] = [];
  private currentLineIndex = 0;
  private isTyping = false;
  private fullLineText = '';
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private charIndex = 0;

  private currentEntry: NPCDialogueEntry | null = null;
  private onComplete?: () => void;
  private onChoice?: (choice: NPCChoice) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);
    this.container.setVisible(false);

    this.buildUI();
  }

  private buildUI(): void {
    const boxY = GAME_HEIGHT - BOX_HEIGHT - BOX_MARGIN;

    // Background
    this.bg = this.scene.add.graphics();
    this.bg.fillStyle(0x101828, 0.92);
    this.bg.fillRoundedRect(BOX_MARGIN, boxY, GAME_WIDTH - BOX_MARGIN * 2, BOX_HEIGHT, 8);
    this.bg.lineStyle(2, 0x405870);
    this.bg.strokeRoundedRect(BOX_MARGIN, boxY, GAME_WIDTH - BOX_MARGIN * 2, BOX_HEIGHT, 8);
    this.container.add(this.bg);

    // Speaker name
    this.nameText = this.scene.add.text(BOX_MARGIN + BOX_PADDING, boxY + 10, '', {
      fontSize: '14px',
      color: '#70b0e0',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.container.add(this.nameText);

    // Body text
    this.bodyText = this.scene.add.text(BOX_MARGIN + BOX_PADDING, boxY + 32, '', {
      fontSize: '13px',
      color: '#d0d8e0',
      fontFamily: 'monospace',
      wordWrap: { width: GAME_WIDTH - BOX_MARGIN * 2 - BOX_PADDING * 2 },
      lineSpacing: 4,
    });
    this.container.add(this.bodyText);

    // Advance prompt
    this.promptText = this.scene.add.text(
      GAME_WIDTH - BOX_MARGIN - BOX_PADDING, boxY + BOX_HEIGHT - 18,
      '[ Enter ]', {
        fontSize: '10px',
        color: '#607080',
        fontFamily: 'monospace',
      }
    ).setOrigin(1, 0.5);
    this.container.add(this.promptText);

    // Choice container
    this.choiceContainer = this.scene.add.container(0, 0);
    this.container.add(this.choiceContainer);
  }

  show(
    speakerName: string,
    entry: NPCDialogueEntry,
    onComplete: () => void,
    onChoice?: (choice: NPCChoice) => void,
  ): void {
    this.currentEntry = entry;
    this.currentLines = entry.lines;
    this.currentLineIndex = 0;
    this.onComplete = onComplete;
    this.onChoice = onChoice;
    this.isVisible = true;

    this.nameText.setText(speakerName);
    this.choiceContainer.removeAll(true);
    this.promptText.setVisible(true);
    this.container.setVisible(true);

    this.startTypewriter(this.currentLines[0]);
  }

  private startTypewriter(text: string): void {
    this.isTyping = true;
    this.fullLineText = text;
    this.charIndex = 0;
    this.bodyText.setText('');
    this.promptText.setVisible(false);

    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
    }

    this.typewriterTimer = this.scene.time.addEvent({
      delay: TYPEWRITER_SPEED,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.bodyText.setText(this.fullLineText.substring(0, this.charIndex));
        if (this.charIndex >= this.fullLineText.length) {
          this.isTyping = false;
          this.promptText.setVisible(true);
        }
      },
    });
  }

  advance(): void {
    if (!this.isVisible) return;

    // If still typing, show full text immediately
    if (this.isTyping) {
      if (this.typewriterTimer) {
        this.typewriterTimer.destroy();
        this.typewriterTimer = undefined;
      }
      this.bodyText.setText(this.fullLineText);
      this.isTyping = false;
      this.promptText.setVisible(true);
      return;
    }

    // Move to next line
    this.currentLineIndex++;

    if (this.currentLineIndex < this.currentLines.length) {
      this.startTypewriter(this.currentLines[this.currentLineIndex]);
      return;
    }

    // All lines shown — check for choices
    if (this.currentEntry?.choices && this.currentEntry.choices.length > 0) {
      this.showChoices(this.currentEntry.choices);
      return;
    }

    // No choices — complete
    this.finishDialogue();
  }

  private showChoices(choices: NPCChoice[]): void {
    this.promptText.setVisible(false);
    this.choiceContainer.removeAll(true);

    const boxY = GAME_HEIGHT - BOX_HEIGHT - BOX_MARGIN;
    const startY = boxY + 30;
    const choiceWidth = GAME_WIDTH - BOX_MARGIN * 2 - BOX_PADDING * 2;

    this.bodyText.setText('Choose:');

    choices.forEach((choice, i) => {
      const y = startY + 20 + i * 28;

      const bg = this.scene.add.rectangle(
        GAME_WIDTH / 2, y,
        choiceWidth, 24,
        0x203040,
      ).setInteractive({ useHandCursor: true });
      bg.setStrokeStyle(1, 0x405870);

      bg.on('pointerover', () => bg.setFillStyle(0x304860));
      bg.on('pointerout', () => bg.setFillStyle(0x203040));
      bg.on('pointerdown', () => {
        if (this.onChoice) {
          this.onChoice(choice);
        }
        this.finishDialogue();
      });

      const label = this.scene.add.text(GAME_WIDTH / 2, y, choice.label, {
        fontSize: '12px',
        color: '#c0d8f0',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.choiceContainer.add(bg);
      this.choiceContainer.add(label);
    });
  }

  private finishDialogue(): void {
    const callback = this.onComplete;
    this.hide();
    if (callback) {
      callback();
    }
  }

  hide(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = undefined;
    }
    this.isVisible = false;
    this.isTyping = false;
    this.choiceContainer.removeAll(true);
    this.container.setVisible(false);
    this.currentEntry = null;
    this.onComplete = undefined;
    this.onChoice = undefined;
  }

  get visible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.hide();
    this.container.destroy();
  }
}
