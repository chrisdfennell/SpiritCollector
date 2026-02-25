import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { TileMap } from './TileMap';
import { Player } from '../entities/Player';
import { Direction } from '../types/common';
import type { MapNPCPlacement, NPCData } from '../types/map';

export class NPCManager {
  private scene: Phaser.Scene;
  private npcs: NPC[] = [];
  private npcDB: NPCData[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.npcDB = scene.cache.json.get('npcs') as NPCData[];
  }

  spawnNPCs(placements: MapNPCPlacement[], tileMap: TileMap): NPC[] {
    this.destroyAll(tileMap);

    for (const placement of placements) {
      const npcData = this.npcDB.find(n => n.id === placement.npcId);
      if (!npcData) continue;

      const npc = new NPC(this.scene, placement.col, placement.row, npcData);
      this.npcs.push(npc);
      tileMap.blockPosition(placement.col, placement.row);
    }

    return this.npcs;
  }

  destroyAll(tileMap?: TileMap): void {
    for (const npc of this.npcs) {
      if (tileMap) {
        tileMap.unblockPosition(npc.gridPos.x, npc.gridPos.y);
      }
      npc.destroy();
    }
    this.npcs = [];
  }

  getNPCAt(col: number, row: number): NPC | undefined {
    return this.npcs.find(n => n.gridPos.x === col && n.gridPos.y === row);
  }

  getFacingNPC(player: Player): NPC | undefined {
    let targetCol = player.gridPos.x;
    let targetRow = player.gridPos.y;

    switch (player.facingDirection) {
      case Direction.UP:    targetRow--; break;
      case Direction.DOWN:  targetRow++; break;
      case Direction.LEFT:  targetCol--; break;
      case Direction.RIGHT: targetCol++; break;
    }

    return this.getNPCAt(targetCol, targetRow);
  }

  /** Check if the player at (col, row) is in any trainer NPC's vision range */
  checkTrainerVision(col: number, row: number, flags: Record<string, boolean>): NPC | null {
    for (const npc of this.npcs) {
      const trainer = npc.npcData.trainer;
      if (!trainer) continue;

      // Skip already-defeated trainers
      if (trainer.defeatFlag && flags[trainer.defeatFlag]) continue;

      const npcCol = npc.gridPos.x;
      const npcRow = npc.gridPos.y;
      const range = trainer.visionRange;

      // Check if player is in the NPC's facing direction within range
      let inVision = false;
      switch (npc.facingDirection) {
        case Direction.UP:
          inVision = col === npcCol && row < npcRow && row >= npcRow - range;
          break;
        case Direction.DOWN:
          inVision = col === npcCol && row > npcRow && row <= npcRow + range;
          break;
        case Direction.LEFT:
          inVision = row === npcRow && col < npcCol && col >= npcCol - range;
          break;
        case Direction.RIGHT:
          inVision = row === npcRow && col > npcCol && col <= npcCol + range;
          break;
      }

      if (inVision) return npc;
    }

    return null;
  }
}
