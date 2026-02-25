import Phaser from 'phaser';
import { Actor } from './Actor';
import { Direction, TileType, TILE_SIZE } from '../types/common';
import { TileMap } from '../map/TileMap';
import { PLAYER_MOVE_DURATION } from '../utils/Constants';

export class Player extends Actor {
  isMoving = false;
  facingDirection: Direction = Direction.DOWN;
  onMoveComplete?: (col: number, row: number) => void;

  constructor(scene: Phaser.Scene, col: number, row: number) {
    super(scene, col, row);
    this.drawCharacter();
  }

  private drawCharacter(): void {
    const gfx = this.scene.add.graphics();

    // Shadow
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillEllipse(0, 12, 20, 8);

    // Body (blue shirt)
    gfx.fillStyle(0x3060c0);
    gfx.fillRect(-7, -2, 14, 14);
    // Shirt highlight
    gfx.fillStyle(0x4078d8);
    gfx.fillRect(-6, -1, 5, 12);

    // Head (skin tone)
    gfx.fillStyle(0xf0c8a0);
    gfx.fillRect(-6, -14, 12, 13);

    // Hair (dark)
    gfx.fillStyle(0x302020);
    gfx.fillRect(-7, -16, 14, 6);
    gfx.fillRect(-7, -14, 2, 4);
    gfx.fillRect(5, -14, 2, 4);

    // Eyes
    gfx.fillStyle(0x202020);
    gfx.fillRect(-4, -8, 2, 3);
    gfx.fillRect(2, -8, 2, 3);

    // Legs (darker blue pants)
    gfx.fillStyle(0x284080);
    gfx.fillRect(-6, 12, 5, 4);
    gfx.fillRect(1, 12, 5, 4);

    // Shoes
    gfx.fillStyle(0x802020);
    gfx.fillRect(-6, 15, 5, 2);
    gfx.fillRect(1, 15, 5, 2);

    this.sprite.add(gfx);
  }

  moveInDirection(direction: Direction, tileMap: TileMap): void {
    if (this.isMoving) return;

    this.facingDirection = direction;

    let targetCol = this.gridPos.x;
    let targetRow = this.gridPos.y;

    switch (direction) {
      case Direction.UP:    targetRow--; break;
      case Direction.DOWN:  targetRow++; break;
      case Direction.LEFT:  targetCol--; break;
      case Direction.RIGHT: targetCol++; break;
    }

    if (!tileMap.isWalkable(targetCol, targetRow, direction)) return;

    this.isMoving = true;

    // One-way ledge hop: jump over the ledge tile and land below it
    const landingTile = tileMap.getTile(targetCol, targetRow);
    if (landingTile === TileType.LEDGE_JUMP && direction === Direction.DOWN) {
      const hopRow = targetRow + 1;
      const finalRow = tileMap.isWalkable(targetCol, hopRow) ? hopRow : targetRow;

      this.gridPos.x = targetCol;
      this.gridPos.y = finalRow;

      const midX = targetCol * TILE_SIZE + TILE_SIZE / 2;
      const midY = targetRow * TILE_SIZE + TILE_SIZE / 2;
      const finalX = targetCol * TILE_SIZE + TILE_SIZE / 2;
      const finalY = finalRow * TILE_SIZE + TILE_SIZE / 2;

      this.scene.tweens.add({
        targets: this.sprite,
        x: midX,
        y: midY - 8,
        duration: PLAYER_MOVE_DURATION * 0.6,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.sprite,
            x: finalX,
            y: finalY,
            duration: PLAYER_MOVE_DURATION * 0.8,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              this.isMoving = false;
              this.onMoveComplete?.(this.gridPos.x, this.gridPos.y);
            },
          });
        },
      });
      return;
    }

    this.gridPos.x = targetCol;
    this.gridPos.y = targetRow;

    const targetX = targetCol * TILE_SIZE + TILE_SIZE / 2;
    const targetY = targetRow * TILE_SIZE + TILE_SIZE / 2;

    this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration: PLAYER_MOVE_DURATION,
      ease: 'Linear',
      onComplete: () => {
        this.isMoving = false;
        this.onMoveComplete?.(this.gridPos.x, this.gridPos.y);
      },
    });
  }
}
