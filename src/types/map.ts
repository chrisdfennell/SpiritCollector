import type { Direction, Position } from './common';
import type { TrainerData } from './trainer';

export type BiomeType = 'town' | 'forest' | 'desert' | 'tundra' | 'lake' | 'interior'
  | 'volcano' | 'swamp' | 'mountain' | 'coastal';

/** Full map definition loaded from JSON */
export interface MapData {
  id: string;
  name: string;
  cols: number;
  rows: number;
  grid: number[][];
  exits: MapExit[];
  npcs: MapNPCPlacement[];
  encounterZone: string | null;
  playerSpawn: Position;
  biomeType: BiomeType;
  isSafeZone: boolean;
}

/** An exit point on a map that leads to another map */
export interface MapExit {
  col: number;
  row: number;
  targetMap: string;
  targetCol: number;
  targetRow: number;
  direction?: Direction;
  requiredFlag?: string;
}

/** NPC placement in a map's JSON data */
export interface MapNPCPlacement {
  npcId: string;
  col: number;
  row: number;
}

/** NPC definition from npcs.json */
export interface NPCData {
  id: string;
  name: string;
  facing: Direction;
  placeholderColor: string;
  dialogue: NPCDialogueEntry[];
  trainer?: TrainerData;
}

/** A single dialogue entry — can be conditional and can trigger events */
export interface NPCDialogueEntry {
  condition?: {
    flag: string;
    value: boolean;
  };
  lines: string[];
  event?: string;
  eventData?: Record<string, unknown>;
  choices?: NPCChoice[];
}

/** A choice option within dialogue */
export interface NPCChoice {
  label: string;
  event: string;
  eventData?: Record<string, unknown>;
}

/** Encounter zone definition from encounters.json */
export interface EncounterZone {
  encounterRate: number;
  pool: EncounterEntry[];
}

export interface EncounterEntry {
  speciesId: number;
  minLevel: number;
  maxLevel: number;
  weight: number;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
