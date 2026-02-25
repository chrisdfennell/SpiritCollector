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

    // One-way ledge hop: jump over the ledge tile and land on the other side
    const landingTile = tileMap.getTile(targetCol, targetRow);
    const ledgeHop = this.getLedgeHop(landingTile, direction);
    if (ledgeHop) {
      const hopCol = targetCol + ledgeHop.dc;
      const hopRow = targetRow + ledgeHop.dr;
      const finalCol = tileMap.isWalkable(hopCol, hopRow) ? hopCol : targetCol;
      const finalRow = tileMap.isWalkable(hopCol, hopRow) ? hopRow : targetRow;

      this.gridPos.x = finalCol;
      this.gridPos.y = finalRow;

      const midX = targetCol * TILE_SIZE + TILE_SIZE / 2;
      const midY = targetRow * TILE_SIZE + TILE_SIZE / 2;
      const finalX = finalCol * TILE_SIZE + TILE_SIZE / 2;
      const finalY = finalRow * TILE_SIZE + TILE_SIZE / 2;

      // Arc offset: lift sprite perpendicular to movement direction
      const arcX = ledgeHop.arcX ?? 0;
      const arcY = ledgeHop.arcY ?? 0;

      this.scene.tweens.add({
        targets: this.sprite,
        x: midX + arcX,
        y: midY + arcY,
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

  /** Returns hop delta and arc offset if the tile is a directional ledge, or null. */
  private getLedgeHop(
    tile: TileType,
    dir: Direction,
  ): { dc: number; dr: number; arcX?: number; arcY?: number } | null {
    if (tile === TileType.LEDGE_JUMP && dir === Direction.DOWN) {
      return { dc: 0, dr: 1, arcY: -8 };
    }
    if (tile === TileType.LEDGE_JUMP_NORTH && dir === Direction.UP) {
      return { dc: 0, dr: -1, arcY: 8 };
    }
    if (tile === TileType.LEDGE_JUMP_WEST && dir === Direction.LEFT) {
      return { dc: -1, dr: 0, arcX: 8 };
    }
    if (tile === TileType.LEDGE_JUMP_EAST && dir === Direction.RIGHT) {
      return { dc: 1, dr: 0, arcX: -8 };
    }
    return null;
  }
}
