import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { MapManager } from '../map/MapManager';
import { NPCManager } from '../map/NPCManager';
import { WildMonster } from '../entities/WildMonster';
import { DialogueBox } from '../ui/DialogueBox';
import { EventHandler } from '../core/EventHandler';
import { FlagManager } from '../core/FlagManager';
import { InventoryManager } from '../core/InventoryManager';
import { Direction, Position } from '../types/common';
import { checkEncounter, selectEncounter } from '../utils/RandomEncounter';
import { PartyManager } from '../core/PartyManager';
import { SaveManager } from '../core/SaveManager';
import type { MonsterInstance, MonsterSpecies } from '../types/monster';
import type { Move } from '../types/move';
import type { NPCData, EncounterZone, MapExit } from '../types/map';
import type { NPC } from '../entities/NPC';

interface OverworldData {
  mapId: string;
  playerPos?: Position | null;
}

export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private mapManager!: MapManager;
  private npcManager!: NPCManager;
  private dialogueBox!: DialogueBox;
  private eventHandler!: EventHandler;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private pKey!: Phaser.Input.Keyboard.Key;
  private bKey!: Phaser.Input.Keyboard.Key;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private inTransition = false;
  private currentMapId = 'home';

  constructor() {
    super({ key: 'OverworldScene' });
  }

  create(data: OverworldData): void {
    this.inTransition = false;

    // Initialize managers
    this.mapManager = new MapManager(this);
    this.npcManager = new NPCManager(this);
    this.eventHandler = new EventHandler(this);
    this.dialogueBox = new DialogueBox(this);

    // Load and render the starting map
    const mapId = data?.mapId || 'home';
    const mapData = this.mapManager.loadMap(mapId);
    this.currentMapId = mapId;
    this.mapManager.renderMap();

    // Determine spawn position
    const spawnPos = data?.playerPos || mapData.playerSpawn;
    this.player = new Player(this, spawnPos.x, spawnPos.y);

    // Spawn NPCs
    this.npcManager.spawnNPCs(mapData.npcs, this.mapManager.tileMap);

    // Setup camera
    const bounds = this.mapManager.getMapPixelBounds();
    this.cameras.main.setBounds(0, 0, bounds.width, bounds.height);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // Setup keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.pKey = this.input.keyboard!.addKey('P');
    this.bKey = this.input.keyboard!.addKey('B');
    this.actionKey = this.input.keyboard!.addKey('ENTER');

    // Hook up move complete checks
    this.player.onMoveComplete = (col: number, row: number) => {
      this.onPlayerMoveComplete(col, row);
    };

    // Resume handler
    this.events.on('resume', () => {
      this.inTransition = false;

      const pm = this.game.registry.get('partyManager') as PartyManager;

      // Mercy heal if all fainted
      if (!pm.hasAliveMonster()) {
        pm.healAll();
      }

      const flags = this.game.registry.get('flagManager') as FlagManager;
      const inventory = this.game.registry.get('inventory') as InventoryManager;
      SaveManager.save(pm, flags, inventory, this.currentMapId, this.player.gridPos);
      this.cameras.main.fadeIn(300, 0, 0, 0);
    });

    // Fade in
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  update(): void {
    if (this.inTransition) return;

    // Handle dialogue input
    if (this.dialogueBox.visible) {
      if (Phaser.Input.Keyboard.JustDown(this.actionKey) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
        this.dialogueBox.advance();
      }
      return; // Block all other input during dialogue
    }

    if (this.player.isMoving) return;

    // Action key — interact with facing NPC
    if (Phaser.Input.Keyboard.JustDown(this.actionKey) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      this.tryInteract();
      return;
    }

    // Open box/party screen
    if (Phaser.Input.Keyboard.JustDown(this.pKey)) {
      this.openBoxScene();
      return;
    }

    // Open bag
    if (Phaser.Input.Keyboard.JustDown(this.bKey)) {
      this.openBagScene();
      return;
    }

    // Movement
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.player.moveInDirection(Direction.UP, this.mapManager.tileMap);
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.player.moveInDirection(Direction.DOWN, this.mapManager.tileMap);
    } else if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.player.moveInDirection(Direction.LEFT, this.mapManager.tileMap);
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.player.moveInDirection(Direction.RIGHT, this.mapManager.tileMap);
    }
  }

  private onPlayerMoveComplete(col: number, row: number): void {
    // Check for map exit
    const exit = this.mapManager.getExitAt(col, row);
    if (exit) {
      this.handleExit(exit);
      return;
    }

    // Check for trainer vision
    if (!this.inTransition) {
      const trainerNPC = this.npcManager.checkTrainerVision(col, row, this.getFlags());
      if (trainerNPC) {
        this.startTrainerEncounter(trainerNPC);
        return;
      }
    }

    // Check for encounter — skip if map is a safe zone
    if (!this.mapManager.mapData.isSafeZone) {
      const tileType = this.mapManager.tileMap.getTile(col, row);
      const encounterZoneId = this.mapManager.mapData.encounterZone;
      if (encounterZoneId) {
        const encounterData = this.cache.json.get('encounters') as Record<string, EncounterZone>;
        const zone = encounterData[encounterZoneId] || null;
        if (checkEncounter(tileType, zone)) {
          this.startBattleTransition(zone);
        }
      }
    }
  }

  private handleExit(exit: MapExit): void {
    // Check required flag
    if (exit.requiredFlag) {
      const flags = this.game.registry.get('flagManager') as FlagManager;
      if (!flags.get(exit.requiredFlag)) {
        this.showBlockedExitDialogue();
        return;
      }
    }

    this.transitionToMap(exit);
  }

  private showBlockedExitDialogue(): void {
    const flags = this.game.registry.get('flagManager') as FlagManager;
    const npc = this.npcManager.getFacingNPC(this.player);
    if (npc) {
      const entry = npc.getDialogue(flags.toJSON());
      if (entry) {
        this.dialogueBox.show(npc.npcData.name, entry, () => {}, undefined);
        return;
      }
    }

    this.dialogueBox.show('', {
      lines: ['The way ahead is blocked. You need a spirit companion first.'],
    }, () => {}, undefined);
  }

  private transitionToMap(exit: MapExit): void {
    this.inTransition = true;

    // Save before transition
    const pm = this.game.registry.get('partyManager') as PartyManager;
    const flags = this.game.registry.get('flagManager') as FlagManager;
    const inventory = this.game.registry.get('inventory') as InventoryManager;
    SaveManager.save(pm, flags, inventory, exit.targetMap, { x: exit.targetCol, y: exit.targetRow });

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Destroy current map contents
      this.npcManager.destroyAll(this.mapManager.tileMap);
      this.player.destroy();
      this.mapManager.destroyCurrentMap();
      this.dialogueBox.destroy();

      // Load new map
      const mapData = this.mapManager.loadMap(exit.targetMap);
      this.currentMapId = exit.targetMap;
      this.mapManager.renderMap();

      // Create player at target position
      this.player = new Player(this, exit.targetCol, exit.targetRow);
      if (exit.direction) {
        this.player.facingDirection = exit.direction;
      }

      // Spawn NPCs
      this.npcManager.spawnNPCs(mapData.npcs, this.mapManager.tileMap);

      // Recreate dialogue box
      this.dialogueBox = new DialogueBox(this);

      // Update camera
      const bounds = this.mapManager.getMapPixelBounds();
      this.cameras.main.setBounds(0, 0, bounds.width, bounds.height);
      this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

      // Re-hook move complete
      this.player.onMoveComplete = (col: number, row: number) => {
        this.onPlayerMoveComplete(col, row);
      };

      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.cameras.main.once('camerafadeincomplete', () => {
        this.inTransition = false;
      });
    });
  }

  private tryInteract(): void {
    const npc = this.npcManager.getFacingNPC(this.player);
    if (!npc) return;

    const flagData = this.getFlags();
    const entry = npc.getDialogue(flagData);
    if (!entry) return;

    // If this is a trainer NPC and not yet defeated, start battle after dialogue
    const trainerData = npc.npcData.trainer;
    const isDefeated = trainerData?.defeatFlag ? flagData[trainerData.defeatFlag] === true : false;
    const shouldBattle = trainerData && !isDefeated;

    this.dialogueBox.show(
      npc.npcData.name,
      entry,
      () => {
        // onComplete: fire event or start trainer battle
        if (shouldBattle) {
          this.startTrainerBattle(npc.npcData);
        } else if (entry.event) {
          this.eventHandler.handleEvent(entry.event, entry.eventData);
        }
      },
      (choice) => {
        this.eventHandler.handleEvent(choice.event, choice.eventData);
      },
    );
  }

  // ─── Trainer encounters ───────────────────────────────────

  private startTrainerEncounter(npc: NPC): void {
    this.inTransition = true;

    const flagData = this.getFlags();
    const entry = npc.getDialogue(flagData);

    // Show "!" indicator above NPC
    const excl = this.add.text(
      npc.sprite.x, npc.sprite.y - 24, '!',
      { fontSize: '20px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold' },
    ).setOrigin(0.5);

    this.time.delayedCall(600, () => {
      excl.destroy();

      // Show dialogue then battle
      if (entry) {
        this.dialogueBox.show(
          npc.npcData.name,
          entry,
          () => {
            this.startTrainerBattle(npc.npcData);
          },
          undefined,
        );
      } else {
        this.startTrainerBattle(npc.npcData);
      }
    });
  }

  private startTrainerBattle(npcData: NPCData): void {
    const trainerData = npcData.trainer;
    if (!trainerData) return;

    this.inTransition = true;

    const pm = this.game.registry.get('partyManager') as PartyManager;
    if (!pm.hasAliveMonster()) return;

    const monsterDB = this.cache.json.get('monsters') as MonsterSpecies[];
    const moveDB = this.cache.json.get('moves') as Move[];

    // Build trainer party from spec
    const trainerParty: MonsterInstance[] = trainerData.party.map(entry =>
      WildMonster.generate(entry.speciesId, entry.level, monsterDB, moveDB),
    );

    // Build reward items array
    const reward = trainerData.reward?.items ?? [];

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.pause();
      this.scene.launch('BattleScene', {
        party: pm.party,
        trainerParty,
        trainerName: npcData.name,
        defeatFlag: trainerData.defeatFlag,
        reward,
      });
    });
  }

  // ─── Wild encounter ───────────────────────────────────────

  private startBattleTransition(zone: EncounterZone): void {
    this.inTransition = true;

    const pm = this.game.registry.get('partyManager') as PartyManager;
    if (!pm.hasAliveMonster()) return;

    const monsterDB = this.cache.json.get('monsters') as MonsterSpecies[];
    const moveDB = this.cache.json.get('moves') as Move[];

    // Zone-based encounter
    const entry = selectEncounter(zone);
    const level = entry.minLevel + Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
    const wildMonster = WildMonster.generate(entry.speciesId, level, monsterDB, moveDB);

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.pause();
      this.scene.launch('BattleScene', {
        party: pm.party,
        wildMonster,
      });
    });
  }

  // ─── Scene openers ────────────────────────────────────────

  private openBoxScene(): void {
    const pm = this.game.registry.get('partyManager') as PartyManager;
    if (pm.party.length === 0) {
      this.dialogueBox.show('', {
        lines: ['You don\'t have any spirits yet.'],
      }, () => {}, undefined);
      return;
    }
    this.inTransition = true;
    this.scene.pause();
    this.scene.launch('BoxScene');
  }

  private openBagScene(): void {
    this.inTransition = true;
    this.scene.pause();
    this.scene.launch('BagScene');
  }

  // ─── Helpers ──────────────────────────────────────────────

  private getFlags(): Record<string, boolean> {
    const flags = this.game.registry.get('flagManager') as FlagManager;
    return flags.toJSON();
  }
}
