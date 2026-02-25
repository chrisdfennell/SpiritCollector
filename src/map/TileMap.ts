import { TileType, Direction } from '../types/common';
import { SOLID_TILES } from './TileTypes';
import type { MapData } from '../types/map';

export class TileMap {
  private grid: TileType[][];
  private blockedPositions: Set<string> = new Set();
  readonly cols: number;
  readonly rows: number;

  constructor(grid: TileType[][]) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0].length;
  }

  static fromMapData(mapData: MapData): TileMap {
    const grid = mapData.grid.map(row => row.map(val => val as TileType));
    return new TileMap(grid);
  }

  getTile(col: number, row: number): TileType {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return TileType.WALL;
    }
    return this.grid[row][col];
  }

  isWalkable(col: number, row: number, direction?: Direction): boolean {
    if (this.blockedPositions.has(`${col},${row}`)) return false;
    const tile = this.getTile(col, row);
    if (tile === TileType.LEDGE_JUMP) {
      return direction === Direction.DOWN;
    }
    return !SOLID_TILES.has(tile);
  }

  isTallGrass(col: number, row: number): boolean {
    return this.getTile(col, row) === TileType.TALL_GRASS;
  }

  blockPosition(col: number, row: number): void {
    this.blockedPositions.add(`${col},${row}`);
  }

  unblockPosition(col: number, row: number): void {
    this.blockedPositions.delete(`${col},${row}`);
  }
}
