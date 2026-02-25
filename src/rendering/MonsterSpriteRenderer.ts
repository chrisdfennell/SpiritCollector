import Phaser from 'phaser';
import { monsterSprites } from '../data/monsterSprites';

export type BattleSprite = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;

/**
 * Loads SVG monster sprites as Phaser textures and creates sprite game objects.
 * Falls back to colored rectangles when no SVG exists for a species.
 */
export class MonsterSpriteRenderer {
  /** Call during BootScene preload to register all SVG textures */
  static preloadAllTextures(scene: Phaser.Scene): void {
    for (const [id, svg] of Object.entries(monsterSprites) as [string, string][]) {
      const key = `monster_${id}`;
      const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      scene.load.image(key, dataUrl);
    }
  }

  /** Create a battle sprite for a monster species */
  static createSprite(
    scene: Phaser.Scene,
    speciesId: number,
    x: number,
    y: number,
    w: number,
    h: number,
    fallbackColor: number,
  ): BattleSprite {
    const key = `monster_${speciesId}`;
    if (scene.textures.exists(key)) {
      const image = scene.add.image(x, y, key);
      image.setDisplaySize(w, h);
      return image;
    }
    // Fallback to colored rectangle
    const rect = scene.add.rectangle(x, y, w, h, fallbackColor);
    rect.setStrokeStyle(2, 0x000000, 0.3);
    return rect;
  }

  /** Create a small preview sprite for party menus */
  static createMiniSprite(
    scene: Phaser.Scene,
    speciesId: number,
    x: number,
    y: number,
    fallbackColor: number,
  ): BattleSprite {
    return MonsterSpriteRenderer.createSprite(scene, speciesId, x, y, 16, 16, fallbackColor);
  }
}
