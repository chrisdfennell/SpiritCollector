import Phaser from 'phaser';
import { TileMap } from './TileMap';
import { TileType, TILE_SIZE } from '../types/common';
import type { BiomeType } from '../types/map';

/** Per-biome color palettes for terrain tiles */
interface BiomePalette {
  ground: number;
  groundAccent: number;
  tallGrassBase: number;
  tallGrassBlade: number;
  tallGrassTip: number;
  pathBase: number;
  pathAccent: number;
  pathLight: number;
  waterBase: number;
  waterHighlight: number;
  waterShimmer: number;
  ledgeBase: number;
  ledgeFace: number;
  ledgeHighlight: number;
}

const BIOME_PALETTES: Record<BiomeType, BiomePalette> = {
  town: {
    ground: 0x7ec850, groundAccent: 0x6db840,
    tallGrassBase: 0x4a9e28, tallGrassBlade: 0x3d8820, tallGrassTip: 0x60c040,
    pathBase: 0xc8b078, pathAccent: 0xb8a068, pathLight: 0xd8c890,
    waterBase: 0x3080c8, waterHighlight: 0x50a0e8, waterShimmer: 0x80c8f8,
    ledgeBase: 0x5a9030, ledgeFace: 0x487020, ledgeHighlight: 0x70b040,
  },
  forest: {
    ground: 0x5a8838, groundAccent: 0x4a7828,
    tallGrassBase: 0x387020, tallGrassBlade: 0x2d5c18, tallGrassTip: 0x50a030,
    pathBase: 0x8b7040, pathAccent: 0x7a6030, pathLight: 0xa08850,
    waterBase: 0x286838, waterHighlight: 0x388848, waterShimmer: 0x60a870,
    ledgeBase: 0x4a7828, ledgeFace: 0x386018, ledgeHighlight: 0x609838,
  },
  desert: {
    ground: 0xd8c080, groundAccent: 0xc8b070,
    tallGrassBase: 0xb0a050, tallGrassBlade: 0x989040, tallGrassTip: 0xc8b860,
    pathBase: 0xe0d098, pathAccent: 0xd0c088, pathLight: 0xf0e0b0,
    waterBase: 0x4890a0, waterHighlight: 0x60a8b8, waterShimmer: 0x88c8d8,
    ledgeBase: 0xc0a860, ledgeFace: 0xa89048, ledgeHighlight: 0xd8c078,
  },
  tundra: {
    ground: 0xc8d8e0, groundAccent: 0xb0c8d0,
    tallGrassBase: 0x90b8c8, tallGrassBlade: 0x78a0b0, tallGrassTip: 0xa8d0e0,
    pathBase: 0xa0b0b8, pathAccent: 0x90a0a8, pathLight: 0xb8c8d0,
    waterBase: 0x4878a8, waterHighlight: 0x6090c0, waterShimmer: 0x88b0d8,
    ledgeBase: 0xa0b8c0, ledgeFace: 0x88a0a8, ledgeHighlight: 0xb8d0d8,
  },
  lake: {
    ground: 0x68b048, groundAccent: 0x58a038,
    tallGrassBase: 0x409828, tallGrassBlade: 0x308018, tallGrassTip: 0x58b840,
    pathBase: 0x90a870, pathAccent: 0x809860, pathLight: 0xa8c088,
    waterBase: 0x2870b8, waterHighlight: 0x4090d8, waterShimmer: 0x70b8f0,
    ledgeBase: 0x509830, ledgeFace: 0x408020, ledgeHighlight: 0x68b048,
  },
  interior: {
    ground: 0x7ec850, groundAccent: 0x6db840,
    tallGrassBase: 0x4a9e28, tallGrassBlade: 0x3d8820, tallGrassTip: 0x60c040,
    pathBase: 0xc8b078, pathAccent: 0xb8a068, pathLight: 0xd8c890,
    waterBase: 0x3080c8, waterHighlight: 0x50a0e8, waterShimmer: 0x80c8f8,
    ledgeBase: 0x5a9030, ledgeFace: 0x487020, ledgeHighlight: 0x70b040,
  },
  volcano: {
    ground: 0x584040, groundAccent: 0x483030,
    tallGrassBase: 0x705030, tallGrassBlade: 0x604020, tallGrassTip: 0x906040,
    pathBase: 0x686058, pathAccent: 0x585048, pathLight: 0x787068,
    waterBase: 0xd04010, waterHighlight: 0xe06020, waterShimmer: 0xf08030,
    ledgeBase: 0x605040, ledgeFace: 0x484038, ledgeHighlight: 0x786858,
  },
  swamp: {
    ground: 0x3a5030, groundAccent: 0x2a4020,
    tallGrassBase: 0x2a4820, tallGrassBlade: 0x1e3818, tallGrassTip: 0x406030,
    pathBase: 0x5a6040, pathAccent: 0x4a5030, pathLight: 0x6a7050,
    waterBase: 0x305028, waterHighlight: 0x406838, waterShimmer: 0x508048,
    ledgeBase: 0x3a5030, ledgeFace: 0x2a4020, ledgeHighlight: 0x4a6040,
  },
  mountain: {
    ground: 0x808890, groundAccent: 0x707880,
    tallGrassBase: 0x608048, tallGrassBlade: 0x507038, tallGrassTip: 0x709858,
    pathBase: 0x989898, pathAccent: 0x888888, pathLight: 0xa8a8a8,
    waterBase: 0x3868a0, waterHighlight: 0x5080b8, waterShimmer: 0x78a0d0,
    ledgeBase: 0x707880, ledgeFace: 0x606868, ledgeHighlight: 0x888e98,
  },
  coastal: {
    ground: 0xe0d8a0, groundAccent: 0xd0c890,
    tallGrassBase: 0x60a840, tallGrassBlade: 0x509030, tallGrassTip: 0x78c058,
    pathBase: 0xf0e8c0, pathAccent: 0xe0d8b0, pathLight: 0xf8f0d0,
    waterBase: 0x1878c0, waterHighlight: 0x3898e0, waterShimmer: 0x68b8f0,
    ledgeBase: 0xc0b880, ledgeFace: 0xa8a068, ledgeHighlight: 0xd8d098,
  },
};

export class MapRenderer {
  private scene: Phaser.Scene;
  private tileMap: TileMap;
  private gfx!: Phaser.GameObjects.Graphics;
  private palette: BiomePalette;

  constructor(scene: Phaser.Scene, tileMap: TileMap, biome: BiomeType = 'town') {
    this.scene = scene;
    this.tileMap = tileMap;
    this.palette = BIOME_PALETTES[biome] || BIOME_PALETTES.town;
  }

  render(): void {
    this.gfx = this.scene.add.graphics();

    for (let row = 0; row < this.tileMap.rows; row++) {
      for (let col = 0; col < this.tileMap.cols; col++) {
        const tileType = this.tileMap.getTile(col, row);
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.drawTile(tileType, px, py);
      }
    }
  }

  private drawTile(type: TileType, x: number, y: number): void {
    const S = TILE_SIZE;

    switch (type) {
      case TileType.GROUND:   this.drawGround(x, y, S); break;
      case TileType.WALL:     this.drawWall(x, y, S); break;
      case TileType.TALL_GRASS: this.drawTallGrass(x, y, S); break;
      case TileType.PATH:     this.drawPath(x, y, S); break;
      case TileType.WATER:    this.drawWater(x, y, S); break;
      case TileType.FENCE:    this.drawFence(x, y, S); break;
      case TileType.HOUSE_WALL: this.drawHouseWall(x, y, S); break;
      case TileType.HOUSE_DOOR: this.drawHouseDoor(x, y, S); break;
      case TileType.ROOF:     this.drawRoof(x, y, S); break;
      case TileType.FLOWERS:  this.drawFlowers(x, y, S); break;
      case TileType.LEDGE:      this.drawLedge(x, y, S); break;
      case TileType.SIGN:       this.drawSign(x, y, S); break;
      case TileType.LEDGE_JUMP: this.drawLedgeJump(x, y, S); break;
    }
  }

  private drawGround(x: number, y: number, s: number): void {
    const p = this.palette;
    this.gfx.fillStyle(p.ground);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(p.groundAccent, 0.5);
    const seed = (x * 7 + y * 13) % 17;
    if (seed < 4) {
      this.gfx.fillRect(x + 6, y + 8, 2, 2);
      this.gfx.fillRect(x + 20, y + 22, 2, 2);
    }
    if (seed < 8) {
      this.gfx.fillRect(x + 14, y + 4, 2, 2);
      this.gfx.fillRect(x + 24, y + 14, 2, 2);
    }
  }

  private drawWall(x: number, y: number, s: number): void {
    this.gfx.fillStyle(0x484848);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(0x5a5a5a);
    this.gfx.fillRect(x + 1, y + 1, 14, 14);
    this.gfx.fillRect(x + 17, y + 1, 14, 14);
    this.gfx.fillRect(x + 9, y + 17, 14, 14);

    this.gfx.fillStyle(0x6e6e6e);
    this.gfx.fillRect(x + 1, y + 1, 14, 2);
    this.gfx.fillRect(x + 17, y + 1, 14, 2);
    this.gfx.fillRect(x + 9, y + 17, 14, 2);

    this.gfx.fillStyle(0x383838);
    this.gfx.fillRect(x, y + 15, s, 2);
    this.gfx.fillRect(x + 15, y, 2, 16);
    this.gfx.fillRect(x + 8, y + 16, 2, 16);
    this.gfx.fillRect(x + 23, y + 16, 2, 16);
  }

  private drawTallGrass(x: number, y: number, s: number): void {
    const p = this.palette;
    this.gfx.fillStyle(p.tallGrassBase);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(p.tallGrassBlade);
    this.gfx.fillRect(x + 4, y + 6, 2, 10);
    this.gfx.fillRect(x + 8, y + 4, 2, 12);
    this.gfx.fillRect(x + 6, y + 8, 2, 6);
    this.gfx.fillRect(x + 18, y + 8, 2, 10);
    this.gfx.fillRect(x + 22, y + 6, 2, 12);
    this.gfx.fillRect(x + 20, y + 10, 2, 6);
    this.gfx.fillRect(x + 12, y + 12, 2, 8);
    this.gfx.fillRect(x + 14, y + 10, 2, 10);

    this.gfx.fillStyle(p.tallGrassTip);
    this.gfx.fillRect(x + 4, y + 4, 2, 4);
    this.gfx.fillRect(x + 8, y + 2, 2, 4);
    this.gfx.fillRect(x + 18, y + 6, 2, 4);
    this.gfx.fillRect(x + 22, y + 4, 2, 4);
    this.gfx.fillRect(x + 12, y + 10, 2, 4);
    this.gfx.fillRect(x + 14, y + 8, 2, 4);
  }

  private drawPath(x: number, y: number, s: number): void {
    const p = this.palette;
    this.gfx.fillStyle(p.pathBase);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(p.pathAccent, 0.6);
    const seed = (x * 3 + y * 7) % 11;
    if (seed < 3) {
      this.gfx.fillRect(x + 5, y + 10, 3, 3);
      this.gfx.fillRect(x + 22, y + 6, 2, 2);
    }
    if (seed < 6) {
      this.gfx.fillRect(x + 12, y + 20, 3, 2);
      this.gfx.fillRect(x + 18, y + 16, 2, 3);
    }
    this.gfx.fillStyle(p.pathLight, 0.5);
    if (seed > 4) {
      this.gfx.fillRect(x + 8, y + 4, 2, 2);
      this.gfx.fillRect(x + 24, y + 24, 2, 2);
    }
  }

  private drawWater(x: number, y: number, s: number): void {
    const p = this.palette;
    this.gfx.fillStyle(p.waterBase);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(p.waterHighlight, 0.7);
    const offset = ((x + y) / TILE_SIZE) % 3;
    this.gfx.fillRect(x + 3 + offset * 4, y + 8, 8, 2);
    this.gfx.fillRect(x + 12 + offset * 2, y + 20, 10, 2);

    this.gfx.fillStyle(p.waterShimmer, 0.4);
    this.gfx.fillRect(x + 8 + offset * 3, y + 6, 4, 2);
    this.gfx.fillRect(x + 18, y + 18, 4, 2);
  }

  private drawFence(x: number, y: number, s: number): void {
    this.drawGround(x, y, s);

    this.gfx.fillStyle(0x8b6914);
    this.gfx.fillRect(x + 13, y + 4, 6, 24);

    this.gfx.fillStyle(0xa07818);
    this.gfx.fillRect(x, y + 8, s, 4);
    this.gfx.fillRect(x, y + 20, s, 4);

    this.gfx.fillStyle(0xb89030);
    this.gfx.fillRect(x, y + 8, s, 1);
    this.gfx.fillRect(x, y + 20, s, 1);
    this.gfx.fillRect(x + 12, y + 2, 8, 3);

    this.gfx.fillStyle(0x6b5010, 0.5);
    this.gfx.fillRect(x + 18, y + 5, 2, 22);
  }

  private drawHouseWall(x: number, y: number, s: number): void {
    this.gfx.fillStyle(0xd8c8a0);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(0xc0b088);
    for (let i = 0; i < s; i += 8) {
      this.gfx.fillRect(x, y + i, s, 1);
    }

    this.gfx.fillStyle(0xb8a880, 0.4);
    this.gfx.fillRect(x, y, 1, s);

    const seed = (x * 5 + y * 11) % 7;
    if (seed < 2) {
      this.gfx.fillStyle(0x68a8d0);
      this.gfx.fillRect(x + 8, y + 6, 16, 16);
      this.gfx.fillStyle(0x604020);
      this.gfx.fillRect(x + 7, y + 5, 18, 2);
      this.gfx.fillRect(x + 7, y + 21, 18, 2);
      this.gfx.fillRect(x + 7, y + 5, 2, 18);
      this.gfx.fillRect(x + 23, y + 5, 2, 18);
      this.gfx.fillRect(x + 15, y + 5, 2, 18);
      this.gfx.fillRect(x + 7, y + 13, 18, 2);
      this.gfx.fillStyle(0x90c8e8, 0.5);
      this.gfx.fillRect(x + 9, y + 7, 5, 5);
    }
  }

  private drawHouseDoor(x: number, y: number, s: number): void {
    this.gfx.fillStyle(0xd8c8a0);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(0xc0b088);
    for (let i = 0; i < s; i += 8) {
      this.gfx.fillRect(x, y + i, s, 1);
    }

    this.gfx.fillStyle(0x6b3410);
    this.gfx.fillRect(x + 6, y + 2, 20, 30);

    this.gfx.fillStyle(0x4a2008);
    this.gfx.fillRect(x + 5, y + 1, 22, 2);
    this.gfx.fillRect(x + 5, y + 1, 2, 31);
    this.gfx.fillRect(x + 25, y + 1, 2, 31);

    this.gfx.fillStyle(0x803c18);
    this.gfx.fillRect(x + 9, y + 5, 7, 10);
    this.gfx.fillRect(x + 18, y + 5, 7, 10);
    this.gfx.fillRect(x + 9, y + 18, 7, 10);
    this.gfx.fillRect(x + 18, y + 18, 7, 10);

    this.gfx.fillStyle(0xd0b040);
    this.gfx.fillRect(x + 21, y + 16, 3, 3);
  }

  private drawRoof(x: number, y: number, s: number): void {
    this.gfx.fillStyle(0xb82820);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(0xc83830);
    for (let i = 0; i < s; i += 8) {
      this.gfx.fillRect(x, y + i, s, 5);
    }

    this.gfx.fillStyle(0x982018, 0.6);
    for (let i = 7; i < s; i += 8) {
      this.gfx.fillRect(x, y + i, s, 2);
    }

    this.gfx.fillStyle(0xd84840, 0.5);
    this.gfx.fillRect(x, y, s, 2);
  }

  private drawFlowers(x: number, y: number, s: number): void {
    this.drawGround(x, y, s);

    const seed = (x * 7 + y * 3) % 5;
    const colors = [0xff6080, 0xf0e040, 0xff9050, 0xd060e0, 0x60b0ff];
    const flowerColor = colors[seed];

    this.gfx.fillStyle(flowerColor);
    this.gfx.fillRect(x + 5, y + 6, 4, 4);
    this.gfx.fillRect(x + 3, y + 8, 4, 4);
    this.gfx.fillRect(x + 7, y + 8, 4, 4);
    this.gfx.fillRect(x + 5, y + 10, 4, 4);
    this.gfx.fillStyle(0xf0e840);
    this.gfx.fillRect(x + 6, y + 9, 2, 2);
    this.gfx.fillStyle(0x408020);
    this.gfx.fillRect(x + 6, y + 14, 2, 8);

    this.gfx.fillStyle(colors[(seed + 2) % 5]);
    this.gfx.fillRect(x + 19, y + 14, 4, 4);
    this.gfx.fillRect(x + 17, y + 16, 4, 4);
    this.gfx.fillRect(x + 21, y + 16, 4, 4);
    this.gfx.fillRect(x + 19, y + 18, 4, 4);
    this.gfx.fillStyle(0xf0e840);
    this.gfx.fillRect(x + 20, y + 17, 2, 2);
    this.gfx.fillStyle(0x408020);
    this.gfx.fillRect(x + 20, y + 22, 2, 6);
  }

  private drawLedge(x: number, y: number, s: number): void {
    const p = this.palette;
    this.gfx.fillStyle(p.ledgeBase);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(p.ledgeFace);
    this.gfx.fillRect(x, y + 16, s, 16);

    this.gfx.fillStyle(p.ledgeHighlight);
    this.gfx.fillRect(x, y + 14, s, 3);

    this.gfx.fillStyle(0x305818, 0.6);
    this.gfx.fillRect(x, y + 28, s, 4);

    this.gfx.fillStyle(0x90d060, 0.6);
    this.gfx.fillRect(x + 12, y + 20, 8, 2);
    this.gfx.fillRect(x + 14, y + 22, 4, 2);
  }

  private drawLedgeJump(x: number, y: number, s: number): void {
    const p = this.palette;
    // Base: same as ledge but with a visual indicator showing you can jump down
    this.gfx.fillStyle(p.ledgeBase);
    this.gfx.fillRect(x, y, s, s);

    this.gfx.fillStyle(p.ledgeFace);
    this.gfx.fillRect(x, y + 16, s, 16);

    this.gfx.fillStyle(p.ledgeHighlight);
    this.gfx.fillRect(x, y + 14, s, 3);

    // Shadow at bottom
    this.gfx.fillStyle(0x305818, 0.6);
    this.gfx.fillRect(x, y + 28, s, 4);

    // Down-arrow indicator (shows this is jumpable)
    this.gfx.fillStyle(0xf0e840, 0.8);
    this.gfx.fillTriangle(
      x + s / 2, y + 26,
      x + s / 2 - 6, y + 20,
      x + s / 2 + 6, y + 20,
    );
    this.gfx.fillRect(x + s / 2 - 2, y + 14, 4, 7);
  }

  private drawSign(x: number, y: number, s: number): void {
    this.drawGround(x, y, s);

    this.gfx.fillStyle(0x6b5020);
    this.gfx.fillRect(x + 14, y + 16, 4, 14);

    this.gfx.fillStyle(0x8b7030);
    this.gfx.fillRect(x + 6, y + 4, 20, 14);

    this.gfx.fillStyle(0xa08840);
    this.gfx.fillRect(x + 7, y + 5, 18, 12);

    this.gfx.fillStyle(0x403018);
    this.gfx.fillRect(x + 10, y + 8, 12, 2);
    this.gfx.fillRect(x + 10, y + 12, 8, 2);
  }

  destroy(): void {
    if (this.gfx) {
      this.gfx.destroy();
    }
  }
}
