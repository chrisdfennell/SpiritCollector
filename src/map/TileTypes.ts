import { TileType } from '../types/common';

/** Which tile types block movement */
export const SOLID_TILES = new Set<TileType>([
  TileType.WALL,
  TileType.WATER,
  TileType.FENCE,
  TileType.HOUSE_WALL,
  TileType.ROOF,
  TileType.SIGN,
  TileType.LEDGE,
]);

/** Base fill colors per tile type */
export const TILE_COLORS: Record<TileType, number> = {
  [TileType.GROUND]:     0x7ec850,  // bright grass green
  [TileType.WALL]:       0x6b6b6b,  // gray stone
  [TileType.TALL_GRASS]: 0x4a9e28,  // darker vibrant green
  [TileType.PATH]:       0xc8b078,  // sandy dirt path
  [TileType.WATER]:      0x3890d8,  // blue water
  [TileType.FENCE]:      0x8b6914,  // brown wood
  [TileType.HOUSE_WALL]: 0xd8c8a0,  // cream/beige
  [TileType.HOUSE_DOOR]: 0x6b3410,  // dark brown door
  [TileType.ROOF]:       0xc03020,  // red roof
  [TileType.FLOWERS]:    0x7ec850,  // base is grass (flowers drawn on top)
  [TileType.LEDGE]:      0x5a8830,  // dark green ledge
  [TileType.SIGN]:       0x7ec850,  // base is grass (sign drawn on top)
  [TileType.LEDGE_JUMP]: 0x5a8830,  // one-way jumpable ledge (south)
  [TileType.LEDGE_JUMP_NORTH]: 0x5a8830,  // one-way jumpable ledge (north)
  [TileType.LEDGE_JUMP_WEST]: 0x5a8830,  // one-way jumpable ledge (west)
  [TileType.LEDGE_JUMP_EAST]: 0x5a8830,  // one-way jumpable ledge (east)
};
