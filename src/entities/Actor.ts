import Phaser from 'phaser';
import { Position, TILE_SIZE } from '../types/common';

export class Actor {
  gridPos: Position;
  sprite: Phaser.GameObjects.Container;
  protected scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, col: number, row: number) {
    this.scene = scene;
    this.gridPos = { x: col, y: row };

    const px = col * TILE_SIZE + TILE_SIZE / 2;
    const py = row * TILE_SIZE + TILE_SIZE / 2;

    this.sprite = scene.add.container(px, py);
    this.sprite.setDepth(10);
  }

  setGridPosition(col: number, row: number): void {
    this.gridPos.x = col;
    this.gridPos.y = row;
    this.sprite.x = col * TILE_SIZE + TILE_SIZE / 2;
    this.sprite.y = row * TILE_SIZE + TILE_SIZE / 2;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
