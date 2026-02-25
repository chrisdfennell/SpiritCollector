# Spirit Collectors

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Phaser 3](https://img.shields.io/badge/Phaser_3-8B36DB?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHRleHQgeD0iNCIgeT0iMTgiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIj7wn46uPC90ZXh0Pjwvc3ZnPg==&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![HTML5 Canvas](https://img.shields.io/badge/Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JSON](https://img.shields.io/badge/Data--Driven-JSON-292929?style=for-the-badge&logo=json&logoColor=white)

A Pokemon-inspired monster collecting RPG built entirely in the browser. Explore an interconnected world, battle wild creatures, collect and train your party, and challenge NPC trainers — all rendered with procedural pixel-art graphics, no sprite sheets required.

## Screenshots

> *Coming soon — the game uses procedurally generated pixel-art sprites and tile-based maps rendered on HTML5 Canvas via Phaser 3.*

## Features

- **50 unique monsters** across 10 elemental types with a full type-effectiveness chart
- **45 moves** spanning physical, special, and status categories
- **Turn-based battle system** with damage calculation, critical hits, accuracy checks, and trainer AI
- **Wild encounters** in tall grass with a catch mechanic (throw Spirit Gems!)
- **34 maps** across 8 biome types — towns, routes, caves, shops, and clinics
- **Directional ledge jumps** — one-way tiles (north/south/east/west) creating Pokemon-style route design where forward progress forces encounters but backtracking is a breeze
- **36 NPCs** with dialogue, trainer battles, shop keepers, and healers
- **Inventory & shop system** — buy potions, Spirit Gems, and stat items
- **Party & box management** — carry 6, store the rest
- **Save/load** via localStorage
- **Fully data-driven** — monsters, moves, maps, NPCs, items, and encounters are all defined in JSON

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Engine | [Phaser 3](https://phaser.io/) (WebGL / Canvas) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Bundler | [Vite](https://vitejs.dev/) |
| Rendering | Procedural pixel-art via Phaser Graphics API |
| Data | JSON files (maps, monsters, moves, items, NPCs, encounters) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

### Install & Run

```bash
git clone <repo-url>
cd PokemonClone
npm install
npm run dev
```

Open **http://localhost:8080** in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── main.ts                  # Phaser game config & entry point
├── scenes/
│   ├── BootScene.ts         # Asset loading & initialization
│   ├── OverworldScene.ts    # Tile-based overworld exploration
│   ├── BattleScene.ts       # Turn-based battle UI & flow
│   ├── BagScene.ts          # Inventory screen
│   ├── BoxScene.ts          # Monster storage management
│   └── ShopScene.ts         # Buy/sell items
├── battle/
│   ├── BattleEngine.ts      # Core battle logic & turn resolution
│   ├── BattleAnimator.ts    # Attack & damage animations
│   ├── DamageCalculator.ts  # Damage formula & type effectiveness
│   ├── CatchCalculator.ts   # Catch rate mechanics
│   └── TrainerAI.ts         # NPC battle decision-making
├── entities/
│   ├── Player.ts            # Player movement, ledge hops, input
│   ├── NPC.ts               # NPC behavior & interactions
│   ├── Actor.ts             # Shared actor base class
│   └── WildMonster.ts       # Wild encounter entity
├── map/
│   ├── MapManager.ts        # Map loading, transitions, exits
│   ├── MapRenderer.ts       # Tile rendering (all 16 tile types)
│   ├── TileMap.ts           # Grid data, walkability, collisions
│   ├── TileTypes.ts         # Tile color & property definitions
│   └── NPCManager.ts        # NPC spawning & management
├── core/
│   ├── GameStateManager.ts  # Global game state
│   ├── StateMachine.ts      # Finite state machine
│   ├── PartyManager.ts      # Party of 6 management
│   ├── InventoryManager.ts  # Item inventory
│   ├── LevelManager.ts      # EXP & leveling
│   ├── SaveManager.ts       # localStorage save/load
│   ├── FlagManager.ts       # Story/event flags
│   └── EventHandler.ts      # Event bus
├── rendering/
│   └── MonsterSpriteRenderer.ts  # Procedural monster sprites
├── ui/
│   └── DialogueBox.ts       # Text box & dialogue system
├── utils/
│   ├── TypeChart.ts         # Type matchup table
│   ├── RandomEncounter.ts   # Encounter rate & zone logic
│   └── Constants.ts         # Shared constants
├── data/
│   └── monsterSprites.ts    # Sprite generation data
└── types/
    ├── common.ts            # Shared enums (TileType, Direction, etc.)
    ├── monster.ts           # Monster type definitions
    ├── move.ts              # Move type definitions
    ├── battle.ts            # Battle type definitions
    ├── item.ts              # Item type definitions
    ├── map.ts               # Map type definitions
    └── trainer.ts           # Trainer type definitions

public/data/
├── monsters.json            # 50 monster definitions
├── moves.json               # 45 move definitions
├── items.json               # Consumables & key items
├── encounters.json          # Per-zone encounter tables
├── npcs.json                # 36 NPC definitions
└── maps/                    # 34 map files (towns, routes, caves, shops)
```

## Game Controls

| Key | Action |
|-----|--------|
| Arrow Keys | Move |
| Z | Confirm / Interact |
| X | Cancel / Back |
| Enter | Open Menu |

## Map Design Philosophy

Routes use a **Pokemon-style ledge system**: forward progress channels the player through tall grass (triggering wild encounters), while **one-way ledge jumps** provide quick shortcuts for backtracking without encounters. Four ledge directions (north, south, east, west) support any route flow pattern.

## Content Guide

Want to add new monsters, maps, NPCs, or items? See the **[Content Guide](CONTENT_GUIDE.md)** for detailed instructions on how all the JSON data files work and how to create or modify game content.

## License

This project is for educational and personal use.
