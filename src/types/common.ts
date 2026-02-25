export const TILE_SIZE = 32;
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 640;

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum TileType {
  GROUND = 0,
  WALL = 1,
  TALL_GRASS = 2,
  PATH = 3,
  WATER = 4,
  FENCE = 5,
  HOUSE_WALL = 6,
  HOUSE_DOOR = 7,
  ROOF = 8,
  FLOWERS = 9,
  LEDGE = 10,
  SIGN = 11,
  LEDGE_JUMP = 12,
}

export interface Position {
  x: number; // grid column
  y: number; // grid row
}

export enum GameState {
  BOOT = 'BOOT',
  OVERWORLD = 'OVERWORLD',
  BATTLE = 'BATTLE',
  MENU = 'MENU',
  DIALOGUE = 'DIALOGUE',
}
