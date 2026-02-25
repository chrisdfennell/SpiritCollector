import Phaser from 'phaser';
import { TileMap } from './TileMap';
import { MapRenderer } from './MapRenderer';
import { TILE_SIZE } from '../types/common';
import type { MapData, MapExit } from '../types/map';

export class MapManager {
  private scene: Phaser.Scene;
  private currentMapData: MapData | null = null;
  private currentTileMap: TileMap | null = null;
  private renderer: MapRenderer | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get tileMap(): TileMap {
    return this.currentTileMap!;
  }

  get mapData(): MapData {
    return this.currentMapData!;
  }

  loadMap(mapId: string): MapData {
    const data = this.scene.cache.json.get(`map_${mapId}`) as MapData;
    if (!data) throw new Error(`Map not found: ${mapId}`);

    this.currentMapData = data;
    this.currentTileMap = TileMap.fromMapData(data);
    return data;
  }

  renderMap(): void {
    if (!this.currentTileMap || !this.currentMapData) return;
    this.renderer = new MapRenderer(this.scene, this.currentTileMap, this.currentMapData.biomeType);
    this.renderer.render();
  }

  destroyCurrentMap(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    this.currentTileMap = null;
    this.currentMapData = null;
  }

  getExitAt(col: number, row: number): MapExit | undefined {
    if (!this.currentMapData) return undefined;
    return this.currentMapData.exits.find(e => e.col === col && e.row === row);
  }

  getMapPixelBounds(): { width: number; height: number } {
    if (!this.currentMapData) return { width: 800, height: 640 };
    return {
      width: this.currentMapData.cols * TILE_SIZE,
      height: this.currentMapData.rows * TILE_SIZE,
    };
  }
}
