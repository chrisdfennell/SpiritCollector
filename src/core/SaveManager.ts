import { PartyManager } from './PartyManager';
import { FlagManager } from './FlagManager';
import { InventoryManager } from './InventoryManager';
import type { Position } from '../types/common';

const SAVE_KEY = 'spirit-collectors-save';
const SAVE_VERSION = 3;

interface SaveDataV3 {
  version: 3;
  party: ReturnType<PartyManager['toJSON']>;
  flags: Record<string, boolean>;
  currentMap: string;
  playerPosition: Position;
  inventory: ReturnType<InventoryManager['toJSON']>;
}

interface SaveDataV2 {
  version: 2;
  party: ReturnType<PartyManager['toJSON']>;
  flags: Record<string, boolean>;
  currentMap: string;
  playerPosition: Position;
}

interface SaveDataV1 {
  version: 1;
  party: ReturnType<PartyManager['toJSON']>;
}

type SaveData = SaveDataV1 | SaveDataV2 | SaveDataV3;

export interface LoadedSave {
  partyManager: PartyManager;
  flagManager: FlagManager;
  inventoryManager: InventoryManager;
  currentMap: string;
  playerPosition: Position;
}

export class SaveManager {
  static save(
    partyManager: PartyManager,
    flagManager: FlagManager,
    inventoryManager: InventoryManager,
    currentMap: string,
    playerPosition: Position,
  ): void {
    const data: SaveDataV3 = {
      version: SAVE_VERSION,
      party: partyManager.toJSON(),
      flags: flagManager.toJSON(),
      currentMap,
      playerPosition,
      inventory: inventoryManager.toJSON(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      console.warn('Failed to save game data');
    }
  }

  static load(): LoadedSave | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw) as SaveData;

      if (data.version === 1) {
        // Discard old v1 saves
        localStorage.removeItem(SAVE_KEY);
        return null;
      }

      if (data.version === 2) {
        // Migrate V2 → V3: empty inventory
        return {
          partyManager: PartyManager.fromJSON(data.party),
          flagManager: FlagManager.fromJSON(data.flags),
          inventoryManager: new InventoryManager(),
          currentMap: data.currentMap,
          playerPosition: data.playerPosition,
        };
      }

      if (data.version === 3) {
        return {
          partyManager: PartyManager.fromJSON(data.party),
          flagManager: FlagManager.fromJSON(data.flags),
          inventoryManager: InventoryManager.fromJSON(data.inventory),
          currentMap: data.currentMap,
          playerPosition: data.playerPosition,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
