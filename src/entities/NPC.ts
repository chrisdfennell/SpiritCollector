import Phaser from 'phaser';
import { Actor } from './Actor';
import { Direction } from '../types/common';
import type { NPCData, NPCDialogueEntry } from '../types/map';

export class NPC extends Actor {
  readonly npcData: NPCData;
  facingDirection: Direction;

  constructor(scene: Phaser.Scene, col: number, row: number, npcData: NPCData) {
    super(scene, col, row);
    this.npcData = npcData;
    this.facingDirection = npcData.facing;
    this.drawNPC();
  }

  private drawNPC(): void {
    const gfx = this.scene.add.graphics();
    const color = parseInt(this.npcData.placeholderColor.replace('#', ''), 16);

    // Shadow
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillEllipse(0, 12, 20, 8);

    // Body (NPC color)
    gfx.fillStyle(color);
    gfx.fillRect(-7, -2, 14, 14);
    // Highlight
    const r = ((color >> 16) & 0xff);
    const g = ((color >> 8) & 0xff);
    const b = (color & 0xff);
    const highlight = ((Math.min(255, r + 30) << 16) | (Math.min(255, g + 30) << 8) | Math.min(255, b + 30));
    gfx.fillStyle(highlight);
    gfx.fillRect(-6, -1, 5, 12);

    // Head (skin tone)
    gfx.fillStyle(0xf0c8a0);
    gfx.fillRect(-6, -14, 12, 13);

    // Hair (based on NPC color, darker)
    const hairColor = ((Math.max(0, r - 80) << 16) | (Math.max(0, g - 80) << 8) | Math.max(0, b - 80));
    gfx.fillStyle(hairColor);
    gfx.fillRect(-7, -16, 14, 6);
    gfx.fillRect(-7, -14, 2, 4);
    gfx.fillRect(5, -14, 2, 4);

    // Eyes
    gfx.fillStyle(0x202020);
    gfx.fillRect(-4, -8, 2, 3);
    gfx.fillRect(2, -8, 2, 3);

    // Legs
    gfx.fillStyle(0x404040);
    gfx.fillRect(-6, 12, 5, 4);
    gfx.fillRect(1, 12, 5, 4);

    // Shoes
    gfx.fillStyle(0x302020);
    gfx.fillRect(-6, 15, 5, 2);
    gfx.fillRect(1, 15, 5, 2);

    // Facing indicator — small arrow/dot showing which way NPC faces
    gfx.fillStyle(0xffffff, 0.6);
    switch (this.facingDirection) {
      case Direction.DOWN:  gfx.fillRect(-1, 18, 2, 3); break;
      case Direction.UP:    gfx.fillRect(-1, -19, 2, 3); break;
      case Direction.LEFT:  gfx.fillRect(-10, -1, 3, 2); break;
      case Direction.RIGHT: gfx.fillRect(7, -1, 3, 2); break;
    }

    this.sprite.add(gfx);
  }

  getDialogue(flags: Record<string, boolean>): NPCDialogueEntry | null {
    for (const entry of this.npcData.dialogue) {
      if (entry.condition) {
        const flagVal = flags[entry.condition.flag] ?? false;
        if (flagVal !== entry.condition.value) continue;
      }
      return entry;
    }
    return null;
  }
}
